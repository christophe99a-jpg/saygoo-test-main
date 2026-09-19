const express = require('express');
const router = express.Router();

const documentController = require('../controllers/document.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

// ── Tableau de bord / recherche ─────────────────────────────────────────────────
router.get('/', documentController.listerDocuments);
router.get('/archives', documentController.getArchives);
router.get('/dossier/:dossierId/suivi', documentController.getSuiviDocumentaire);

// ── Ajout / consultation / téléchargement ───────────────────────────────────────
router.post('/', documentController.ajouterDocument);
router.get('/:id', documentController.consulterDocument);
router.get('/:id/telecharger', documentController.telechargerDocument);
router.post('/:id/version', documentController.ajouterVersion);

// ── Signature électronique ──────────────────────────────────────────────────────
router.post('/:id/signer', documentController.signerDocument);

// ── Back Office : validation / rejet ────────────────────────────────────────────
router.patch(
  '/:id/valider',
  authorize('SUPER_ADMIN', 'CDA'),
  documentController.validerDocument
);
router.patch(
  '/:id/rejeter',
  authorize('SUPER_ADMIN', 'CDA'),
  documentController.rejeterDocument
);

// ── Historique ───────────────────────────────────────────────────────────────────
router.get('/:id/historique', documentController.getHistoriqueDocument);

// ── Archivage ──────────────────────────────────────────────────────────────────
router.post('/:id/archiver', documentController.archiverDocument);
router.post('/:id/restaurer', documentController.restaurerDocument);
router.post('/dossier/:dossierId/archiver', documentController.archiverDossier);

module.exports = router;