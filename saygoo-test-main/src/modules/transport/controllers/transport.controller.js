// src/modules/transport/controllers/transport.controller.js
const transportService = require('../services/transport.service');
const response = require('../../../utils/response');
const logger = require('../../../utils/logger');

// Simulation complète
const simuler = async (req, res) => {
  try {
    const resultat = transportService.simuler(req.body);
    return response.success(res, resultat, 'Simulation de coût transport générée');
  } catch (err) {
    logger.error('Erreur simulation transport :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

// Comparaison multi-camions
const comparerCamions = async (req, res) => {
  try {
    const resultat = transportService.comparerCamions(req.body);
    return response.success(res, resultat, 'Comparaison des types de camions générée');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

// Distance entre deux villes
const obtenirDistance = async (req, res) => {
  try {
    const { depart, destination } = req.query;
    if (!depart || !destination) {
      return response.badRequest(res, 'Paramètres depart et destination requis');
    }
    const distance = transportService.obtenirDistance(depart, destination);
    return response.success(res, distance);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 404);
  }
};

// Tarifs disponibles
const obtenirTarifs = async (req, res) => {
  try {
    return response.success(res, {
      camions: transportService.TARIFS_CAMION,
      prixGasoil: 695,
      tauxAssurance: { faible: '0.5%', moyen: '1%', eleve: '2%' },
      margeService: '15%',
    });
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

module.exports = { simuler, comparerCamions, obtenirDistance, obtenirTarifs };