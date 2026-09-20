// src/modules/stockage/controllers/stockage.controller.js
const stockageService = require('../services/stockage.service');
const response = require('../../../utils/response');
const logger = require('../../../utils/logger');

const creerDemande = async (req, res) => {
  try {
    const stockage = await stockageService.creerDemande(req.user.id, req.body);
    return response.created(res, stockage, 'Demande de stockage créée avec succès');
  } catch (err) {
    logger.error('Erreur création stockage :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const validerDemande = async (req, res) => {
  try {
    const stockage = await stockageService.validerDemande(req.params.id, req.user.id);
    return response.success(res, stockage, 'Demande de stockage validée');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const enregistrerSortie = async (req, res) => {
  try {
    const { quantite, motif } = req.body;
    if (!quantite || quantite <= 0) {
      return response.badRequest(res, 'Quantité invalide');
    }
    const stockage = await stockageService.enregistrerSortie(
      req.params.id, req.user.id, quantite, motif
    );
    return response.success(res, stockage, 'Sortie de stock enregistrée');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const obtenirStockage = async (req, res) => {
  try {
    const stockage = await stockageService.obtenirStockage(
      req.params.id, req.user.id, req.user.role
    );
    return response.success(res, stockage);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const listerStockages = async (req, res) => {
  try {
    const stockages = await stockageService.listerStockages(
      req.user.id, req.user.role, req.query
    );
    return response.success(res, stockages);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

const historiqueMouvements = async (req, res) => {
  try {
    const mouvements = await stockageService.historiqueMouvements(
      req.params.id, req.user.id, req.user.role
    );
    return response.success(res, mouvements);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const simulerCout = async (req, res) => {
  try {
    const simulation = stockageService.simulerCout(req.body);
    return response.success(res, simulation, 'Simulation de coût générée');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const dashboardStock = async (req, res) => {
  try {
    const dashboard = await stockageService.dashboardStock();
    return response.success(res, dashboard);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

module.exports = {
  creerDemande,
  validerDemande,
  enregistrerSortie,
  obtenirStockage,
  listerStockages,
  historiqueMouvements,
  simulerCout,
  dashboardStock,
};