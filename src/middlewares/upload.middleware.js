// src/middlewares/upload.middleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');

const creerDossierSiAbsent = (dossier) => {
  if (!fs.existsSync(dossier)) fs.mkdirSync(dossier, { recursive: true });
};

const creerStockage = (sousRep) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dossier = path.join(env.upload.dir, sousRep, req.user.id);
    creerDossierSiAbsent(dossier);
    cb(null, dossier);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}_${Date.now()}${ext}`);
  },
});

const filtreTypes = (req, file, cb) => {
  const typesAutorise = ['image/jpeg', 'image/png', 'application/pdf'];
  if (typesAutorise.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format non supporté. Utilisez JPG, PNG ou PDF.'), false);
  }
};

const options = (sousRep) => ({
  storage: creerStockage(sousRep),
  limits: { fileSize: env.upload.maxSize },
  fileFilter: filtreTypes,
});

// Upload KYC
const uploadKYC = multer(options('kyc')).fields([
  { name: 'carteCFE', maxCount: 1 },
  { name: 'pieceIdentite', maxCount: 1 },
  { name: 'carteOE', maxCount: 1 },
]);

// Upload documents dossier dédouanement
const uploadDossier = multer(options('dossiers')).fields([
  { name: 'facture', maxCount: 1 },
  { name: 'bl', maxCount: 1 },
  { name: 'packingList', maxCount: 1 },
  { name: 'certificatOrigine', maxCount: 1 },
  { name: 'assurance', maxCount: 1 },
  { name: 'autorisation', maxCount: 1 },
]);

module.exports = { uploadKYC, uploadDossier };