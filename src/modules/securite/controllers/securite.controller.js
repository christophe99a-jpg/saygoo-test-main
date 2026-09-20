// src/modules/securite/controllers/securite.controller.js
const securiteService = require('../services/deuxfa.service');
const response = require('../../../utils/response');
const logger = require('../../../utils/logger');

const envoyerCode = async (req, res) => {
  try {
    const { type } = req.body;
    const resultat = await securiteService.envoyerCode2FA(
      req.user.id,
      type || 'CONNEXION'
    );
    return response.success(res, resultat, 'Code 2FA envoyé');
  } catch (err) {
    logger.error('Erreur envoi 2FA :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const verifierCode = async (req, res) => {
  try {
    const { code, type } = req.body;
    if (!code) return response.badRequest(res, 'Code requis');

    const resultat = await securiteService.verifierCode2FA(
      req.user.id,
      code,
      type || 'CONNEXION'
    );
    return response.success(res, resultat);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const activer2FA = async (req, res) => {
  try {
    const resultat = await securiteService.activer2FA(req.user.id);
    return response.success(res, resultat);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const obtenirAuditTrail = async (req, res) => {
  try {
    const logs = await securiteService.obtenirAuditTrail(
      req.user.id,
      req.user.role,
      req.query
    );
    return response.success(res, logs);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

const nettoyerTokens = async (req, res) => {
  try {
    const count = await securiteService.nettoyerTokensExpires();
    return response.success(res, { supprimés: count }, 'Nettoyage effectué');
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

module.exports = { envoyerCode, verifierCode, activer2FA, obtenirAuditTrail, nettoyerTokens };