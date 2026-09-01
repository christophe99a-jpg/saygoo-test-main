// src/modules/marketplace/controllers/commande.controller.js
const commandeService = require('../services/commande.service');
const response = require('../../../utils/response');
const logger = require('../../../utils/logger');

const passerCommande = async (req, res) => {
  try {
    const commande = await commandeService.passerCommande(req.user.id, req.body);
    return response.created(res, commande, 'Commande passée avec succès');
  } catch (err) {
    logger.error('Erreur passage commande :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const confirmerCommande = async (req, res) => {
  try {
    const commande = await commandeService.confirmerCommande(req.params.id, req.user.id);
    return response.success(res, commande, 'Commande confirmée');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const confirmerLivraison = async (req, res) => {
  try {
    const commande = await commandeService.confirmerLivraison(req.params.id, req.user.id);
    return response.success(res, commande, 'Livraison confirmée — fonds libérés au vendeur');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const annulerCommande = async (req, res) => {
  try {
    const { motif } = req.body;
    const commande = await commandeService.annulerCommande(req.params.id, req.user.id, motif);
    return response.success(res, commande, 'Commande annulée');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const listerCommandes = async (req, res) => {
  try {
    const { type } = req.query;
    const commandes = await commandeService.listerCommandes(
      req.user.id, req.user.role, type || 'acheteur', req.query
    );
    return response.success(res, commandes);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

const statsVendeur = async (req, res) => {
  try {
    const stats = await commandeService.statsVendeur(req.user.id);
    return response.success(res, stats);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

module.exports = {
  passerCommande, confirmerCommande, confirmerLivraison,
  annulerCommande, listerCommandes, statsVendeur,
};