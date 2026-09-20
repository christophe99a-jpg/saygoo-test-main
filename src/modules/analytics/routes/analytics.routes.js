// src/modules/analytics/routes/analytics.routes.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authentifier, kycValide, autoriser } = require('../../../middlewares/auth.middleware');

// Opérateur
router.get('/dashboard', authentifier, kycValide, analyticsController.dashboardOperateur);
router.get('/stats', authentifier, kycValide, analyticsController.statsOperateur);

// Admin
router.get('/admin/dashboard', authentifier, autoriser('ADMIN'), analyticsController.dashboardAdmin);

module.exports = router;