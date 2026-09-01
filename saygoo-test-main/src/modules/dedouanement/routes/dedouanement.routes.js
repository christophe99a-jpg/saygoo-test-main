// src/modules/dedouanement/routes/dedouanement.routes.js
const express = require('express');
const router = express.Router();
const dossierController = require('../controllers/dossier.controller');
const { authentifier, kycValide, autoriser } = require('../../../middlewares/auth.middleware');
const { validerCreerDossier } = require('../validators/dossier.validator');
const { uploadDossier } = require('../../../middlewares/upload.middleware');

/**
 * @swagger
 * /api/v1/dossiers:
 *   post:
 *     tags: [Dossiers]
 *     summary: Créer un nouveau dossier de dédouanement
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreerDossierRequest'
 *     responses:
 *       201:
 *         description: Dossier créé avec succès
 *       400:
 *         description: Données invalides
 *       403:
 *         description: KYC non validé
 */
router.post('/', authentifier, kycValide, validerCreerDossier, dossierController.creer);

/**
 * @swagger
 * /api/v1/dossiers:
 *   get:
 *     tags: [Dossiers]
 *     summary: Lister tous les dossiers de l'opérateur
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [BROUILLON, SOUMIS, VALIDE, REJETE, DEDOUANE, LIVRE]
 *       - in: query
 *         name: typeOperation
 *         schema:
 *           type: string
 *           enum: [IMPORTATION, EXPORTATION]
 *     responses:
 *       200:
 *         description: Liste des dossiers
 */
router.get('/', authentifier, kycValide, dossierController.lister);

/**
 * @swagger
 * /api/v1/dossiers/{id}:
 *   get:
 *     tags: [Dossiers]
 *     summary: Obtenir les détails d'un dossier
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Détails du dossier
 *       404:
 *         description: Dossier introuvable
 */
router.get('/:id', authentifier, kycValide, dossierController.obtenirParId);

/**
 * @swagger
 * /api/v1/dossiers/{id}/documents:
 *   post:
 *     tags: [Dossiers]
 *     summary: Uploader les documents d'un dossier
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               facture:
 *                 type: string
 *                 format: binary
 *               bl:
 *                 type: string
 *                 format: binary
 *               packingList:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Documents uploadés
 */
router.post('/:id/documents', authentifier, kycValide, uploadDossier, dossierController.uploaderDocuments);

/**
 * @swagger
 * /api/v1/dossiers/{id}/soumettre:
 *   post:
 *     tags: [Dossiers]
 *     summary: Soumettre un dossier pour traitement
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dossier soumis
 *       400:
 *         description: Documents manquants
 */
router.post('/:id/soumettre', authentifier, kycValide, dossierController.soumettre);

/**
 * @swagger
 * /api/v1/dossiers/{id}/dupliquer:
 *   post:
 *     tags: [Dossiers]
 *     summary: Dupliquer un dossier existant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Dossier dupliqué
 */
router.post('/:id/dupliquer', authentifier, kycValide, dossierController.dupliquer);

/**
 * @swagger
 * /api/v1/dossiers/{id}/action:
 *   patch:
 *     tags: [Dossiers]
 *     summary: Valider ou rejeter un dossier (Admin/CDA)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [valider, rejeter]
 *               motifRejet:
 *                 type: string
 *     responses:
 *       200:
 *         description: Action effectuée
 */
router.patch('/:id/action', authentifier, autoriser('ADMIN', 'CDA'), dossierController.validerOuRejeter);

module.exports = router;