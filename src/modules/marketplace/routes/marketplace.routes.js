// src/modules/marketplace/routes/marketplace.routes.js
const express = require('express');
const router = express.Router();
const produitController = require('../controllers/produit.controller');
const commandeController = require('../controllers/commande.controller');
const { authentifier, kycValide, autoriser } = require('../../../middlewares/auth.middleware');

// ── Produits ──────────────────────────────────────────
// Public (avec auth)
router.get('/produits', authentifier, produitController.listerProduits);
router.get('/produits/mes-produits', authentifier, kycValide, produitController.mesProduits);
router.get('/produits/:id', authentifier, produitController.obtenirProduit);
router.get('/produits/:id/matching', authentifier, kycValide, produitController.matchingAcheteurs);

// Vendeur Pack DIAMOND
router.post('/produits', authentifier, kycValide, produitController.publierProduit);
router.put('/produits/:id', authentifier, kycValide, produitController.modifierProduit);
router.patch('/produits/:id/archiver', authentifier, kycValide, produitController.archiverProduit);

// Admin
router.patch('/produits/:id/valider', authentifier, autoriser('ADMIN'), produitController.validerProduit);

// ── Commandes ─────────────────────────────────────────
router.post('/commandes', authentifier, kycValide, commandeController.passerCommande);
router.get('/commandes', authentifier, kycValide, commandeController.listerCommandes);
router.patch('/commandes/:id/confirmer', authentifier, kycValide, commandeController.confirmerCommande);
router.patch('/commandes/:id/livraison', authentifier, kycValide, commandeController.confirmerLivraison);
router.patch('/commandes/:id/annuler', authentifier, kycValide, commandeController.annulerCommande);
router.get('/stats/vendeur', authentifier, kycValide, commandeController.statsVendeur);

module.exports = router;