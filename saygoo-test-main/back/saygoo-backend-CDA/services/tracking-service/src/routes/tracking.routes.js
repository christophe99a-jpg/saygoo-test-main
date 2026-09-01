const express = require('express');
const router = express.Router();

const trackingController = require('../controllers/tracking.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// ── Route publique (tracking sans auth) ───────────────────────────────────────
router.get('/tracker/:reference', trackingController.trackerLivraison);

// ── Toutes les autres routes nécessitent une authentification ─────────────────
router.use(authenticate);

// ── Statistiques ──────────────────────────────────────────────────────────────
router.get('/statistiques', trackingController.getStatistiques);

// ── CRUD Livraisons ───────────────────────────────────────────────────────────

// GET /livraisons — Liste toutes les livraisons
router.get('/', trackingController.listerLivraisons);

// POST /livraisons — Créer une livraison
router.post(
  '/',
  authorize('SUPER_ADMIN', 'CDA', 'RESPONSABLE_OPS'),
  trackingController.creerLivraison
);

// GET /livraisons/:id — Détail d'une livraison
router.get('/:id', trackingController.getLivraison);

// ── Actions sur une livraison ─────────────────────────────────────────────────

// PATCH /livraisons/:id/statut — Changer le statut
router.patch(
  '/:id/statut',
  authorize('SUPER_ADMIN', 'CDA', 'RESPONSABLE_OPS'),
  trackingController.changerStatut
);

// POST /livraisons/:id/position — Mettre à jour GPS
router.post(
  '/:id/position',
  authorize('SUPER_ADMIN', 'CDA', 'RESPONSABLE_OPS'),
  trackingController.updatePosition
);

// POST /livraisons/:id/preuve — Enregistrer preuve de livraison
router.post(
  '/:id/preuve',
  authorize('SUPER_ADMIN', 'CDA', 'RESPONSABLE_OPS'),
  trackingController.enregistrerPreuve
);

module.exports = router;