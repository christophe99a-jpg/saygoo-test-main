// src/modules/wallet/routes/wallet.routes.js
const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { authentifier, kycValide } = require('../../../middlewares/auth.middleware');

// Création et consultation
router.post('/', authentifier, kycValide, walletController.creerWallet);
router.get('/', authentifier, kycValide, walletController.obtenirWallet);
router.get('/stats', authentifier, kycValide, walletController.statistiques);
router.get('/historique', authentifier, kycValide, walletController.historique);
router.get('/rechercher', authentifier, kycValide, walletController.rechercherWallet);

// Sécurité
router.post('/pin', authentifier, kycValide, walletController.definirPIN);

// Opérations financières
router.post('/recharger', authentifier, kycValide, walletController.recharger);
router.post('/retirer', authentifier, kycValide, walletController.retirer);
router.post('/virer', authentifier, kycValide, walletController.virer);

module.exports = router;