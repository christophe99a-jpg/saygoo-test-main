const express = require('express');
const router = express.Router();

const dedouanementController = require('../controllers/dedouanement.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.use(authorize('OPERATEUR_ECONOMIQUE', 'SUPER_ADMIN'));

router.post('/', dedouanementController.creerDemande);
router.get('/', dedouanementController.listerMesDemandes);
router.get('/:id', dedouanementController.getDemande);
router.post('/:id/documents', dedouanementController.ajouterDocument);

module.exports = router;