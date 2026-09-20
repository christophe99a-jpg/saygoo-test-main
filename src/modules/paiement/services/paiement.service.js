// src/modules/paiement/services/paiement.service.js
const Paiement = require('../../../database/models/Paiement');
const Cotation = require('../../../database/models/Cotation');
const Dossier = require('../../../database/models/Dossier');
const User = require('../../../database/models/User');
const paygate = require('../../../integrations/mobilemoney/paygate');
const logger = require('../../../utils/logger');
const { Op } = require('sequelize');

// Initier un paiement
const initierPaiement = async (userId, donnees) => {
  const { cotationId, dossierId, modePaiement, numeroPaiement,
          operateurMobile, typePaiement, nombreFractions } = donnees;

  const cotation = await Cotation.findOne({
    where: { id: cotationId, statut: 'ACCEPTE' },
    include: [{ model: Dossier, as: 'dossier' }],
  });

  if (!cotation) throw { statusCode: 404, message: 'Cotation acceptée introuvable' };
  if (cotation.dossier.userId !== userId) throw { statusCode: 403, message: 'Accès interdit' };

  const paiementExistant = await Paiement.findOne({
    where: {
      dossierId,
      statut: { [Op.in]: ['EN_ATTENTE', 'EN_COURS', 'PAYE', 'ESCROW'] },
    },
  });
  if (paiementExistant) {
    throw { statusCode: 409, message: 'Un paiement est déjà en cours pour ce dossier' };
  }

  const montantTotal = Number(cotation.montantTTC);
  let montantPremierePasse = montantTotal;

  if (typePaiement === 'FRACTIONNE' && nombreFractions > 1) {
    montantPremierePasse = Math.round(montantTotal / nombreFractions);
  } else if (typePaiement === 'ACOMPTE') {
    montantPremierePasse = Math.round(montantTotal * 0.5);
  }

  const paiement = await Paiement.create({
    montantTotal,
    montantPaye: 0,
    modePaiement,
    numeroPaiement,
    operateurMobile,
    typePaiement,
    nombreFractions: nombreFractions || 1,
    fractionActuelle: 1,
    statut: 'EN_COURS',
    escrowActif: true,
    userId,
    cotationId,
    dossierId,
    dateExpiration: new Date(Date.now() + 30 * 60 * 1000),
  });

  if (modePaiement === 'MOBILE_MONEY') {
    try {
      const reponse = await paygate.initierPaiement({
        montant: montantPremierePasse,
        telephone: numeroPaiement,
        operateur: operateurMobile,
        reference: paiement.reference,
        description: `Paiement dossier ${cotation.dossier.reference}`,
      });

      await paiement.update({
        transactionId: reponse.transactionId,
        reponseOperateur: JSON.stringify(reponse),
      });

      logger.info(`Paiement ${paiement.reference} initié — TXN: ${reponse.transactionId}`);
    } catch (err) {
      await paiement.update({ statut: 'ECHEC' });
      throw err;
    }
  }

  return paiement;
};

// Confirmer un paiement
const confirmerPaiement = async (paiementId, userId) => {
  const paiement = await Paiement.findOne({
    where: { id: paiementId, userId },
    include: [{ model: Dossier, as: 'dossier' }],
  });

  if (!paiement) throw { statusCode: 404, message: 'Paiement introuvable' };
  if (paiement.statut === 'PAYE') throw { statusCode: 400, message: 'Paiement déjà confirmé' };

  let statutConfirme = 'PAYE';
  if (paiement.transactionId) {
    const reponse = await paygate.verifierStatut(paiement.transactionId);
    statutConfirme = reponse.statut === 'PAYE' ? 'PAYE' : 'ECHEC';
  }

  if (statutConfirme === 'ECHEC') {
    await paiement.update({ statut: 'ECHEC' });
    throw { statusCode: 400, message: 'Paiement non confirmé par l\'opérateur' };
  }

  const montantPaye = Number(paiement.montantTotal);
  const nouveauStatut = paiement.escrowActif ? 'ESCROW' : 'PAYE';

  await paiement.update({
    statut: nouveauStatut,
    montantPaye,
    montantRestant: 0,
    datePaiement: new Date(),
  });

  await paiement.dossier.update({ coutFinal: paiement.montantTotal });

  logger.info(`Paiement ${paiement.reference} confirmé → ${nouveauStatut}`);
  return paiement;
};

// Libérer l'escrow
const libererEscrow = async (paiementId, userId) => {
  const paiement = await Paiement.findOne({
    where: { id: paiementId, userId, statut: 'ESCROW' },
  });

  if (!paiement) throw { statusCode: 404, message: 'Paiement en escrow introuvable' };

  await paiement.update({
    statut: 'LIBERE',
    escrowActif: false,
    dateEscrowLibere: new Date(),
  });

  logger.info(`Escrow libéré pour paiement ${paiement.reference}`);
  return paiement;
};

// Payer une fraction
const payerFraction = async (paiementId, userId, numeroPaiement, operateurMobile) => {
  const paiement = await Paiement.findOne({
    where: { id: paiementId, userId, typePaiement: 'FRACTIONNE' },
    include: [{ model: Dossier, as: 'dossier' }],
  });

  if (!paiement) throw { statusCode: 404, message: 'Paiement fractionné introuvable' };
  if (paiement.statut === 'PAYE') throw { statusCode: 400, message: 'Paiement déjà complet' };

  const montantFraction = Math.round(Number(paiement.montantTotal) / paiement.nombreFractions);
  const nouvelleFraction = paiement.fractionActuelle + 1;

  const reponse = await paygate.initierPaiement({
    montant: montantFraction,
    telephone: numeroPaiement,
    operateur: operateurMobile,
    reference: `${paiement.reference}-F${nouvelleFraction}`,
    description: `Fraction ${nouvelleFraction}/${paiement.nombreFractions}`,
  });

  const nouveauMontantPaye = Number(paiement.montantPaye) + montantFraction;
  const estComplet = nouvelleFraction >= paiement.nombreFractions;

  await paiement.update({
    montantPaye: nouveauMontantPaye,
    montantRestant: Number(paiement.montantTotal) - nouveauMontantPaye,
    fractionActuelle: nouvelleFraction,
    statut: estComplet ? 'ESCROW' : 'PARTIELLEMENT_PAYE',
    transactionId: reponse.transactionId,
  });

  logger.info(`Fraction ${nouvelleFraction}/${paiement.nombreFractions} payée`);
  return paiement;
};

// Lister les paiements
const listerPaiements = async (userId, role, filtres = {}) => {
  const where = {};
  if (role === 'OPERATEUR') where.userId = userId;
  if (filtres.statut) where.statut = filtres.statut;
  if (filtres.dossierId) where.dossierId = filtres.dossierId;

  return Paiement.findAll({
    where,
    include: [
      { model: Dossier, as: 'dossier', attributes: ['id', 'reference', 'typeOperation'] },
      { model: Cotation, as: 'cotation', attributes: ['id', 'reference', 'montantTTC'] },
    ],
    order: [['createdAt', 'DESC']],
  });
};

// Détail d'un paiement
const obtenirPaiement = async (paiementId, userId, role) => {
  const where = { id: paiementId };
  if (role === 'OPERATEUR') where.userId = userId;

  const paiement = await Paiement.findOne({
    where,
    include: [
      { model: Dossier, as: 'dossier' },
      { model: Cotation, as: 'cotation' },
      { model: User, as: 'payeur', attributes: ['id', 'raisonSociale', 'email'] },
    ],
  });

  if (!paiement) throw { statusCode: 404, message: 'Paiement introuvable' };
  return paiement;
};

module.exports = {
  initierPaiement,
  confirmerPaiement,
  libererEscrow,
  payerFraction,
  listerPaiements,
  obtenirPaiement,
};