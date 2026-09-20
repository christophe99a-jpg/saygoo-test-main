const express = require('express');
const router = express.Router();

const utilisateurController = require('../controllers/utilisateur.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.use(authorize('SUPER_ADMIN', 'ADMIN'));

// Route fixe AVANT :id
router.get('/journal', utilisateurController.getJournal);

router.get('/', utilisateurController.lister);
router.get('/:id', utilisateurController.getUn);
router.patch('/:id/statut', utilisateurController.changerStatut);
router.patch('/:id/role', utilisateurController.changerRole);

module.exports = router;
