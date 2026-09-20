// src/modules/stockage/routes/stockage.routes.js
const express = require('express');
const router = express.Router();
const stockageController = require('../controllers/stockage.controller');
const { authentifier, kycValide, autoriser } = require('../../../middlewares/auth.middleware');

// Simulation (sans KYC requis)
router.post('/simuler', authentifier, stockageController.simulerCout);

// Opérateur Pack GOLD
router.post('/', authentifier, kycValide, stockageController.creerDemande);
router.get('/', authentifier, kycValide, stockageController.listerStockages);
router.get('/:id', authentifier, kycValide, stockageController.obtenirStockage);
router.post('/:id/sortie', authentifier, kycValide, stockageController.enregistrerSortie);
router.get('/:id/mouvements', authentifier, kycValide, stockageController.historiqueMouvements);

// Admin
router.patch('/:id/valider', authentifier, autoriser('ADMIN'), stockageController.validerDemande);
router.get('/admin/dashboard', authentifier, autoriser('ADMIN'), stockageController.dashboardStock);

module.exports = router;