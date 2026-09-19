const express = require('express');
const router = express.Router();

const transportController = require('../controllers/transport.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

// ── Réception / liste / détail ──────────────────────────────────────────────────
router.post(
  '/',
  authorize('SUPER_ADMIN', 'OPERATEUR_ECONOMIQUE', 'CDA'),
  transportController.creerDemande
);
router.get('/', transportController.listerDemandes);
router.get('/:id', transportController.getDemande);

// ── Validation / refus / complément ─────────────────────────────────────────────
router.patch('/:id/valider', authorize('SUPER_ADMIN', 'CDA'), transportController.validerDemande);
router.patch('/:id/refuser', authorize('SUPER_ADMIN', 'CDA'), transportController.refuserDemande);
router.post('/:id/demander-complement', authorize('SUPER_ADMIN', 'CDA'), transportController.demanderComplement);

// ── Recherche & sélection de transporteur ───────────────────────────────────────
router.post('/:id/rechercher-transporteurs', authorize('SUPER_ADMIN', 'CDA'), transportController.lancerRecherche);
router.patch('/offres/:offreId/selectionner', authorize('SUPER_ADMIN', 'CDA'), transportController.selectionnerOffre);

// ── Affectation ──────────────────────────────────────────────────────────────────
router.post('/:id/affecter', authorize('SUPER_ADMIN', 'CDA'), transportController.affecterTransport);

// ── Suivi ────────────────────────────────────────────────────────────────────────
router.patch('/:id/demarrer', authorize('SUPER_ADMIN', 'CDA'), transportController.demarrerTransport);
router.patch('/:id/position', transportController.mettreAJourPosition);

// ── Livraison ────────────────────────────────────────────────────────────────────
router.post('/:id/livrer', transportController.confirmerLivraison);

// ── Documents ─────────────────────────────────────────────────────────────────────
router.post('/:id/documents', transportController.ajouterDocument);
router.get('/:id/documents', transportController.listerDocuments);

// ── Historique ───────────────────────────────────────────────────────────────────
router.get('/:id/historique', transportController.getHistorique);

module.exports = router;