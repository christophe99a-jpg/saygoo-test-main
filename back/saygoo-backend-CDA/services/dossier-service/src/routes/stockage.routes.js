const express = require('express');
const router = express.Router();

const stockageController = require('../controllers/stockage.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

// ── Réception / liste / détail ──────────────────────────────────────────────────
router.post(
  '/',
  authorize('SUPER_ADMIN', 'OPERATEUR_ECONOMIQUE', 'CDA'),
  stockageController.creerDemande
);
router.get('/', stockageController.listerDemandes);
router.get('/:id', stockageController.getDemande);

// ── Acceptation / refus / demande d'infos ───────────────────────────────────────
router.patch('/:id/accepter', authorize('SUPER_ADMIN', 'CDA'), stockageController.accepterDemande);
router.patch('/:id/refuser', authorize('SUPER_ADMIN', 'CDA'), stockageController.refuserDemande);
router.post('/:id/demander-infos', authorize('SUPER_ADMIN', 'CDA'), stockageController.demanderInfos);

// ── Affectation d'emplacement ────────────────────────────────────────────────────
router.post('/:id/affecter', authorize('SUPER_ADMIN', 'CDA'), stockageController.affecterEmplacement);
router.patch('/:id/emplacement', authorize('SUPER_ADMIN', 'CDA'), stockageController.modifierEmplacement);

// ── Sortie ────────────────────────────────────────────────────────────────────────
router.patch('/:id/autoriser-sortie', authorize('SUPER_ADMIN', 'CDA'), stockageController.autoriserSortie);
router.post('/:id/effectuer-sortie', authorize('SUPER_ADMIN', 'CDA'), stockageController.effectuerSortie);

// ── Documents ─────────────────────────────────────────────────────────────────────
router.post('/:id/documents', stockageController.ajouterDocument);
router.get('/:id/documents', stockageController.listerDocuments);

// ── Historique ───────────────────────────────────────────────────────────────────
router.get('/:id/historique', stockageController.getHistorique);

module.exports = router;