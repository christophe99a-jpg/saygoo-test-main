const express = require('express');
const router = express.Router();

const stockageController = require('../controllers/stockage.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.use(authorize('OPERATEUR_ECONOMIQUE', 'SUPER_ADMIN'));

// Route fixe — AVANT les routes :id
router.get('/entrepots-disponibles', stockageController.listerEntrepotsDisponibles);

router.post('/', stockageController.creerDemande);
router.get('/', stockageController.listerMesDemandes);
router.get('/:id', stockageController.getDemande);

module.exports = router;