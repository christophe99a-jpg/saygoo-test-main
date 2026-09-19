const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notification.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

// ── Templates (routes fixes AVANT :id) ──────────────────────────────────────────
router.get('/templates', notificationController.listerTemplates);
router.post('/templates', authorize('SUPER_ADMIN'), notificationController.creerTemplate);
router.patch('/templates/:id', authorize('SUPER_ADMIN'), notificationController.modifierTemplate);

// ── Rejeu des échecs (route fixe) ───────────────────────────────────────────────
router.post('/rejouer', authorize('SUPER_ADMIN'), notificationController.rejouerEchecs);

// ── Marquer toutes lues (route fixe) ────────────────────────────────────────────
router.patch('/tout-lire', notificationController.marquerToutesLues);

// ── Envoi (appelé par les autres services) ──────────────────────────────────────
router.post('/', notificationController.envoyer);

// ── Boîte de réception ───────────────────────────────────────────────────────────
router.get('/', notificationController.lister);
router.patch('/:id/lire', notificationController.marquerLue);

module.exports = router;
