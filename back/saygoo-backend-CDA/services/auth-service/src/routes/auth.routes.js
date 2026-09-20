const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// ── Routes publiques ─────────────────────────────────────────────────────────────
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/mot-de-passe-oublie', authController.motDePasseOublie);
router.post('/reinitialiser-mot-de-passe', authController.reinitialiserMotDePasse);
router.post('/verifier-email', authController.verifierEmail);

// ── Routes authentifiées ─────────────────────────────────────────────────────────
router.use(authenticate);

router.get('/me', authController.me);
router.post('/logout', authController.logout);
router.post('/changer-mot-de-passe', authController.changerMotDePasse);

// Double authentification
router.post('/2fa/initialiser', authController.initialiser2FA);
router.post('/2fa/activer', authController.activer2FA);
router.post('/2fa/desactiver', authController.desactiver2FA);

module.exports = router;
