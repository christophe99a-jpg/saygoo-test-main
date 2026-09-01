// src/modules/tracking/controllers/tracking.controller.js
const trackingService = require('../services/tracking.service');
const response = require('../../../utils/response');
const logger = require('../../../utils/logger');

const ajouterEtape = async (req, res) => {
  try {
    const tracking = await trackingService.ajouterEtape(
      req.params.dossierId,
      req.body,
      req.user.id
    );
    return response.created(res, tracking, 'Étape de tracking ajoutée');
  } catch (err) {
    logger.error('Erreur ajout tracking :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const obtenirTracking = async (req, res) => {
  try {
    const tracking = await trackingService.obtenirTracking(
      req.params.dossierId,
      req.user.id,
      req.user.role
    );
    return response.success(res, tracking);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const obtenirPosition = async (req, res) => {
  try {
    const position = await trackingService.obtenirPosition(
      req.params.dossierId,
      req.user.id,
      req.user.role
    );
    return response.success(res, position);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const signalerIncident = async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) return response.badRequest(res, 'Description de l\'incident requise');
    const tracking = await trackingService.signalerIncident(
      req.params.dossierId,
      description,
      req.user.id
    );
    return response.created(res, tracking, 'Incident signalé');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const listerTousTrackings = async (req, res) => {
  try {
    const trackings = await trackingService.listerTousTrackings(req.query);
    return response.success(res, trackings);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

const statsTracking = async (req, res) => {
  try {
    const stats = await trackingService.statsTracking();
    return response.success(res, stats);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

module.exports = {
  ajouterEtape,
  obtenirTracking,
  obtenirPosition,
  signalerIncident,
  listerTousTrackings,
  statsTracking,
};