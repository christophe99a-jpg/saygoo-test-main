const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const { calculerSolde, arrondir, repartirParAnciennete } = require('../services/comptabilite.rules');

/**
 * Seules les écritures validées entrent dans les états.
 * Les brouillons ne sont pas comptabilisés ; les extournées le restent,
 * avec leur écriture inverse, comme l'exige la piste d'audit.
 */
const ECRITURES_COMPTABILISEES = { in: ['VALIDEE', 'EXTOURNEE'] };

const bornesDates = (du, au) => {
  const filtre = {};
  if (du) filtre.gte = new Date(du);
  if (au) filtre.lte = new Date(au);
  return Object.keys(filtre).length ? filtre : undefined;
};

/**
 * GET /comptabilite/grand-livre/:numero
 *
 * Mouvements d'un compte, dans l'ordre chronologique, avec solde progressif.
 */
const grandLivre = async (req, res) => {
  try {
    const { numero } = req.params;
    const { du, au, tiersCode } = req.query;

    const compte = await prisma.compteComptable.findUnique({ where: { numero } });
    if (!compte) {
      return res.status(404).json({ success: false, message: 'Compte inconnu.' });
    }

    const where = {
      compteId: compte.id,
      ecriture: { statut: ECRITURES_COMPTABILISEES }
    };
    if (tiersCode) where.tiersCode = tiersCode;

    const dates = bornesDates(du, au);
    if (dates) where.ecriture.dateEcriture = dates;

    const lignes = await prisma.ligneEcriture.findMany({
      where,
      include: {
        ecriture: {
          select: {
            id: true, numero: true, dateEcriture: true, reference: true,
            libelle: true, statut: true, journal: { select: { code: true } }
          }
        }
      },
      orderBy: [{ ecriture: { dateEcriture: 'asc' } }, { ordre: 'asc' }]
    });

    // Solde progressif ligne à ligne
    let cumul = 0;
    const mouvements = lignes.map((ligne) => {
      cumul = arrondir(cumul + Number(ligne.debit) - Number(ligne.credit));
      return {
        date: ligne.ecriture.dateEcriture,
        journal: ligne.ecriture.journal.code,
        numero: ligne.ecriture.numero,
        reference: ligne.ecriture.reference,
        libelle: ligne.libelle,
        tiersCode: ligne.tiersCode,
        debit: Number(ligne.debit),
        credit: Number(ligne.credit),
        solde: cumul
      };
    });

    return res.json({
      success: true,
      data: {
        compte: { numero: compte.numero, intitule: compte.intitule, classe: compte.classe },
        periode: { du: du || null, au: au || null },
        mouvements,
        ...calculerSolde(mouvements)
      }
    });
  } catch (err) {
    logger.error('Erreur grand livre', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

/**
 * GET /comptabilite/balance
 *
 * Balance générale : un ligne par compte mouvementé, avec totaux et soldes.
 * Le total des débits doit égaler le total des crédits — c'est le contrôle
 * de cohérence de l'ensemble de la comptabilité.
 */
const balance = async (req, res) => {
  try {
    const { du, au, classe } = req.query;

    const whereEcriture = { statut: ECRITURES_COMPTABILISEES };
    const dates = bornesDates(du, au);
    if (dates) whereEcriture.dateEcriture = dates;

    const groupes = await prisma.ligneEcriture.groupBy({
      by: ['compteId'],
      where: { ecriture: whereEcriture },
      _sum: { debit: true, credit: true }
    });

    const comptes = await prisma.compteComptable.findMany({
      where: {
        id: { in: groupes.map((g) => g.compteId) },
        ...(classe ? { classe } : {})
      },
      orderBy: { numero: 'asc' }
    });

    const parId = new Map(groupes.map((g) => [g.compteId, g._sum]));

    let totalDebit = 0;
    let totalCredit = 0;
    let totalSoldeDebiteur = 0;
    let totalSoldeCrediteur = 0;

    const lignes = comptes.map((compte) => {
      const sommes = parId.get(compte.id);
      const debit = arrondir(Number(sommes?.debit || 0));
      const credit = arrondir(Number(sommes?.credit || 0));
      const solde = arrondir(debit - credit);

      totalDebit = arrondir(totalDebit + debit);
      totalCredit = arrondir(totalCredit + credit);
      if (solde > 0) totalSoldeDebiteur = arrondir(totalSoldeDebiteur + solde);
      else totalSoldeCrediteur = arrondir(totalSoldeCrediteur - solde);

      return {
        numero: compte.numero,
        intitule: compte.intitule,
        classe: compte.classe,
        totalDebit: debit,
        totalCredit: credit,
        soldeDebiteur: solde > 0 ? solde : 0,
        soldeCrediteur: solde < 0 ? arrondir(-solde) : 0
      };
    });

    return res.json({
      success: true,
      data: {
        periode: { du: du || null, au: au || null },
        lignes,
        totaux: {
          totalDebit,
          totalCredit,
          totalSoldeDebiteur,
          totalSoldeCrediteur,
          // Doit toujours valoir true. Sinon, une écriture déséquilibrée
          // est passée à travers les contrôles : à investiguer immédiatement.
          equilibree: totalDebit === totalCredit
        }
      }
    });
  } catch (err) {
    logger.error('Erreur balance', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

/**
 * GET /comptabilite/balance-agee
 *
 * Créances clients par tranche d'ancienneté, pour le recouvrement.
 * Repose sur les comptes collectifs de la classe 4 et leurs tiers auxiliaires.
 */
const balanceAgee = async (req, res) => {
  try {
    const { comptes = '4111,4112,416', delaiPaiement = 30 } = req.query;
    const numeros = String(comptes).split(',').map((n) => n.trim());

    const comptesClients = await prisma.compteComptable.findMany({
      where: { numero: { in: numeros } }
    });

    if (!comptesClients.length) {
      return res.status(400).json({ success: false, message: 'Aucun compte client reconnu.' });
    }

    const lignes = await prisma.ligneEcriture.findMany({
      where: {
        compteId: { in: comptesClients.map((c) => c.id) },
        ecriture: { statut: ECRITURES_COMPTABILISEES }
      },
      include: { ecriture: { select: { dateEcriture: true, reference: true } } }
    });

    // Regroupement par tiers
    const parTiers = new Map();
    lignes.forEach((ligne) => {
      const cle = ligne.tiersCode || 'SANS_TIERS';
      if (!parTiers.has(cle)) parTiers.set(cle, []);
      parTiers.get(cle).push(ligne);
    });

    const jours = Number(delaiPaiement);
    const maintenant = new Date();

    const clients = [...parTiers.entries()].map(([tiersCode, mouvements]) => {
      const solde = calculerSolde(mouvements);

      // Une créance est constituée des débits non encore lettrés.
      // Approximation retenue : chaque débit porte une échéance calculée
      // depuis sa date d'écriture plus le délai de paiement accordé.
      const creances = mouvements
        .filter((m) => Number(m.debit) > 0)
        .map((m) => ({
          montant: Number(m.debit),
          dateEcheance: new Date(
            new Date(m.ecriture.dateEcriture).getTime() + jours * 86400000
          )
        }));

      return {
        tiersCode,
        soldeDebiteur: solde.soldeDebiteur,
        soldeCrediteur: solde.soldeCrediteur,
        tranches: repartirParAnciennete(creances, maintenant)
      };
    })
      .filter((c) => c.soldeDebiteur > 0)
      .sort((a, b) => b.soldeDebiteur - a.soldeDebiteur);

    const cumul = clients.reduce(
      (acc, c) => {
        Object.keys(acc).forEach((cle) => {
          acc[cle] = arrondir(acc[cle] + c.tranches[cle]);
        });
        return acc;
      },
      { aEchoir: 0, jours1a30: 0, jours31a60: 0, jours61a90: 0, plus90: 0, total: 0 }
    );

    return res.json({
      success: true,
      data: { delaiPaiement: jours, clients, cumul }
    });
  } catch (err) {
    logger.error('Erreur balance âgée', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

/**
 * GET /comptabilite/journal/:code
 * Journal sur une période, présentation réglementaire.
 */
const journalPeriode = async (req, res) => {
  try {
    const { code } = req.params;
    const { du, au } = req.query;

    const journal = await prisma.journal.findUnique({ where: { code } });
    if (!journal) {
      return res.status(404).json({ success: false, message: 'Journal inconnu.' });
    }

    const where = { journalId: journal.id, statut: ECRITURES_COMPTABILISEES };
    const dates = bornesDates(du, au);
    if (dates) where.dateEcriture = dates;

    const ecritures = await prisma.ecriture.findMany({
      where,
      include: { lignes: { include: { compte: true }, orderBy: { ordre: 'asc' } } },
      orderBy: { dateEcriture: 'asc' }
    });

    const totalDebit = arrondir(
      ecritures.reduce((s, e) => s + Number(e.totalDebit), 0)
    );
    const totalCredit = arrondir(
      ecritures.reduce((s, e) => s + Number(e.totalCredit), 0)
    );

    return res.json({
      success: true,
      data: {
        journal: { code: journal.code, libelle: journal.libelle },
        periode: { du: du || null, au: au || null },
        ecritures,
        totaux: { totalDebit, totalCredit, nombre: ecritures.length }
      }
    });
  } catch (err) {
    logger.error('Erreur journal', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

/**
 * GET /comptabilite/export/ecritures
 *
 * Export CSV pour reprise dans un logiciel comptable.
 * Séparateur point-virgule et BOM UTF-8 : c'est ce qu'attend Excel en
 * configuration francophone, sans quoi les accents s'affichent mal.
 */
const exporterEcritures = async (req, res) => {
  try {
    const { du, au, journal } = req.query;

    const where = { statut: ECRITURES_COMPTABILISEES };
    const dates = bornesDates(du, au);
    if (dates) where.dateEcriture = dates;
    if (journal) where.journal = { code: journal };

    const ecritures = await prisma.ecriture.findMany({
      where,
      include: {
        journal: true,
        lignes: { include: { compte: true }, orderBy: { ordre: 'asc' } }
      },
      orderBy: { dateEcriture: 'asc' }
    });

    const echapper = (valeur) => {
      const texte = String(valeur ?? '');
      return /[;"\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
    };

    const entete = [
      'Journal', 'Numero', 'Date', 'Piece', 'Reference',
      'Compte', 'Intitule', 'Tiers', 'Libelle', 'Debit', 'Credit'
    ];

    const lignes = [entete.join(';')];

    ecritures.forEach((ecriture) => {
      ecriture.lignes.forEach((ligne) => {
        lignes.push([
          ecriture.journal.code,
          ecriture.numero,
          ecriture.dateEcriture.toISOString().slice(0, 10),
          ecriture.datePiece ? ecriture.datePiece.toISOString().slice(0, 10) : '',
          ecriture.reference,
          ligne.compte.numero,
          ligne.compte.intitule,
          ligne.tiersCode,
          ligne.libelle,
          Number(ligne.debit).toFixed(2),
          Number(ligne.credit).toFixed(2)
        ].map(echapper).join(';'));
      });
    });

    const csv = '\uFEFF' + lignes.join('\r\n');
    const nom = `ecritures_${du || 'debut'}_${au || 'fin'}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
    return res.send(csv);
  } catch (err) {
    logger.error('Erreur export', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

module.exports = {
  grandLivre,
  balance,
  balanceAgee,
  journalPeriode,
  exporterEcritures
};
