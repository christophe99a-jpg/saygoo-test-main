// src/modules/kyc/routes/kyc.routes.js
const express = require('express');
const router = express.Router();
const kycController = require('../controllers/kyc.controller');
const { authentifier, autoriser } = require('../../../middlewares/auth.middleware');
const { uploadKYC } = require('../../../middlewares/upload.middleware');

// Opérateur : upload et consultation de son propre KYC
router.post('/documents', authentifier, uploadKYC, kycController.uploaderDocuments);
router.get('/statut', authentifier, kycController.obtenirStatutKYC);

// Admin : liste et validation
router.get('/en-attente', authentifier, autoriser('ADMIN'), kycController.listerKYCEnAttente);
router.patch('/:userId/valider', authentifier, autoriser('ADMIN'), kycController.validerKYC);

module.exports = router;