const express = require('express');
const router = express.Router();

const vehiculeController = require('../controllers/vehicule.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

// ── Cas n°1 : Importation au Togo ────────────────────────────────────────────────
router.post(
  '/:dossierId/import',
  authorize('SUPER_ADMIN', 'CDA'),
  vehiculeController.lancerFormalitesImport
);

// ── Cas n°2 : Transit vers un pays de la sous-région ────────────────────────────
router.post(
  '/:dossierId/transit',
  authorize('SUPER_ADMIN', 'CDA'),
  vehiculeController.validerTransit
);

// ── Liste + complétion des formalités ───────────────────────────────────────────
router.get('/:dossierId', vehiculeController.listerFormalites);
router.patch(
  '/item/:id/completer',
  authorize('SUPER_ADMIN', 'CDA'),
  vehiculeController.completerFormalite
);

module.exports = router;