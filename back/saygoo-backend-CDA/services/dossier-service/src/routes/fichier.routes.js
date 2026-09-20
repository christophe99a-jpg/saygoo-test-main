const express = require('express');
const router = express.Router();

const fichierController = require('../controllers/fichier.controller');
const { upload } = require('../config/stockage');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);

// `upload.single('fichier')` traite le multipart : le champ du formulaire
// doit donc s'appeler « fichier ». gererErreursUpload traduit les refus de
// multer (taille, format) en réponses 400 lisibles.
router.post(
  '/upload',
  upload.single('fichier'),
  fichierController.gererErreursUpload,
  fichierController.televerser,
);

router.post(
  '/:id/version',
  upload.single('fichier'),
  fichierController.gererErreursUpload,
  fichierController.televerserVersion,
);

router.get('/:id/fichier', fichierController.telechargerFichier);
router.get('/:id/infos', fichierController.infosFichier);

module.exports = router;
