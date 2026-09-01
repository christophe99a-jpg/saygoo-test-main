// src/modules/stockage/services/stockage.service.js
const Stockage = require('../../../database/models/Stockage');
const MouvementStock = require('../../../database/models/MouvementStock');
const Dossier = require('../../../database/models/Dossier');
const User = require('../../../database/models/User');
const logger = require('../../../utils/logger');
const { Op } = require('sequelize');

// Tarifs de stockage par type (FCFA/jour/tonne)
const TARIFS_STOCKAGE = {
  STANDARD: 2000,
  SECURISE: 3500,
  TEMPERATURE_CONTROLEE: 6000,
  PRODUITS_SENSIBLES: 5000,
};

// Durée estimée en jours
const DUREES_JOURS = {
  MOINS_7J: 7,
  '7_30J': 30,
  '1_3M': 90,
  PLUS_3M: 120,
};

// Créer une demande de stockage
const creerDemande = async (userId, donnees) => {
  // Vérifier le pack GOLD
  const user = await User.findByPk(userId);
  if (!user) throw { statusCode: 404, message: 'Utilisateur introuvable' };
  if (!['GOLD', 'DIAMOND'].includes(user.pack)) {
    throw { statusCode: 403, message: 'Le Pack GOLD est requis pour accéder au stockage' };
  }

  // Calcul automatique des coûts
  const tarifJournalier = TARIFS_STOCKAGE[donnees.typeStockage || 'STANDARD'];
  const dureeJours = DUREES_JOURS[donnees.dureeEstimee] || 30;
  const coutStockageJournalier = Math.round(tarifJournalier * (donnees.poidsTonnes || 1));
  const coutStockageTotal = coutStockageJournalier * dureeJours;
  const coutTransfert = 25000; // Frais fixes de transfert

  const stockage = await Stockage.create({
    ...donnees,
    userId,
    coutTransfert,
    coutStockageJournalier,
    coutStockageTotal,
    stockInitial: donnees.poidsTonnes,
    stockActuel: donnees.poidsTonnes,
    seuilAlerte: donnees.seuilAlerte || donnees.poidsTonnes * 0.2,
    statut: 'EN_ATTENTE',
  });

  logger.info(`Demande stockage créée : ${stockage.reference} par utilisateur ${userId}`);
  return stockage;
};

// Valider une demande (Admin)
const validerDemande = async (stockageId, adminId) => {
  const stockage = await Stockage.findByPk(stockageId);
  if (!stockage) throw { statusCode: 404, message: 'Demande de stockage introuvable' };

  await stockage.update({
    statut: 'VALIDE',
    dateEntree: new Date(),
  });

  // Enregistrer le mouvement d'entrée
  await MouvementStock.create({
    type: 'ENTREE',
    quantite: stockage.stockInitial,
    stockAvant: 0,
    stockApres: stockage.stockInitial,
    motif: 'Entrée initiale en stock',
    stockageId,
    effectuePar: adminId,
  });

  logger.info(`Stockage ${stockage.reference} validé par admin ${adminId}`);
  return stockage;
};

// Enregistrer une sortie de stock
const enregistrerSortie = async (stockageId, userId, quantite, motif) => {
  const stockage = await Stockage.findOne({
    where: { id: stockageId, userId },
  });

  if (!stockage) throw { statusCode: 404, message: 'Stockage introuvable' };
  if (!['STOCKE', 'PARTIELLEMENT_SORTI'].includes(stockage.statut)) {
    throw { statusCode: 400, message: 'Ce stock ne peut pas faire l\'objet d\'une sortie' };
  }
  if (quantite > stockage.stockActuel) {
    throw { statusCode: 400, message: `Quantité insuffisante. Stock disponible : ${stockage.stockActuel}` };
  }

  const stockAvant = stockage.stockActuel;
  const stockApres = stockAvant - quantite;
  const estCompletementSorti = stockApres <= 0;

  await stockage.update({
    stockActuel: stockApres,
    statut: estCompletementSorti ? 'SORTI' : 'PARTIELLEMENT_SORTI',
    dateSortie: estCompletementSorti ? new Date() : null,
  });

  await MouvementStock.create({
    type: 'SORTIE',
    quantite,
    stockAvant,
    stockApres,
    motif: motif || 'Sortie de stock',
    stockageId,
    effectuePar: userId,
  });

  // Vérifier alerte stock faible
  if (stockage.alerteStockFaible && stockApres <= stockage.seuilAlerte) {
    logger.warn(`ALERTE STOCK FAIBLE : ${stockage.reference} — Stock restant : ${stockApres}`);
  }

  logger.info(`Sortie stock ${stockage.reference} : ${quantite} unités`);
  return stockage;
};

// Obtenir un stockage
const obtenirStockage = async (stockageId, userId, role) => {
  const where = { id: stockageId };
  if (role === 'OPERATEUR') where.userId = userId;

  const stockage = await Stockage.findOne({
    where,
    include: [
      { model: User, as: 'operateur', attributes: ['id', 'raisonSociale', 'email'] },
      { model: Dossier, as: 'dossier', attributes: ['id', 'reference', 'statut'] },
      { model: MouvementStock, as: 'mouvements', order: [['dateEvenement', 'DESC']] },
    ],
  });

  if (!stockage) throw { statusCode: 404, message: 'Stockage introuvable' };
  return stockage;
};

// Lister les stockages
const listerStockages = async (userId, role, filtres = {}) => {
  const where = {};
  if (role === 'OPERATEUR') where.userId = userId;
  if (filtres.statut) where.statut = filtres.statut;
  if (filtres.typeTransfert) where.typeTransfert = filtres.typeTransfert;

  return Stockage.findAll({
    where,
    include: [
      { model: User, as: 'operateur', attributes: ['id', 'raisonSociale'] },
      { model: Dossier, as: 'dossier', attributes: ['id', 'reference'] },
    ],
    order: [['createdAt', 'DESC']],
  });
};

// Historique des mouvements
const historiqueMouvements = async (stockageId, userId, role) => {
  const stockage = await Stockage.findByPk(stockageId);
  if (!stockage) throw { statusCode: 404, message: 'Stockage introuvable' };
  if (role === 'OPERATEUR' && stockage.userId !== userId) {
    throw { statusCode: 403, message: 'Accès interdit' };
  }

  return MouvementStock.findAll({
    where: { stockageId },
    include: [{ model: User, as: 'agent', attributes: ['id', 'nomRepresentant'] }],
    order: [['dateEvenement', 'DESC']],
  });
};

// Simuler le coût de stockage
const simulerCout = (donnees) => {
  const { typeStockage, dureeEstimee, poidsTonnes } = donnees;

  const tarifJournalier = TARIFS_STOCKAGE[typeStockage] || TARIFS_STOCKAGE.STANDARD;
  const dureeJours = DUREES_JOURS[dureeEstimee] || 30;
  const coutJournalier = Math.round(tarifJournalier * poidsTonnes);
  const coutTotal = coutJournalier * dureeJours;
  const coutTransfert = 25000;

  return {
    typeStockage,
    dureeJours,
    poidsTonnes,
    tarifJournalierParTonne: tarifJournalier,
    coutJournalier,
    coutStockage: coutTotal,
    coutTransfert,
    coutTotalEstime: coutTotal + coutTransfert,
  };
};

// Dashboard stock (admin)
const dashboardStock = async () => {
  const total = await Stockage.count();
  const enAttente = await Stockage.count({ where: { statut: 'EN_ATTENTE' } });
  const stockes = await Stockage.count({ where: { statut: 'STOCKE' } });
  const sorties = await Stockage.count({ where: { statut: 'SORTI' } });

  const stockages = await Stockage.findAll({
    where: { statut: { [Op.in]: ['STOCKE', 'PARTIELLEMENT_SORTI'] } },
    attributes: ['id', 'reference', 'stockActuel', 'seuilAlerte', 'alerteStockFaible'],
  });

  const alertes = stockages.filter(s => s.alerteStockFaible && s.stockActuel <= s.seuilAlerte);

  return { total, enAttente, stockes, sorties, nombreAlertes: alertes.length, alertes };
};

module.exports = {
  creerDemande,
  validerDemande,
  enregistrerSortie,
  obtenirStockage,
  listerStockages,
  historiqueMouvements,
  simulerCout,
  dashboardStock,
};