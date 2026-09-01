// src/modules/paiement/routes/paiement.routes.js
const express = require('express');
const router = express.Router();
const paiementController = require('../controllers/paiement.controller');
const { authentifier, kycValide, autoriser } = require('../../../middlewares/auth.middleware');

// Opérateur
router.post('/', authentifier, kycValide, paiementController.initierPaiement);
router.get('/', authentifier, kycValide, paiementController.listerPaiements);
router.get('/:id', authentifier, kycValide, paiementController.obtenirPaiement);
router.post('/:id/confirmer', authentifier, kycValide, paiementController.confirmerPaiement);
router.post('/:id/liberer-escrow', authentifier, kycValide, paiementController.libererEscrow);
router.post('/:id/fraction', authentifier, kycValide, paiementController.payerFraction);

// Admin
router.get('/admin/escrow', authentifier, autoriser('ADMIN'), paiementController.statsEscrow);

module.exports = router;