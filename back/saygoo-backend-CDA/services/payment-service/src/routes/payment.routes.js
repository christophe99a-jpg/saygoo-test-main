const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/payment.controller');
const recuController = require('../controllers/recu.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { verifierSignature } = require('../middlewares/webhook.middleware');

// ── Webhooks prestataires ─────────────────────────────────────────────────────
// Pas d'authentification par JWT (le prestataire n'en a pas), mais une
// signature HMAC obligatoire. Un webhook non signé est rejeté en 401.

// PayGate Global (Flooz, T-Money)
router.post(
  '/webhook',
  verifierSignature({
    secretEnvVar: 'PAYGATE_WEBHOOK_SECRET',
    signatureHeader: 'x-paygate-signature',
    timestampHeader: 'x-paygate-timestamp'
  }),
  paymentController.webhook
);

// Ecobank (virement bancaire, VISA Business)
router.post(
  '/webhook/ecobank',
  verifierSignature({
    secretEnvVar: 'ECOBANK_WEBHOOK_SECRET',
    signatureHeader: 'x-ecobank-signature',
    timestampHeader: 'x-ecobank-timestamp'
  }),
  paymentController.webhook
);

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

// PATCH /paiements/:id/rapprocher — Rattacher à facture, dossier, conteneur
// Réservé au comptable : c'est l'acte qui engage le contrôle financier.
router.patch(
  '/:id/rapprocher',
  authorize('SUPER_ADMIN', 'COMPTABLE'),
  paymentController.rapprocherPaiement
);

// PATCH /paiements/:id/rembourser — Demander un remboursement
router.patch(
  '/:id/rembourser',
  authorize('SUPER_ADMIN', 'COMPTABLE'),
  paymentController.demanderRemboursement
);

// GET /paiements/:id/timeline — Historique des événements (lot B7)
router.get('/:id/timeline', paymentController.getTimeline);

// GET /paiements/:id/recu — Reçu PDF avec QR de vérification (lot B8)
router.get('/:id/recu', recuController.telechargerRecu);

// GET /paiements/:id — Détail d'un paiement
router.get('/:id', paymentController.getPaiement);

module.exports = router;