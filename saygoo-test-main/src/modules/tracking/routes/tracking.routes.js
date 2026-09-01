// src/modules/tracking/routes/tracking.routes.js
const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/tracking.controller');
const { authentifier, kycValide, autoriser } = require('../../../middlewares/auth.middleware');

// Opérateur : consulter le tracking de ses dossiers
router.get('/dossier/:dossierId', authentifier, kycValide, trackingController.obtenirTracking);
router.get('/dossier/:dossierId/position', authentifier, kycValide, trackingController.obtenirPosition);

// Admin / CDA : ajouter des étapes et gérer
router.post('/dossier/:dossierId', authentifier, autoriser('ADMIN', 'CDA'), trackingController.ajouterEtape);
router.post('/dossier/:dossierId/incident', authentifier, autoriser('ADMIN', 'CDA'), trackingController.signalerIncident);
router.get('/admin/tous', authentifier, autoriser('ADMIN'), trackingController.listerTousTrackings);
router.get('/admin/stats', authentifier, autoriser('ADMIN'), trackingController.statsTracking);

module.exports = router;