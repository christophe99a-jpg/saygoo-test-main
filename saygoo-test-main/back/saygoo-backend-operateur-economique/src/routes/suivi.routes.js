const express = require('express');
const router = express.Router();

const suiviController = require('../controllers/suivi.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.use(authorize('OPERATEUR_ECONOMIQUE', 'SUPER_ADMIN'));

router.get('/', suiviController.getSuiviGlobal);

module.exports = router;