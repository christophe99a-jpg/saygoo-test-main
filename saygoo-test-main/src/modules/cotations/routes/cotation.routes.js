// src/modules/cotations/routes/cotation.routes.js
const express = require('express');
const router = express.Router();
const cotationController = require('../controllers/cotation.controller');
const { authentifier, kycValide, autoriser } = require('../../../middlewares/auth.middleware');

// Opérateur : voir et gérer les cotations de ses dossiers
router.get('/dossier/:dossierId', authentifier, kycValide, cotationController.listerParDossier);
router.get('/dossier/:dossierId/comparer', authentifier, kycValide, cotationController.comparerCotations);
router.patch('/:id/accepter', authentifier, kycValide, cotationController.accepterCotation);
router.patch('/:id/refuser', authentifier, kycValide, cotationController.refuserCotation);

// CDA : soumettre et voir ses cotations
router.post('/dossier/:dossierId', authentifier, autoriser('CDA', 'ADMIN'), cotationController.soumettreCotation);
router.get('/mes-cotations', authentifier, autoriser('CDA', 'ADMIN'), cotationController.listerMesCotations);

module.exports = router;