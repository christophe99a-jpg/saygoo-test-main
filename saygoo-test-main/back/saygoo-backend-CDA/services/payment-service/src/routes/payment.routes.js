const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// ── Webhook (sans authentification) ──────────────────────────────────────────
router.post('/webhook', paymentController.webhook);

// ── Toutes les autres routes nécessitent une authentification ─────────────────
router.use(authenticate);

// ── Statistiques ──────────────────────────────────────────────────────────────
router.get('/statistiques', paymentController.getStatistiques);

// ── CRUD Paiements ────────────────────────────────────────────────────────────

// GET /paiements — Liste tous les paiements
router.get('/', paymentController.listerPaiements);

// POST /paiements — Initier un paiement
router.post(
  '/',
  authorize('SUPER_ADMIN', 'CDA', 'COMPTABLE', 'CLIENT'),
  paymentController.initierPaiement
);

// GET /paiements/:id — Détail d'un paiement
router.get('/:id', paymentController.getPaiement);

// ── Actions sur un paiement ───────────────────────────────────────────────────

// PATCH /paiements/:id/confirmer — Confirmer un paiement
router.patch(
  '/:id/confirmer',
  authorize('SUPER_ADMIN', 'CDA', 'COMPTABLE'),
  paymentController.confirmerPaiement
);

// PATCH /paiements/:id/annuler — Annuler un paiement
router.patch(
  '/:id/annuler',
  authorize('SUPER_ADMIN', 'CDA', 'COMPTABLE'),
  paymentController.annulerPaiement
);

module.exports = router;