const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const {
  validerLignes,
  verifierExercice,
  inverserLignes,
  arrondir
} = require('../services/comptabilite.rules');

/**
 * Trouve l'exercice couvrant une date.
 */
const exercicePourDate = async (date) => {
  const d = new Date(date);
  return prisma.exercice.findFirst({
    where: { dateDebut: { lte: d }, dateFin: { gte: d } }
  });
};

/**
 * Attribue le numéro séquentiel d'une écriture : VE-2026-000001.
 *
 * Utilise une séquence PostgreSQL par journal et par exercice. Un
 * count()+1 produirait des doublons dès que deux écritures sont validées
 * simultanément : la séquence est atomique, elle ne peut pas rendre
 * deux fois la même valeur.
 */
const attribuerNumero = async (tx, codeJournal, annee) => {
  const sequence = `seq_ecriture_${codeJournal.toLowerCase()}_${annee}`;
  await tx.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS ${sequence}`);
  const [{ nextval }] = await tx.$queryRawUnsafe(`SELECT nextval('${sequence}')`);
  return `${codeJournal}-${annee}-${String(nextval).padStart(6, '0')}`;
};

/**
 * Résout les numéros de compte en identifiants, en une requête.
 */
const resoudreComptes = async (lignes) => {
  const numeros = [...new Set(lignes.map((l) => l.compteNumero))];
  const comptes = await prisma.compteComptable.findMany({
    where: { numero: { in: numeros } }
  });

  const parNumero = new Map(comptes.map((c) => [c.numero, c]));
  const inconnus = numeros.filter((n) => !parNumero.has(n));
  const inactifs = comptes.filter((c) => !c.actif).map((c) => c.numero);

  return { parNumero, inconnus, inactifs };
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /comptabilite/ecritures
 * Crée une écriture en brouillon. Rien n'est comptabilisé avant validation.
 */
const creerEcriture = async (req, res) => {
  try {
    const {
      journalCode, dateEcriture, datePiece, reference, libelle,
      lignes, sourceType, sourceId, dlnuRef
    } = req.body;

    if (!journalCode || !dateEcriture || !libelle) {
      return res.status(400).json({
        success: false,
        message: 'Journal, date et libellé sont obligatoires.'
      });
    }

    const controle = validerLignes(lignes);
    if (!controle.valide) {
      return res.status(400).json({
        success: false,
        message: 'Écriture non conforme.',
        erreurs: controle.erreurs
      });
    }

    const journal = await prisma.journal.findUnique({ where: { code: journalCode } });
    if (!journal || !journal.actif) {
      return res.status(400).json({ success: false, message: 'Journal inconnu ou inactif.' });
    }

    const exercice = await exercicePourDate(dateEcriture);
    const controleExercice = verifierExercice(dateEcriture, exercice);
    if (!controleExercice.valide) {
      return res.status(400).json({ success: false, message: controleExercice.erreur });
    }

    const { parNumero, inconnus, inactifs } = await resoudreComptes(lignes);
    if (inconnus.length) {
      return res.status(400).json({
        success: false,
        message: `Comptes inconnus : ${inconnus.join(', ')}.`
      });
    }
    if (inactifs.length) {
      return res.status(400).json({
        success: false,
        message: `Comptes désactivés : ${inactifs.join(', ')}.`
      });
    }

    const ecriture = await prisma.ecriture.create({
      data: {
        journalId: journal.id,
        exerciceId: exercice.id,
        dateEcriture: new Date(dateEcriture),
        datePiece: datePiece ? new Date(datePiece) : null,
        reference,
        libelle,
        totalDebit: controle.totalDebit,
        totalCredit: controle.totalCredit,
        sourceType,
        sourceId,
        dlnuRef,
        creePar: req.user?.sub,
        lignes: {
          create: lignes.map((ligne, index) => ({
            compteId: parNumero.get(ligne.compteNumero).id,
            tiersCode: ligne.tiersCode || null,
            libelle: ligne.libelle || libelle,
            debit: arrondir(ligne.debit || 0),
            credit: arrondir(ligne.credit || 0),
            ordre: index
          }))
        }
      },
      include: { lignes: { include: { compte: true } }, journal: true }
    });

    logger.info('Écriture créée en brouillon', { id: ecriture.id, journal: journalCode });

    return res.status(201).json({ success: true, data: ecriture });
  } catch (err) {
    logger.error('Erreur création écriture', { err: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

/**
 * POST /comptabilite/ecritures/:id/valider
 * Comptabilise l'écriture. Elle devient immuable.
 */
const validerEcriture = async (req, res) => {
  try {
    const { id } = req.params;

    const ecriture = await prisma.ecriture.findUnique({
      where: { id },
      include: { lignes: true, journal: true, exercice: true }
    });

    if (!ecriture) {
      return res.status(404).json({ success: false, message: 'Écriture non trouvée.' });
    }
    if (ecriture.statut !== 'BROUILLON') {
      return res.status(409).json({
        success: false,
        message: `Écriture déjà ${ecriture.statut.toLowerCase()}.`
      });
    }
    if (ecriture.exercice.statut === 'CLOTURE') {
      return res.status(409).json({
        success: false,
        message: `L'exercice ${ecriture.exercice.annee} est clôturé.`
      });
    }

    // Recontrôle de l'équilibre : les lignes ont pu changer depuis la création.
    const controle = validerLignes(
      ecriture.lignes.map((l) => ({
        compteNumero: 'x',
        debit: Number(l.debit),
        credit: Number(l.credit)
      }))
    );
    if (!controle.valide) {
      return res.status(400).json({
        success: false,
        message: 'Écriture déséquilibrée, validation refusée.',
        erreurs: controle.erreurs
      });
    }

    const validee = await prisma.$transaction(async (tx) => {
      const numero = await attribuerNumero(
        tx,
        ecriture.journal.code,
        ecriture.exercice.annee
      );

      return tx.ecriture.update({
        where: { id },
        data: {
          numero,
          statut: 'VALIDEE',
          valideeLe: new Date(),
          valideePar: req.user?.sub,
          totalDebit: controle.totalDebit,
          totalCredit: controle.totalCredit
        },
        include: { lignes: { include: { compte: true } }, journal: true }
      });
    });

    logger.info('Écriture validée', { numero: validee.numero });

    return res.json({ success: true, data: validee });
  } catch (err) {
    logger.error('Erreur validation écriture', { err: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

/**
 * POST /comptabilite/ecritures/:id/extourner
 *
 * SYSCOHADA interdit de supprimer une écriture comptabilisée : la correction
 * passe par une écriture inverse. Les deux restent visibles au journal.
 */
const extournerEcriture = async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;

    if (!motif) {
      return res.status(400).json({ success: false, message: 'Le motif est obligatoire.' });
    }

    const origine = await prisma.ecriture.findUnique({
      where: { id },
      include: { lignes: { include: { compte: true } }, journal: true, exercice: true }
    });

    if (!origine) {
      return res.status(404).json({ success: false, message: 'Écriture non trouvée.' });
    }
    if (origine.statut !== 'VALIDEE') {
      return res.status(409).json({
        success: false,
        message: 'Seule une écriture validée s\'extourne. Un brouillon se supprime.'
      });
    }
    if (origine.extourneePar) {
      return res.status(409).json({ success: false, message: 'Écriture déjà extournée.' });
    }
    if (origine.exercice.statut === 'CLOTURE') {
      return res.status(409).json({
        success: false,
        message: 'Exercice clôturé : extourne impossible sur l\'exercice d\'origine.'
      });
    }

    const lignesInverses = inverserLignes(
      origine.lignes.map((l) => ({
        compteNumero: l.compte.numero,
        tiersCode: l.tiersCode,
        libelle: l.libelle,
        debit: Number(l.debit),
        credit: Number(l.credit),
        ordre: l.ordre
      }))
    );

    const { parNumero } = await resoudreComptes(lignesInverses);
    const controle = validerLignes(lignesInverses);

    const extourne = await prisma.$transaction(async (tx) => {
      const numero = await attribuerNumero(tx, origine.journal.code, origine.exercice.annee);

      const nouvelle = await tx.ecriture.create({
        data: {
          numero,
          journalId: origine.journalId,
          exerciceId: origine.exerciceId,
          dateEcriture: new Date(),
          reference: origine.reference,
          libelle: `Extourne ${origine.numero} — ${motif}`,
          statut: 'VALIDEE',
          totalDebit: controle.totalDebit,
          totalCredit: controle.totalCredit,
          sourceType: 'EXTOURNE',
          sourceId: origine.id,
          dlnuRef: origine.dlnuRef,
          extourneDeId: origine.id,
          valideeLe: new Date(),
          valideePar: req.user?.sub,
          creePar: req.user?.sub,
          lignes: {
            create: lignesInverses.map((ligne, index) => ({
              compteId: parNumero.get(ligne.compteNumero).id,
              tiersCode: ligne.tiersCode || null,
              libelle: ligne.libelle,
              debit: ligne.debit,
              credit: ligne.credit,
              ordre: index
            }))
          }
        },
        include: { lignes: { include: { compte: true } } }
      });

      await tx.ecriture.update({
        where: { id: origine.id },
        data: { statut: 'EXTOURNEE' }
      });

      return nouvelle;
    });

    logger.info('Écriture extournée', { origine: origine.numero, extourne: extourne.numero });

    return res.status(201).json({ success: true, data: extourne });
  } catch (err) {
    logger.error('Erreur extourne', { err: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

/**
 * DELETE /comptabilite/ecritures/:id
 * Ne supprime que les brouillons.
 */
const supprimerEcriture = async (req, res) => {
  try {
    const ecriture = await prisma.ecriture.findUnique({ where: { id: req.params.id } });

    if (!ecriture) {
      return res.status(404).json({ success: false, message: 'Écriture non trouvée.' });
    }
    if (ecriture.statut !== 'BROUILLON') {
      return res.status(409).json({
        success: false,
        message: 'Une écriture comptabilisée ne se supprime pas. Utilisez l\'extourne.'
      });
    }

    await prisma.ecriture.delete({ where: { id: req.params.id } });

    return res.json({ success: true, message: 'Brouillon supprimé.' });
  } catch (err) {
    logger.error('Erreur suppression écriture', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

/**
 * GET /comptabilite/ecritures
 */
const listerEcritures = async (req, res) => {
  try {
    const { journal, statut, du, au, reference, dlnuRef, page = 1, taille = 50 } = req.query;

    const where = {};
    if (statut) where.statut = statut;
    if (reference) where.reference = { contains: reference, mode: 'insensitive' };
    if (dlnuRef) where.dlnuRef = dlnuRef;
    if (journal) where.journal = { code: journal };
    if (du || au) {
      where.dateEcriture = {};
      if (du) where.dateEcriture.gte = new Date(du);
      if (au) where.dateEcriture.lte = new Date(au);
    }

    const prendre = Math.min(Number(taille), 200);
    const sauter = (Number(page) - 1) * prendre;

    const [ecritures, total] = await Promise.all([
      prisma.ecriture.findMany({
        where,
        include: { journal: true, lignes: { include: { compte: true } } },
        orderBy: [{ dateEcriture: 'desc' }, { createdAt: 'desc' }],
        skip: sauter,
        take: prendre
      }),
      prisma.ecriture.count({ where })
    ]);

    return res.json({
      success: true,
      data: ecritures,
      pagination: { page: Number(page), taille: prendre, total }
    });
  } catch (err) {
    logger.error('Erreur liste écritures', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

/**
 * GET /comptabilite/ecritures/:id
 */
const getEcriture = async (req, res) => {
  try {
    const ecriture = await prisma.ecriture.findUnique({
      where: { id: req.params.id },
      include: {
        journal: true,
        exercice: true,
        lignes: { include: { compte: true }, orderBy: { ordre: 'asc' } },
        extourneDe: { select: { id: true, numero: true, libelle: true } },
        extourneePar: { select: { id: true, numero: true, libelle: true } }
      }
    });

    if (!ecriture) {
      return res.status(404).json({ success: false, message: 'Écriture non trouvée.' });
    }

    return res.json({ success: true, data: ecriture });
  } catch (err) {
    logger.error('Erreur lecture écriture', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

module.exports = {
  creerEcriture,
  validerEcriture,
  extournerEcriture,
  supprimerEcriture,
  listerEcritures,
  getEcriture
};
