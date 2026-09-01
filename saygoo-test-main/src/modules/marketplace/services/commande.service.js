// src/modules/marketplace/services/commande.service.js
const Commande = require('../../../database/models/Commande');
const Produit = require('../../../database/models/Produit');
const User = require('../../../database/models/User');
const logger = require('../../../utils/logger');
const { Op } = require('sequelize');

// Passer une commande
const passerCommande = async (acheteurId, donnees) => {
  const { produitId, quantite, adresseLivraison, villeLivraison,
          telephoneLivraison, modeLivraison, notes } = donnees;

  const produit = await Produit.findByPk(produitId);
  if (!produit) throw { statusCode: 404, message: 'Produit introuvable' };
  if (produit.statut !== 'PUBLIE') throw { statusCode: 400, message: 'Produit non disponible' };
  if (produit.userId === acheteurId) throw { statusCode: 400, message: 'Vous ne pouvez pas acheter votre propre produit' };
  if (quantite > produit.quantiteDisponible) {
    throw { statusCode: 400, message: `Quantité insuffisante. Disponible : ${produit.quantiteDisponible}` };
  }

  // Calcul du prix selon le type de vente
  let prixUnitaire = Number(produit.prixUnitaire);
  if (produit.prixGros && quantite >= produit.quantiteMinGros) {
    prixUnitaire = Number(produit.prixGros);
  }
  if (produit.promotion && produit.tauxPromotion) {
    prixUnitaire = Math.round(prixUnitaire * (1 - produit.tauxPromotion / 100));
  }

  const montantTotal = Math.round(prixUnitaire * quantite);

  const commande = await Commande.create({
    quantite,
    prixUnitaire,
    montantTotal,
    adresseLivraison,
    villeLivraison,
    telephoneLivraison,
    modeLivraison: modeLivraison || 'LIVRAISON_DOMICILE',
    notes,
    acheteurId,
    produitId,
    vendeurId: produit.userId,
    statut: 'EN_ATTENTE',
    paiementEscrow: true,
  });

  // Réserver la quantité
  await produit.decrement('quantiteDisponible', { by: quantite });
  await produit.increment('nombreCommandes');

  // Marquer comme épuisé si nécessaire
  if (produit.quantiteDisponible - quantite <= 0) {
    await produit.update({ statut: 'EPUISE' });
  }

  logger.info(`Commande ${commande.reference} passée par acheteur ${acheteurId}`);
  return commande;
};

// Confirmer une commande (vendeur)
const confirmerCommande = async (commandeId, vendeurId) => {
  const commande = await Commande.findOne({
    where: { id: commandeId, vendeurId, statut: 'EN_ATTENTE' },
  });
  if (!commande) throw { statusCode: 404, message: 'Commande introuvable' };

  await commande.update({
    statut: 'CONFIRME',
    dateConfirmation: new Date(),
  });

  logger.info(`Commande ${commande.reference} confirmée par vendeur ${vendeurId}`);
  return commande;
};

// Marquer comme livré (acheteur confirme réception)
const confirmerLivraison = async (commandeId, acheteurId) => {
  const commande = await Commande.findOne({
    where: { id: commandeId, acheteurId, statut: 'EXPEDIE' },
  });
  if (!commande) throw { statusCode: 404, message: 'Commande introuvable ou non expédiée' };

  await commande.update({
    statut: 'LIVRE',
    statutPaiement: 'LIBERE',
    dateLivraison: new Date(),
  });

  logger.info(`Livraison confirmée pour commande ${commande.reference}`);
  return commande;
};

// Annuler une commande
const annulerCommande = async (commandeId, userId, motif) => {
  const commande = await Commande.findOne({
    where: {
      id: commandeId,
      [Op.or]: [{ acheteurId: userId }, { vendeurId: userId }],
      statut: { [Op.in]: ['EN_ATTENTE', 'CONFIRME'] },
    },
  });
  if (!commande) throw { statusCode: 404, message: 'Commande introuvable ou non annulable' };

  // Remettre la quantité en stock
  await Produit.increment('quantiteDisponible', {
    by: commande.quantite,
    where: { id: commande.produitId },
  });

  await commande.update({
    statut: 'ANNULE',
    statutPaiement: 'REMBOURSE',
    motifAnnulation: motif,
  });

  logger.info(`Commande ${commande.reference} annulée`);
  return commande;
};

// Lister les commandes
const listerCommandes = async (userId, role, type = 'acheteur', filtres = {}) => {
  const where = {};

  if (role === 'OPERATEUR') {
    where[type === 'vendeur' ? 'vendeurId' : 'acheteurId'] = userId;
  }

  if (filtres.statut) where.statut = filtres.statut;

  return Commande.findAll({
    where,
    include: [
      { model: Produit, as: 'produit', attributes: ['id', 'nom', 'reference', 'photos'] },
      { model: User, as: 'acheteur', attributes: ['id', 'raisonSociale', 'telephone'] },
      { model: User, as: 'vendeur', attributes: ['id', 'raisonSociale', 'telephone'] },
    ],
    order: [['createdAt', 'DESC']],
  });
};

// Stats marketplace vendeur
const statsVendeur = async (userId) => {
  const totalCommandes = await Commande.count({ where: { vendeurId: userId } });
  const commandesLivrees = await Commande.count({ where: { vendeurId: userId, statut: 'LIVRE' } });
  const chiffreAffaires = await Commande.sum('montantVendeur', {
    where: { vendeurId: userId, statut: 'LIVRE' },
  });
  const commissionsSaygoo = await Commande.sum('commissionSaygoo', {
    where: { vendeurId: userId, statut: 'LIVRE' },
  });

  return {
    totalCommandes,
    commandesLivrees,
    tauxConversion: totalCommandes > 0
      ? Math.round((commandesLivrees / totalCommandes) * 100)
      : 0,
    chiffreAffaires: chiffreAffaires || 0,
    commissionsSaygoo: commissionsSaygoo || 0,
  };
};

module.exports = {
  passerCommande,
  confirmerCommande,
  confirmerLivraison,
  annulerCommande,
  listerCommandes,
  statsVendeur,
};