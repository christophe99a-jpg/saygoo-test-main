// src/modules/paiement/controllers/paiement.controller.js
const paiementService = require('../services/paiement.service');
const escrowService = require('../services/escrow.service');
const response = require('../../../utils/response');
const logger = require('../../../utils/logger');

const initierPaiement = async (req, res) => {
  try {
    const paiement = await paiementService.initierPaiement(req.user.id, req.body);
    return response.created(res, paiement, 'Paiement initié avec succès');
  } catch (err) {
    logger.error('Erreur initiation paiement :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const confirmerPaiement = async (req, res) => {
  try {
    const paiement = await paiementService.confirmerPaiement(req.params.id, req.user.id);
    return response.success(res, paiement, 'Paiement confirmé avec succès');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const libererEscrow = async (req, res) => {
  try {
    const paiement = await paiementService.libererEscrow(req.params.id, req.user.id);
    return response.success(res, paiement, 'Escrow libéré — fonds transférés au CDA');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const payerFraction = async (req, res) => {
  try {
    const { numeroPaiement, operateur } = req.body;
    const paiement = await paiementService.payerFraction(
      req.params.id, req.user.id, numeroPaiement, operateur
    );
    return response.success(res, paiement, 'Fraction payée avec succès');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const listerPaiements = async (req, res) => {
  try {
    const paiements = await paiementService.listerPaiements(
      req.user.id, req.user.role, req.query
    );
    return response.success(res, paiements);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

const obtenirPaiement = async (req, res) => {
  try {
    const paiement = await paiementService.obtenirPaiement(
      req.params.id, req.user.id, req.user.role
    );
    return response.success(res, paiement);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const statsEscrow = async (req, res) => {
  try {
    const stats = await escrowService.statsEscrow();
    return response.success(res, stats);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

module.exports = {
  initierPaiement,
  confirmerPaiement,
  libererEscrow,
  payerFraction,
  listerPaiements,
  obtenirPaiement,
  statsEscrow,
};