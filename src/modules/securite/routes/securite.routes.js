// src/modules/securite/routes/securite.routes.js
const express = require('express');
const router = express.Router();
const securiteController = require('../controllers/securite.controller');
const { authentifier, autoriser } = require('../../../middlewares/auth.middleware');

// 2FA
router.post('/2fa/envoyer', authentifier, securiteController.envoyerCode);
router.post('/2fa/verifier', authentifier, securiteController.verifierCode);
router.post('/2fa/activer', authentifier, securiteController.activer2FA);

// Audit trail
router.get('/audit', authentifier, securiteController.obtenirAuditTrail);
router.delete('/tokens/nettoyer', authentifier, autoriser('ADMIN'), securiteController.nettoyerTokens);

module.exports = router;