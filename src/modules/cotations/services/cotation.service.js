// src/modules/cotations/services/cotation.service.js
const Cotation = require('../../../database/models/Cotation');
const Dossier = require('../../../database/models/Dossier');
const User = require('../../../database/models/User');
const logger = require('../../../utils/logger');
const { Op } = require('sequelize');

// CDA soumet une cotation pour un dossier
const soumettreCotation = async (cdaId, dossierId, donnees) => {
  const dossier = await Dossier.findByPk(dossierId);
  if (!dossier) throw { statusCode: 404, message: 'Dossier introuvable' };

  if (!['SOUMIS', 'VALIDATION_ADMIN', 'VALIDATION_TECHNIQUE',
        'VALIDATION_FINANCIERE', 'VALIDATION_LOGISTIQUE', 'VALIDE'].includes(dossier.statut)) {
    throw { statusCode: 400, message: 'Ce dossier ne peut pas recevoir de cotations pour le moment' };
  }

  // Vérifier si le CDA a déjà soumis une cotation pour ce dossier
  const existante = await Cotation.findOne({ where: { dossierId, cdaId, statut: { [Op.ne]: 'REFUSE' } } });
  if (existante) {
    throw { statusCode: 409, message: 'Vous avez déjà soumis une cotation pour ce dossier' };
  }

  // Calcul automatique du montant TTC
  const tva = donnees.tva || 18;
  const montantTTC = Math.round(donnees.montantHT * (1 + tva / 100));

  const cotation = await Cotation.create({
    ...donnees,
    montantTTC,
    dossierId,
    cdaId,
    statut: 'EN_ATTENTE',
  });

  logger.info(`Cotation ${cotation.reference} soumise par CDA ${cdaId} pour dossier ${dossierId}`);
  return cotation;
};

// Lister les cotations d'un dossier (vue opérateur)
const listerParDossier = async (dossierId, userId, role) => {
  const dossier = await Dossier.findByPk(dossierId);
  if (!dossier) throw { statusCode: 404, message: 'Dossier introuvable' };

  // Vérifier que l'opérateur est bien propriétaire du dossier
  if (role === 'OPERATEUR' && dossier.userId !== userId) {
    throw { statusCode: 403, message: 'Accès interdit' };
  }

  const cotations = await Cotation.findAll({
    where: { dossierId },
    include: [{
      model: User,
      as: 'cda',
      attributes: ['id', 'raisonSociale', 'email', 'telephone'],
    }],
    order: [['montantTTC', 'ASC']],
  });

  // Marquer les cotations EN_ATTENTE comme VU
  await Cotation.update(
    { statut: 'VU' },
    { where: { dossierId, statut: 'EN_ATTENTE' } }
  );

  return cotations;
};

// Comparer les cotations (analyse automatique)
const comparerCotations = async (dossierId, userId) => {
  const dossier = await Dossier.findByPk(dossierId);
  if (!dossier) throw { statusCode: 404, message: 'Dossier introuvable' };
  if (dossier.userId !== userId) throw { statusCode: 403, message: 'Accès interdit' };

  const cotations = await Cotation.findAll({
    where: { dossierId, statut: { [Op.in]: ['EN_ATTENTE', 'VU'] } },
    include: [{ model: User, as: 'cda', attributes: ['id', 'raisonSociale'] }],
  });

  if (cotations.length === 0) {
    throw { statusCode: 404, message: 'Aucune cotation disponible pour ce dossier' };
  }

  // Calcul du score pour chaque cotation (prix 60% + délai 40%)
  const montantMin = Math.min(...cotations.map(c => Number(c.montantTTC)));
  const montantMax = Math.max(...cotations.map(c => Number(c.montantTTC)));
  const delaiMin = Math.min(...cotations.map(c => c.delaiTraitement));
  const delaiMax = Math.max(...cotations.map(c => c.delaiTraitement));

  const cotationsAnalysees = cotations.map(c => {
    const scorePrix = montantMax === montantMin ? 100
      : ((montantMax - Number(c.montantTTC)) / (montantMax - montantMin)) * 100;

    const scoreDelai = delaiMax === delaiMin ? 100
      : ((delaiMax - c.delaiTraitement) / (delaiMax - delaiMin)) * 100;

    const scoreTotal = Math.round(scorePrix * 0.6 + scoreDelai * 0.4);

    return {
      ...c.toJSON(),
      analyse: {
        scorePrix: Math.round(scorePrix),
        scoreDelai: Math.round(scoreDelai),
        scoreTotal,
        recommande: false,
      },
    };
  });

  // Marquer la meilleure offre
  const meilleurScore = Math.max(...cotationsAnalysees.map(c => c.analyse.scoreTotal));
  cotationsAnalysees.forEach(c => {
    if (c.analyse.scoreTotal === meilleurScore) c.analyse.recommande = true;
  });

  // Trier par score décroissant
  cotationsAnalysees.sort((a, b) => b.analyse.scoreTotal - a.analyse.scoreTotal);

  return { nombreOffres: cotations.length, cotations: cotationsAnalysees };
};

// Opérateur accepte une cotation
const accepterCotation = async (cotationId, userId) => {
  const cotation = await Cotation.findByPk(cotationId, {
    include: [{ model: Dossier, as: 'dossier' }],
  });

  if (!cotation) throw { statusCode: 404, message: 'Cotation introuvable' };
  if (cotation.dossier.userId !== userId) throw { statusCode: 403, message: 'Accès interdit' };
  if (!['EN_ATTENTE', 'VU'].includes(cotation.statut)) {
    throw { statusCode: 400, message: 'Cette cotation ne peut plus être acceptée' };
  }

  // Refuser toutes les autres cotations du même dossier
  await Cotation.update(
    { statut: 'REFUSE' },
    { where: { dossierId: cotation.dossierId, id: { [Op.ne]: cotationId } } }
  );

  // Accepter celle-ci
  await cotation.update({ statut: 'ACCEPTE', dateAcceptation: new Date() });

  // Mettre à jour le coût estimé du dossier
  await cotation.dossier.update({ coutEstime: cotation.montantTTC });

  logger.info(`Cotation ${cotation.reference} acceptée par opérateur ${userId}`);
  return cotation;
};

// Refuser une cotation
const refuserCotation = async (cotationId, userId) => {
  const cotation = await Cotation.findByPk(cotationId, {
    include: [{ model: Dossier, as: 'dossier' }],
  });

  if (!cotation) throw { statusCode: 404, message: 'Cotation introuvable' };
  if (cotation.dossier.userId !== userId) throw { statusCode: 403, message: 'Accès interdit' };

  await cotation.update({ statut: 'REFUSE' });
  logger.info(`Cotation ${cotation.reference} refusée par opérateur ${userId}`);
  return cotation;
};

// Lister les cotations soumises par un CDA
const listerMesCotations = async (cdaId, filtres = {}) => {
  const where = { cdaId };
  if (filtres.statut) where.statut = filtres.statut;

  return Cotation.findAll({
    where,
    include: [{
      model: Dossier,
      as: 'dossier',
      attributes: ['id', 'reference', 'typeOperation', 'descriptionMarchandises', 'statut'],
    }],
    order: [['createdAt', 'DESC']],
  });
};

module.exports = {
  soumettreCotation,
  listerParDossier,
  comparerCotations,
  accepterCotation,
  refuserCotation,
  listerMesCotations,
};