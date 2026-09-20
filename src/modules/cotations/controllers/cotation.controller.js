// src/modules/cotations/controllers/cotation.controller.js
const cotationService = require('../services/cotation.service');
const response = require('../../../utils/response');
const logger = require('../../../utils/logger');

const soumettreCotation = async (req, res) => {
  try {
    const cotation = await cotationService.soumettreCotation(
      req.user.id,
      req.params.dossierId,
      req.body
    );
    return response.created(res, cotation, 'Cotation soumise avec succès');
  } catch (err) {
    logger.error('Erreur soumission cotation :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const listerParDossier = async (req, res) => {
  try {
    const cotations = await cotationService.listerParDossier(
      req.params.dossierId,
      req.user.id,
      req.user.role
    );
    return response.success(res, cotations);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const comparerCotations = async (req, res) => {
  try {
    const analyse = await cotationService.comparerCotations(
      req.params.dossierId,
      req.user.id
    );
    return response.success(res, analyse, 'Analyse des cotations générée');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const accepterCotation = async (req, res) => {
  try {
    const cotation = await cotationService.accepterCotation(req.params.id, req.user.id);
    return response.success(res, cotation, 'Cotation acceptée avec succès');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const refuserCotation = async (req, res) => {
  try {
    const cotation = await cotationService.refuserCotation(req.params.id, req.user.id);
    return response.success(res, cotation, 'Cotation refusée');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const listerMesCotations = async (req, res) => {
  try {
    const cotations = await cotationService.listerMesCotations(req.user.id, req.query);
    return response.success(res, cotations);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

module.exports = {
  soumettreCotation,
  listerParDossier,
  comparerCotations,
  accepterCotation,
  refuserCotation,
  listerMesCotations,
};