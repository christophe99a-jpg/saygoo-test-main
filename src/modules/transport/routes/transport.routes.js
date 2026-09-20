// src/modules/transport/routes/transport.routes.js
const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transport.controller');
const { authentifier } = require('../../../middlewares/auth.middleware');

// Routes publiques (accessibles sans KYC pour les simulations)
router.get('/tarifs', authentifier, transportController.obtenirTarifs);
router.get('/distance', authentifier, transportController.obtenirDistance);
router.post('/simuler', authentifier, transportController.simuler);
router.post('/comparer', authentifier, transportController.comparerCamions);

module.exports = router;