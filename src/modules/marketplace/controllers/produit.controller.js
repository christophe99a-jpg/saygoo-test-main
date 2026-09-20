// src/modules/marketplace/controllers/produit.controller.js
const produitService = require('../services/produit.service');
const response = require('../../../utils/response');
const logger = require('../../../utils/logger');

const publierProduit = async (req, res) => {
  try {
    const produit = await produitService.publierProduit(req.user.id, req.body);
    return response.created(res, produit, 'Produit soumis pour validation');
  } catch (err) {
    logger.error('Erreur publication produit :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const validerProduit = async (req, res) => {
  try {
    const produit = await produitService.validerProduit(req.params.id, req.user.id);
    return response.success(res, produit, 'Produit validé et publié');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const listerProduits = async (req, res) => {
  try {
    const produits = await produitService.listerProduits(req.query);
    return response.success(res, produits);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

const obtenirProduit = async (req, res) => {
  try {
    const produit = await produitService.obtenirProduit(req.params.id);
    return response.success(res, produit);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const mesProduits = async (req, res) => {
  try {
    const produits = await produitService.mesProduits(req.user.id, req.query);
    return response.success(res, produits);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

const matchingAcheteurs = async (req, res) => {
  try {
    const matching = await produitService.matchingAcheteurs(req.params.id);
    return response.success(res, matching);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const modifierProduit = async (req, res) => {
  try {
    const produit = await produitService.modifierProduit(req.params.id, req.user.id, req.body);
    return response.success(res, produit, 'Produit modifié');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const archiverProduit = async (req, res) => {
  try {
    const produit = await produitService.archiverProduit(req.params.id, req.user.id);
    return response.success(res, produit, 'Produit archivé');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

module.exports = {
  publierProduit, validerProduit, listerProduits,
  obtenirProduit, mesProduits, matchingAcheteurs,
  modifierProduit, archiverProduit,
};