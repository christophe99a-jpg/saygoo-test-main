// src/modules/auth/controllers/auth.controller.js
const authService = require('../services/auth.service');
const response = require('../../../utils/response');
const logger = require('../../../utils/logger');

const inscrire = async (req, res) => {
  try {
    const resultat = await authService.inscrire(req.body);
    return response.created(res, resultat, 'Compte créé avec succès. Veuillez compléter votre KYC.');
  } catch (err) {
    logger.error('Erreur inscription :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const connecter = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    const resultat = await authService.connecter(email, motDePasse);
    return response.success(res, resultat, 'Connexion réussie');
  } catch (err) {
    logger.error('Erreur connexion :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const rafraichirToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return response.badRequest(res, 'Refresh token requis');
    const tokens = await authService.rafraichirToken(refreshToken);
    return response.success(res, tokens, 'Token rafraîchi');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const deconnecter = async (req, res) => {
  try {
    await authService.deconnecter(req.user.id);
    return response.success(res, null, 'Déconnexion réussie');
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

const moi = async (req, res) => {
  try {
    return response.success(res, req.user.toPublic(), 'Profil récupéré');
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

module.exports = { inscrire, connecter, rafraichirToken, deconnecter, moi };