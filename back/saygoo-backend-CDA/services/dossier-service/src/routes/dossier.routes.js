const express = require('express');
const router = express.Router();

const dossierController = require('../controllers/dossier.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

// ── Réception / liste / détail ──────────────────────────────────────────────────
router.post(
  '/',
  authorize('SUPER_ADMIN', 'OPERATEUR_ECONOMIQUE', 'CDA'),
  dossierController.creerDossier
);
router.get('/', dossierController.listerDossiers);
router.get('/:id', dossierController.getDossier);

// ── Prise en charge / rejet ─────────────────────────────────────────────────────
router.patch(
  '/:id/prendre-en-charge',
  authorize('SUPER_ADMIN', 'CDA'),
  dossierController.prendreEnCharge
);
router.patch(
  '/:id/rejeter',
  authorize('SUPER_ADMIN', 'CDA'),
  dossierController.rejeterDossier
);

// ── Documents complémentaires ────────────────────────────────────────────────────
router.post(
  '/:id/demander-documents',
  authorize('SUPER_ADMIN', 'CDA'),
  dossierController.demanderDocuments
);
router.post('/:id/documents', dossierController.uploaderDocument);
router.get('/:id/documents', dossierController.listerDocuments);

// ── Notes ────────────────────────────────────────────────────────────────────────
router.post('/:id/notes', dossierController.ajouterNote);
router.get('/:id/notes', dossierController.listerNotes);

// ── Traitement du dossier ───────────────────────────────────────────────────────
router.patch(
  '/:id/traitement',
  authorize('SUPER_ADMIN', 'CDA'),
  dossierController.majTraitement
);

// ── Clôture ──────────────────────────────────────────────────────────────────────
router.post(
  '/:id/cloturer',
  authorize('SUPER_ADMIN', 'CDA'),
  dossierController.cloturerDossier
);

// ── Historique ───────────────────────────────────────────────────────────────────
router.get('/:id/historique', dossierController.getHistorique);

module.exports = router;