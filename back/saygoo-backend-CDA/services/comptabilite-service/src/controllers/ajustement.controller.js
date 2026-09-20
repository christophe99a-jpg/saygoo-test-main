const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const { validerLignes } = require('../services/comptabilite.rules');

/**
 * Référence lisible : SAY-AJU-20260919-00001
 * Numérotation par séquence PostgreSQL, atomique donc sûre en concurrence.
 */
const genererReference = async (tx) => {
  const jour = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const sequence = `seq_ajustement_${jour}`;
  await tx.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS ${sequence}`);
  const [{ nextval }] = await tx.$queryRawUnsafe(`SELECT nextval('${sequence}')`);
  return `SAY-AJU-${jour}-${String(nextval).padStart(5, '0')}`;
};

/**
 * POST /comptabilite/ajustements
 * Demande d'ajustement. Sans effet comptable tant qu'elle n'est pas validée.
 */
const demanderAjustement = async (req, res) => {
  try {
    const { clientId, clientNom, compteCln, sens, montant, motif, dossierRef, factureRef } = req.body;

    if (!clientId || !sens || !montant || !motif) {
      return res.status(400).json({
        success: false,
        message: 'Client, sens, montant et motif sont obligatoires.'
      });
    }
    if (!['CREDIT', 'DEBIT'].includes(sens)) {
      return res.status(400).json({ success: false, message: 'Sens invalide.' });
    }
    if (Number(montant) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Le montant doit être positif. Le sens porte la direction.'
      });
    }

    const ajustement = await prisma.$transaction(async (tx) => {
      const reference = await genererReference(tx);
      return tx.ajustementComptable.create({
        data: {
          reference, clientId, clientNom, compteCln,
          sens, montant: Number(montant), motif,
          dossierRef, factureRef,
          demandePar: req.user?.sub || 'inconnu'
        }
      });
    });

    logger.info('Ajustement demandé', { reference: ajustement.reference });
    return res.status(201).json({ success: true, data: ajustement });
  } catch (err) {
    logger.error('Erreur demande ajustement', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

/**
 * POST /comptabilite/ajustements/:id/valider
 *
 * Génère l'écriture comptable correspondante. Le crédit du Compte Logistique
 * Numérique est ensuite à transmettre au service paiement : le champ
 * clnNotifie trace cette transmission, qui reste à câbler (lot B).
 */
const validerAjustement = async (req, res) => {
  try {
    const ajustement = await prisma.ajustementComptable.findUnique({
      where: { id: req.params.id }
    });
    if (!ajustement) {
      return res.status(404).json({ success: false, message: 'Ajustement non trouvé.' });
    }
    if (ajustement.statut !== 'DEMANDE') {
      return res.status(409).json({
        success: false,
        message: `Ajustement déjà ${ajustement.statut.toLowerCase()}.`
      });
    }

    // Séparation des pouvoirs : celui qui demande ne valide pas.
    if (ajustement.demandePar === req.user?.sub) {
      return res.status(403).json({
        success: false,
        message: 'Le demandeur ne peut pas valider son propre ajustement.'
      });
    }

    const montant = Number(ajustement.montant);
    const journal = await prisma.journal.findUnique({ where: { code: 'OD' } });
    const maintenant = new Date();
    const exercice = await prisma.exercice.findFirst({
      where: { dateDebut: { lte: maintenant }, dateFin: { gte: maintenant }, statut: 'OUVERT' }
    });

    if (!journal || !exercice) {
      return res.status(409).json({
        success: false,
        message: 'Journal OD ou exercice ouvert introuvable.'
      });
    }

    // CREDIT en faveur du client : on solde sa créance (crédit 4111)
    // par une contrepartie en produits négatifs (débit 7191, RRR accordés).
    // DEBIT à sa charge : l'inverse.
    const lignes = ajustement.sens === 'CREDIT'
      ? [
          { compteNumero: '7191', libelle: `Ajustement ${ajustement.reference}`, debit: montant, credit: 0 },
          { compteNumero: '4111', libelle: ajustement.motif, debit: 0, credit: montant, tiersCode: ajustement.clientId }
        ]
      : [
          { compteNumero: '4111', libelle: ajustement.motif, debit: montant, credit: 0, tiersCode: ajustement.clientId },
          { compteNumero: '707', libelle: `Ajustement ${ajustement.reference}`, debit: 0, credit: montant }
        ];

    const controle = validerLignes(lignes);
    if (!controle.valide) {
      return res.status(400).json({ success: false, erreurs: controle.erreurs });
    }

    const numeros = lignes.map((l) => l.compteNumero);
    const comptes = await prisma.compteComptable.findMany({ where: { numero: { in: numeros } } });
    const parNumero = new Map(comptes.map((c) => [c.numero, c]));
    const manquants = numeros.filter((n) => !parNumero.has(n));
    if (manquants.length) {
      return res.status(409).json({
        success: false,
        message: `Comptes absents du plan : ${manquants.join(', ')}. Lancez le seed.`
      });
    }

    const resultat = await prisma.$transaction(async (tx) => {
      const sequence = `seq_ecriture_od_${exercice.annee}`;
      await tx.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS ${sequence}`);
      const [{ nextval }] = await tx.$queryRawUnsafe(`SELECT nextval('${sequence}')`);

      const ecriture = await tx.ecriture.create({
        data: {
          numero: `OD-${exercice.annee}-${String(nextval).padStart(6, '0')}`,
          journalId: journal.id,
          exerciceId: exercice.id,
          dateEcriture: maintenant,
          reference: ajustement.reference,
          libelle: `Ajustement comptable — ${ajustement.motif}`,
          statut: 'VALIDEE',
          totalDebit: controle.totalDebit,
          totalCredit: controle.totalCredit,
          sourceType: 'AJUSTEMENT',
          sourceId: ajustement.id,
          dlnuRef: ajustement.dossierRef,
          valideeLe: maintenant,
          valideePar: req.user?.sub,
          creePar: req.user?.sub,
          lignes: {
            create: lignes.map((ligne, index) => ({
              compteId: parNumero.get(ligne.compteNumero).id,
              tiersCode: ligne.tiersCode || null,
              libelle: ligne.libelle,
              debit: ligne.debit,
              credit: ligne.credit,
              ordre: index
            }))
          }
        }
      });

      const maj = await tx.ajustementComptable.update({
        where: { id: ajustement.id },
        data: {
          statut: 'VALIDE',
          valideePar: req.user?.sub,
          valideeLe: maintenant,
          ecritureId: ecriture.id
        }
      });

      return { ajustement: maj, ecriture };
    });

    logger.info('Ajustement validé', {
      reference: ajustement.reference,
      ecriture: resultat.ecriture.numero
    });

    return res.json({
      success: true,
      data: resultat,
      message: 'Ajustement comptabilisé. La transmission au CLN reste à câbler.'
    });
  } catch (err) {
    logger.error('Erreur validation ajustement', { err: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

const rejeterAjustement = async (req, res) => {
  try {
    const { motifRejet } = req.body;
    if (!motifRejet) {
      return res.status(400).json({ success: false, message: 'Motif de rejet obligatoire.' });
    }
    const ajustement = await prisma.ajustementComptable.findUnique({ where: { id: req.params.id } });
    if (!ajustement) return res.status(404).json({ success: false, message: 'Ajustement non trouvé.' });
    if (ajustement.statut !== 'DEMANDE') {
      return res.status(409).json({ success: false, message: 'Ajustement déjà traité.' });
    }
    const maj = await prisma.ajustementComptable.update({
      where: { id: req.params.id },
      data: { statut: 'REJETE', motifRejet, valideePar: req.user?.sub, valideeLe: new Date() }
    });
    return res.json({ success: true, data: maj });
  } catch (err) {
    logger.error('Erreur rejet ajustement', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

const listerAjustements = async (req, res) => {
  try {
    const { statut, clientId } = req.query;
    const where = {};
    if (statut) where.statut = statut;
    if (clientId) where.clientId = clientId;
    const ajustements = await prisma.ajustementComptable.findMany({
      where, orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: ajustements });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

module.exports = { demanderAjustement, validerAjustement, rejeterAjustement, listerAjustements };
