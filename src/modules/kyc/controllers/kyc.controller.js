// src/modules/kyc/controllers/kyc.controller.js
const kycService = require('../services/kyc.service');
const response = require('../../../utils/response');
const logger = require('../../../utils/logger');

const uploaderDocuments = async (req, res) => {
  try {
    const resultat = await kycService.uploaderDocuments(req.user.id, req.files);
    return response.success(res, resultat, 'Documents KYC reçus avec succès');
  } catch (err) {
    logger.error('Erreur upload KYC :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const obtenirStatutKYC = async (req, res) => {
  try {
    const statut = await kycService.obtenirStatutKYC(req.user.id);
    return response.success(res, statut);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

// Admin seulement
const validerKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const { valide, motifRejet } = req.body;
    const resultat = await kycService.validerKYC(userId, valide, motifRejet);
    return response.success(res, resultat);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

// Admin seulement
const listerKYCEnAttente = async (req, res) => {
  try {
    const liste = await kycService.listerKYCEnAttente();
    return response.success(res, liste);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

module.exports = { uploaderDocuments, obtenirStatutKYC, validerKYC, listerKYCEnAttente };