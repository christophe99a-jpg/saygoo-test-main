const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// IMPORTANT : issuer et audience doivent rester identiques dans tous les
// services SAYGOO, qui vérifient les tokens avec exactement ces valeurs.
const ISSUER = 'saygoo-auth';
const AUDIENCE = 'saygoo-app';

const DUREE_ACCESS = process.env.JWT_ACCESS_EXPIRES || '15m';
const DUREE_REFRESH_JOURS = parseInt(process.env.JWT_REFRESH_DAYS || '7', 10);

/**
 * Construit la charge utile attendue par les autres services.
 * Les champs sub / role / firstName / lastName / companyName / organisationId
 * sont lus tels quels par dossier-service, entrepot, OE, etc.
 */
const construirePayload = (utilisateur) => ({
  sub: utilisateur.id,
  email: utilisateur.email,
  role: utilisateur.role,
  firstName: utilisateur.prenom,
  lastName: utilisateur.nom,
  companyName: utilisateur.raisonSociale || undefined,
  organisationId: utilisateur.organisationId || undefined,
});

const genererAccessToken = (utilisateur) =>
  jwt.sign(construirePayload(utilisateur), process.env.JWT_ACCESS_SECRET, {
    expiresIn: DUREE_ACCESS,
    issuer: ISSUER,
    audience: AUDIENCE,
  });

const genererRefreshToken = () => ({
  token: crypto.randomBytes(48).toString('hex'),
  expireAt: new Date(Date.now() + DUREE_REFRESH_JOURS * 24 * 60 * 60 * 1000),
});

const genererJetonUsage = (heuresValidite = 24) => ({
  token: crypto.randomBytes(32).toString('hex'),
  expireAt: new Date(Date.now() + heuresValidite * 60 * 60 * 1000),
});

module.exports = {
  ISSUER,
  AUDIENCE,
  DUREE_ACCESS,
  construirePayload,
  genererAccessToken,
  genererRefreshToken,
  genererJetonUsage,
};
