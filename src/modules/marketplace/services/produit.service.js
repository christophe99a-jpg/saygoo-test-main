// src/modules/marketplace/services/produit.service.js
const Produit = require('../../../database/models/Produit');
const User = require('../../../database/models/User');
const logger = require('../../../utils/logger');
const { Op } = require('sequelize');

// Publier un produit
const publierProduit = async (userId, donnees) => {
  const user = await User.findByPk(userId);
  if (!user) throw { statusCode: 404, message: 'Utilisateur introuvable' };
  if (!['DIAMOND'].includes(user.pack)) {
    throw { statusCode: 403, message: 'Le Pack DIAMOND est requis pour vendre sur la Marketplace' };
  }

  const produit = await Produit.create({
    ...donnees,
    userId,
    statut: 'EN_ATTENTE_VALIDATION',
  });

  logger.info(`Produit ${produit.reference} publié par ${userId}`);
  return produit;
};

// Valider un produit (Admin)
const validerProduit = async (produitId, adminId) => {
  const produit = await Produit.findByPk(produitId);
  if (!produit) throw { statusCode: 404, message: 'Produit introuvable' };

  await produit.update({ statut: 'PUBLIE' });
  logger.info(`Produit ${produit.reference} validé par admin ${adminId}`);
  return produit;
};

// Lister les produits (marketplace publique)
const listerProduits = async (filtres = {}) => {
  const where = { statut: 'PUBLIE' };

  if (filtres.categorie) where.categorie = filtres.categorie;
  if (filtres.typeVente) where.typeVente = filtres.typeVente;
  if (filtres.localisation) where.localisation = filtres.localisation;
  if (filtres.venteUrgente) where.venteUrgente = true;
  if (filtres.modeEncheres) where.modeEncheres = true;

  if (filtres.prixMin || filtres.prixMax) {
    where.prixUnitaire = {};
    if (filtres.prixMin) where.prixUnitaire[Op.gte] = filtres.prixMin;
    if (filtres.prixMax) where.prixUnitaire[Op.lte] = filtres.prixMax;
  }

  if (filtres.recherche) {
    where[Op.or] = [
      { nom: { [Op.iLike]: `%${filtres.recherche}%` } },
      { description: { [Op.iLike]: `%${filtres.recherche}%` } },
    ];
  }

  const produits = await Produit.findAll({
    where,
    include: [{
      model: User,
      as: 'vendeur',
      attributes: ['id', 'raisonSociale', 'noteMoyenne'],
    }],
    order: [
      ['venteUrgente', 'DESC'],
      ['nombreVues', 'DESC'],
      ['createdAt', 'DESC'],
    ],
    limit: parseInt(filtres.limit) || 20,
    offset: parseInt(filtres.offset) || 0,
  });

  return produits;
};

// Obtenir un produit
const obtenirProduit = async (produitId) => {
  const produit = await Produit.findByPk(produitId, {
    include: [{
      model: User,
      as: 'vendeur',
      attributes: ['id', 'raisonSociale', 'telephone', 'email'],
    }],
  });

  if (!produit) throw { statusCode: 404, message: 'Produit introuvable' };

  // Incrémenter les vues
  await produit.increment('nombreVues');
  return produit;
};

// Mes produits (vendeur)
const mesProduits = async (userId, filtres = {}) => {
  const where = { userId };
  if (filtres.statut) where.statut = filtres.statut;

  return Produit.findAll({
    where,
    order: [['createdAt', 'DESC']],
  });
};

// Matching intelligent (recommandations)
const matchingAcheteurs = async (produitId) => {
  const produit = await Produit.findByPk(produitId);
  if (!produit) throw { statusCode: 404, message: 'Produit introuvable' };

  // Trouver acheteurs potentiels selon la catégorie et le type d'activité
  const acheteursPotentiels = await User.findAll({
    where: {
      statutKYC: 'VALIDE',
      isActive: true,
      id: { [Op.ne]: produit.userId },
    },
    attributes: ['id', 'raisonSociale', 'email', 'telephone', 'typeActivite'],
    limit: 10,
  });

  return {
    produit: { id: produit.id, nom: produit.nom, categorie: produit.categorie },
    acheteursPotentiels,
    nombreMatches: acheteursPotentiels.length,
  };
};

// Modifier un produit
const modifierProduit = async (produitId, userId, donnees) => {
  const produit = await Produit.findOne({ where: { id: produitId, userId } });
  if (!produit) throw { statusCode: 404, message: 'Produit introuvable' };

  await produit.update({ ...donnees, statut: 'EN_ATTENTE_VALIDATION' });
  return produit;
};

// Archiver un produit
const archiverProduit = async (produitId, userId) => {
  const produit = await Produit.findOne({ where: { id: produitId, userId } });
  if (!produit) throw { statusCode: 404, message: 'Produit introuvable' };

  await produit.update({ statut: 'ARCHIVE' });
  return produit;
};

module.exports = {
  publierProduit,
  validerProduit,
  listerProduits,
  obtenirProduit,
  mesProduits,
  matchingAcheteurs,
  modifierProduit,
  archiverProduit,
};