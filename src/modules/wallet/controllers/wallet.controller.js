// src/modules/wallet/controllers/wallet.controller.js
const walletService = require('../services/wallet.service');
const response = require('../../../utils/response');
const logger = require('../../../utils/logger');

const creerWallet = async (req, res) => {
  try {
    const wallet = await walletService.creerWallet(req.user.id);
    return response.created(res, wallet, 'Wallet SAYGOO créé avec succès');
  } catch (err) {
    logger.error('Erreur création wallet :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const obtenirWallet = async (req, res) => {
  try {
    const wallet = await walletService.obtenirWallet(req.user.id);
    return response.success(res, wallet);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const definirPIN = async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return response.badRequest(res, 'PIN requis');
    const resultat = await walletService.definirPIN(req.user.id, pin);
    return response.success(res, resultat);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const recharger = async (req, res) => {
  try {
    const transaction = await walletService.recharger(req.user.id, req.body);
    return response.created(res, transaction, 'Recharge effectuée avec succès');
  } catch (err) {
    logger.error('Erreur recharge wallet :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const retirer = async (req, res) => {
  try {
    const transaction = await walletService.retirer(req.user.id, req.body);
    return response.success(res, transaction, 'Retrait effectué avec succès');
  } catch (err) {
    logger.error('Erreur retrait wallet :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const virer = async (req, res) => {
  try {
    const resultat = await walletService.virer(req.user.id, req.body);
    return response.success(res, resultat, 'Virement effectué avec succès');
  } catch (err) {
    logger.error('Erreur virement wallet :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const historique = async (req, res) => {
  try {
    const transactions = await walletService.historique(req.user.id, req.query);
    return response.success(res, transactions);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const statistiques = async (req, res) => {
  try {
    const stats = await walletService.statistiques(req.user.id);
    return response.success(res, stats);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const rechercherWallet = async (req, res) => {
  try {
    const { numero } = req.query;
    if (!numero) return response.badRequest(res, 'Numéro de wallet requis');
    const wallet = await walletService.rechercherWallet(numero);
    return response.success(res, wallet);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

module.exports = {
  creerWallet,
  obtenirWallet,
  definirPIN,
  recharger,
  retirer,
  virer,
  historique,
  statistiques,
  rechercherWallet,
};