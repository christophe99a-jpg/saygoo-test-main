// src/modules/auth/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validerInscription, validerLogin } = require('../validators/auth.validatorB');
const { authentifier } = require('../../../middlewares/auth.middleware');

/**
 * @swagger
 * /api/v1/auth/inscription:
 *   post:
 *     tags: [Auth]
 *     summary: Créer un nouveau compte opérateur
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InscriptionRequest'
 *     responses:
 *       201:
 *         description: Compte créé avec succès
 *       400:
 *         description: Données invalides
 *       409:
 *         description: Email déjà utilisé
 */
router.post('/inscription', validerInscription, authController.inscrire);

/**
 * @swagger
 * /api/v1/auth/connexion:
 *   post:
 *     tags: [Auth]
 *     summary: Se connecter et obtenir un token JWT
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Connexion réussie
 *       401:
 *         description: Email ou mot de passe incorrect
 */
router.post('/connexion', validerLogin, authController.connecter);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rafraîchir le token d'accès
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token rafraîchi
 *       401:
 *         description: Refresh token invalide
 */
router.post('/refresh', authController.rafraichirToken);

/**
 * @swagger
 * /api/v1/auth/deconnexion:
 *   post:
 *     tags: [Auth]
 *     summary: Se déconnecter
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 */
router.post('/deconnexion', authentifier, authController.deconnecter);

/**
 * @swagger
 * /api/v1/auth/moi:
 *   get:
 *     tags: [Auth]
 *     summary: Obtenir le profil de l'utilisateur connecté
 *     responses:
 *       200:
 *         description: Profil utilisateur
 *       401:
 *         description: Non authentifié
 */
router.get('/moi', authentifier, authController.moi);

module.exports = router;