const express = require('express');
const router = express.Router();

const cotationController = require('../controllers/cotation.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// ── Toutes les routes nécessitent une authentification ────────────────────────
router.use(authenticate);

// ── Statistiques ──────────────────────────────────────────────────────────────
router.get('/statistiques', cotationController.getStatistiques);

// ── Simulation (sans sauvegarde) ──────────────────────────────────────────────
router.post('/simuler', cotationController.simulerCotation);

// ── CRUD Cotations ────────────────────────────────────────────────────────────

// GET /cotations — Liste toutes les cotations
router.get('/', cotationController.listerCotations);

// POST /cotations — Créer une cotation
router.post(
  '/',
  authorize('SUPER_ADMIN', 'CDA', 'ASSISTANT_DECLARANT'),
  cotationController.creerCotation
);

// GET /cotations/:id — Détail d'une cotation
router.get('/:id', cotationController.getCotation);

// ── Actions sur une cotation ──────────────────────────────────────────────────

// PATCH /cotations/:id/valider — Valider une cotation
router.patch(
  '/:id/valider',
  authorize('SUPER_ADMIN', 'CDA', 'RESPONSABLE_OPS'),
  cotationController.validerCotation
);

// PATCH /cotations/:id/envoyer — Envoyer au client
router.patch(
  '/:id/envoyer',
  authorize('SUPER_ADMIN', 'CDA'),
  cotationController.envoyerCotation
);

module.exports = router;