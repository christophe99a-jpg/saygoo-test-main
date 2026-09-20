// src/modules/tracking/services/tracking.service.js
const Tracking = require('../../../database/models/Tracking');
const Dossier = require('../../../database/models/Dossier');
const User = require('../../../database/models/User');
const logger = require('../../../utils/logger');

// Ordre logique des étapes
const ORDRE_ETAPES = [
  'DOSSIER_SOUMIS',
  'DOSSIER_VALIDE',
  'EN_ATTENTE_DEDOUANEMENT',
  'DEDOUANEMENT_EN_COURS',
  'DOCUMENTS_CONTROLES',
  'DROITS_PAYES',
  'MARCHANDISE_LIBEREE',
  'SORTIE_PORT',
  'EN_TRANSIT',
  'EN_LIVRAISON',
  'LIVRE',
];

// Descriptions automatiques par étape
const DESCRIPTIONS_ETAPES = {
  DOSSIER_SOUMIS: 'Le dossier a été soumis et est en attente de traitement.',
  DOSSIER_VALIDE: 'Le dossier a été validé par l\'équipe SAYGOO.',
  EN_ATTENTE_DEDOUANEMENT: 'La marchandise est en attente de dédouanement au port.',
  DEDOUANEMENT_EN_COURS: 'Le processus de dédouanement est en cours.',
  DOCUMENTS_CONTROLES: 'Les documents ont été vérifiés et sont conformes.',
  DROITS_PAYES: 'Les droits et taxes douaniers ont été réglés.',
  MARCHANDISE_LIBEREE: 'La marchandise a été officiellement libérée par les douanes.',
  SORTIE_PORT: 'La marchandise a quitté le port.',
  EN_TRANSIT: 'La marchandise est en cours de transport vers la destination.',
  EN_LIVRAISON: 'Le livreur est en route pour la livraison finale.',
  LIVRE: 'La marchandise a été livrée avec succès.',
  INCIDENT: 'Un incident a été signalé sur cette expédition.',
};

// Ajouter une étape de tracking
const ajouterEtape = async (dossierId, donnees, agentId) => {
  const dossier = await Dossier.findByPk(dossierId);
  if (!dossier) throw { statusCode: 404, message: 'Dossier introuvable' };

  const tracking = await Tracking.create({
    dossierId,
    etape: donnees.etape,
    description: donnees.description || DESCRIPTIONS_ETAPES[donnees.etape],
    lieu: donnees.lieu,
    latitude: donnees.latitude,
    longitude: donnees.longitude,
    statut: donnees.statut || 'COMPLETE',
    responsable: donnees.responsable,
    etaSuivante: donnees.etaSuivante,
    notes: donnees.notes,
    dateEvenement: donnees.dateEvenement || new Date(),
    creePar: agentId,
  });

  // Mettre à jour le statut du dossier si nécessaire
  const mappingStatut = {
    DOSSIER_VALIDE: 'VALIDE',
    MARCHANDISE_LIBEREE: 'DEDOUANE',
    LIVRE: 'LIVRE',
  };

  if (mappingStatut[donnees.etape]) {
    await dossier.update({ statut: mappingStatut[donnees.etape] });
  }

  logger.info(`Tracking ajouté : ${donnees.etape} pour dossier ${dossierId}`);
  return tracking;
};

// Obtenir le tracking complet d'un dossier
const obtenirTracking = async (dossierId, userId, role) => {
  const dossier = await Dossier.findByPk(dossierId);
  if (!dossier) throw { statusCode: 404, message: 'Dossier introuvable' };

  if (role === 'OPERATEUR' && dossier.userId !== userId) {
    throw { statusCode: 403, message: 'Accès interdit' };
  }

  const trackings = await Tracking.findAll({
    where: { dossierId },
    include: [{
      model: User,
      as: 'agent',
      attributes: ['id', 'nomRepresentant', 'prenomRepresentant', 'role'],
    }],
    order: [['dateEvenement', 'ASC']],
  });

  // Calculer la progression
  const derniereEtape = trackings.length > 0
    ? trackings[trackings.length - 1].etape
    : null;

  const indexActuel = derniereEtape ? ORDRE_ETAPES.indexOf(derniereEtape) : -1;
  const progression = derniereEtape === 'LIVRE'
    ? 100
    : Math.round(((indexActuel + 1) / ORDRE_ETAPES.length) * 100);

  // Prochaine étape attendue
  const prochaineEtape = indexActuel < ORDRE_ETAPES.length - 1
    ? ORDRE_ETAPES[indexActuel + 1]
    : null;

  return {
    dossier: {
      id: dossier.id,
      reference: dossier.reference,
      statut: dossier.statut,
      typeOperation: dossier.typeOperation,
      portDestination: dossier.portDestination,
    },
    progression,
    etapeActuelle: derniereEtape,
    prochaineEtape,
    nombreEtapes: trackings.length,
    historique: trackings,
  };
};

// Obtenir la position actuelle (dernière étape avec coordonnées GPS)
const obtenirPosition = async (dossierId, userId, role) => {
  const dossier = await Dossier.findByPk(dossierId);
  if (!dossier) throw { statusCode: 404, message: 'Dossier introuvable' };

  if (role === 'OPERATEUR' && dossier.userId !== userId) {
    throw { statusCode: 403, message: 'Accès interdit' };
  }

  const dernierTracking = await Tracking.findOne({
    where: { dossierId },
    order: [['dateEvenement', 'DESC']],
  });

  if (!dernierTracking) {
    throw { statusCode: 404, message: 'Aucune position disponible pour ce dossier' };
  }

  return {
    etape: dernierTracking.etape,
    lieu: dernierTracking.lieu,
    latitude: dernierTracking.latitude,
    longitude: dernierTracking.longitude,
    dateEvenement: dernierTracking.dateEvenement,
    etaSuivante: dernierTracking.etaSuivante,
  };
};

// Signaler un incident
const signalerIncident = async (dossierId, description, agentId) => {
  const dossier = await Dossier.findByPk(dossierId);
  if (!dossier) throw { statusCode: 404, message: 'Dossier introuvable' };

  const tracking = await Tracking.create({
    dossierId,
    etape: 'INCIDENT',
    description,
    statut: 'INCIDENT',
    dateEvenement: new Date(),
    creePar: agentId,
  });

  logger.warn(`Incident signalé sur dossier ${dossierId} : ${description}`);
  return tracking;
};

// Lister tous les trackings (admin/CDA)
const listerTousTrackings = async (filtres = {}) => {
  const where = {};
  if (filtres.etape) where.etape = filtres.etape;
  if (filtres.statut) where.statut = filtres.statut;

  return Tracking.findAll({
    where,
    include: [{
      model: Dossier,
      as: 'dossier',
      attributes: ['id', 'reference', 'typeOperation', 'portDestination'],
    }],
    order: [['dateEvenement', 'DESC']],
    limit: filtres.limit || 50,
  });
};

// Statistiques tracking (dashboard)
const statsTracking = async () => {
  const { sequelize } = require('../../config/database');
  const { QueryTypes } = require('sequelize');

  const stats = await sequelize.query(`
    SELECT etape, COUNT(*) as nombre
    FROM trackings
    GROUP BY etape
    ORDER BY nombre DESC
  `, { type: QueryTypes.SELECT });

  const total = await Tracking.count();
  const incidents = await Tracking.count({ where: { etape: 'INCIDENT' } });

  return { total, incidents, parEtape: stats };
};

module.exports = {
  ajouterEtape,
  obtenirTracking,
  obtenirPosition,
  signalerIncident,
  listerTousTrackings,
  statsTracking,
};