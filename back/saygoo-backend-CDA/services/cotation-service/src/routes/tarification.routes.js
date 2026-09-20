const express = require('express');
const router = express.Router();

const tarificationController = require('../controllers/tarification.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);

router.get('/bareme', tarificationController.getBareme);
router.post('/calculer', tarificationController.calculer);
router.post('/comparer', tarificationController.comparer);
router.post('/cout-revient', tarificationController.calculerCoutRevient);
router.post('/co2', tarificationController.calculerCO2);

module.exports = router;
