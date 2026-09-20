const express = require('express');
const router = express.Router();

const vehiculeController = require('../controllers/vehicule.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.use(authorize('OPERATEUR_ECONOMIQUE', 'SUPER_ADMIN'));

// ── Routes fixes AVANT :id ──────────────────────────────────────────────────────
router.get('/mes-achats', vehiculeController.listerMesAchats);
router.get('/achats/:id/suivi', vehiculeController.getSuiviAchat);

// ── Catalogue / fiche véhicule ───────────────────────────────────────────────────
router.get('/', vehiculeController.listerCatalogue);
router.get('/:id', vehiculeController.getFicheVehicule);
router.patch('/:id/reserver', vehiculeController.reserverVehicule);

// ── Achat ────────────────────────────────────────────────────────────────────────
router.post('/:id/acheter', vehiculeController.acheterVehicule);

module.exports = router;