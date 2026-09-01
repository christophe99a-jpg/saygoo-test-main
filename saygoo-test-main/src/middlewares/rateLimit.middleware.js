// src/middlewares/rateLimit.middleware.js
const rateLimit = require('express-rate-limit');

// Rate limit strict pour l'authentification
const rateLimitAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives max
  message: {
    success: false,
    message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit pour les opérations critiques (paiement, 2FA)
const rateLimitCritique = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 20,
  message: {
    success: false,
    message: 'Trop de requêtes sur cette opération. Réessayez dans 1 heure.',
  },
});

// Rate limit pour les uploads
const rateLimitUpload = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Trop d\'uploads. Réessayez dans 1 heure.',
  },
});

// Rate limit pour le 2FA
const rateLimitDeuxFA = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: {
    success: false,
    message: 'Trop de tentatives 2FA. Réessayez dans 10 minutes.',
  },
});

module.exports = { rateLimitAuth, rateLimitCritique, rateLimitUpload, rateLimitDeuxFA };