const express = require('express');
const router = express.Router();

const factureController = require('../controllers/facture.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

// ── Simulation du barème (avant ajout de ligne) ─────────────────────────────────
router.get('/simuler-honoraire', factureController.simulerHonoraire);

// ── Factures ─────────────────────────────────────────────────────────────────────
router.post('/', authorize('SUPER_ADMIN', 'CDA'), factureController.creerFacture);
router.get('/', factureController.listerFactures);
router.get('/:id', factureController.getFacture);

// ── Lignes de facture ────────────────────────────────────────────────────────────
router.post('/:id/lignes', authorize('SUPER_ADMIN', 'CDA'), factureController.ajouterLigne);
router.delete('/:id/lignes/:ligneId', authorize('SUPER_ADMIN', 'CDA'), factureController.supprimerLigne);

// ── Workflow ─────────────────────────────────────────────────────────────────────
router.post('/:id/emettre', authorize('SUPER_ADMIN', 'CDA'), factureController.emettreFacture);
router.post('/:id/payer', authorize('SUPER_ADMIN', 'CDA', 'COMPTABLE'), factureController.marquerPayee);

module.exports = router;