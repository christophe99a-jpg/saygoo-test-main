const express = require('express');
const router = express.Router();

const catalogueController = require('../controllers/catalogue.controller');
const venteController = require('../controllers/vente.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

// ── Parc à véhicules (catalogue) — routes fixes AVANT :id ──────────────────────
router.get('/mes-achats', venteController.listerMesAchats);
router.get('/', catalogueController.listerCatalogue);
router.post('/', authorize('SUPER_ADMIN', 'CDA'), catalogueController.ajouterVehicule);

// ── Suivi d'un achat (route fixe /achats/... AVANT /:id) ────────────────────────
router.get('/achats/:id/suivi', venteController.getSuiviAchat);

// ── Fiche véhicule / réservation / achat ────────────────────────────────────────
router.get('/:id', catalogueController.getFicheVehicule);
router.patch('/:id/reserver', catalogueController.reserverVehicule);
router.post('/:vehiculeId/acheter', venteController.acheter);

module.exports = router;