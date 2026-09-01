// src/modules/analytics/controllers/analytics.controller.js
const analyticsService = require('../services/analytics.serviceB');
const response = require('../../../utils/response');
const logger = require('../../../utils/logger');

const dashboardOperateur = async (req, res) => {
  try {
    const dashboard = await analyticsService.dashboardOperateur(req.user.id);
    return response.success(res, dashboard, 'Dashboard opérateur');
  } catch (err) {
    logger.error('Erreur dashboard opérateur :', err);
    return response.error(res, err.message, 500);
  }
};

const dashboardAdmin = async (req, res) => {
  try {
    const dashboard = await analyticsService.dashboardAdmin();
    return response.success(res, dashboard, 'Dashboard admin');
  } catch (err) {
    logger.error('Erreur dashboard admin :', err);
    return response.error(res, err.message, 500);
  }
};

const statsOperateur = async (req, res) => {
  try {
    const { periode } = req.query;
    const stats = await analyticsService.statsOperateur(req.user.id, periode);
    return response.success(res, stats);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

module.exports = { dashboardOperateur, dashboardAdmin, statsOperateur };