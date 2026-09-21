const express = require('express');
const router = express.Router();

const recuController = require('../controllers/recu.controller');

// Route PUBLIQUE : appelée en scannant le QR code d'un reçu.
// Pas d'authentification — un douanier ou une banque doit pouvoir vérifier
// sans compte SAYGOO. La protection repose sur la signature HMAC du QR code.
router.get('/verifier/:numeroRecu', recuController.verifierRecu);

module.exports = router;
