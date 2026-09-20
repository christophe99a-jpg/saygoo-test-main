const crypto = require('crypto');

/**
 * Vérification de signature HMAC pour les webhooks des prestataires de paiement.
 *
 * Le prestataire signe le corps brut de la requête avec un secret partagé et
 * envoie le résultat dans un en-tête. On recalcule la signature de notre côté
 * et on compare. Si ça ne correspond pas, la requête est rejetée.
 *
 * Deux protections complémentaires :
 *  - comparaison à temps constant (évite de révéler la signature octet par octet)
 *  - fenêtre temporelle (un webhook capturé ne peut pas être rejoué des jours après)
 */

// Tolérance en secondes entre l'horodatage du webhook et l'heure serveur
const TOLERANCE_SECONDS = 300; // 5 minutes

/**
 * Compare deux chaînes à temps constant.
 * crypto.timingSafeEqual exige des Buffers de même longueur, d'où le pré-test.
 */
const comparaisonSure = (a, b) => {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Construit un middleware de vérification pour un prestataire donné.
 *
 * @param {object} options
 * @param {string} options.secretEnvVar  Nom de la variable d'environnement contenant le secret
 * @param {string} options.signatureHeader  En-tête portant la signature
 * @param {string} [options.timestampHeader]  En-tête portant l'horodatage (optionnel)
 */
const verifierSignature = ({ secretEnvVar, signatureHeader, timestampHeader }) => {
  return (req, res, next) => {
    const secret = process.env[secretEnvVar];

    // Sans secret configuré, on refuse. Laisser passer serait pire que tout :
    // un oubli de configuration rouvrirait la faille en silence.
    if (!secret) {
      return res.status(503).json({
        success: false,
        message: 'Webhook non configuré.'
      });
    }

    const signatureRecue = req.get(signatureHeader);
    if (!signatureRecue) {
      return res.status(401).json({
        success: false,
        message: 'Signature absente.'
      });
    }

    // Le corps brut est capturé par express.json({ verify }) dans app.js.
    // Indispensable : re-sérialiser req.body avec JSON.stringify ne redonne pas
    // forcément les mêmes octets (ordre des clés, espaces), donc le HMAC différerait.
    const corpsBrut = req.rawBody;
    if (!corpsBrut) {
      return res.status(400).json({
        success: false,
        message: 'Corps de requête illisible.'
      });
    }

    let charge = corpsBrut;

    // Si le prestataire horodate ses webhooks, on vérifie la fraîcheur
    // et on inclut l'horodatage dans la charge signée.
    if (timestampHeader) {
      const horodatage = req.get(timestampHeader);
      if (!horodatage) {
        return res.status(401).json({
          success: false,
          message: 'Horodatage absent.'
        });
      }

      const envoye = Number(horodatage);
      if (!Number.isFinite(envoye)) {
        return res.status(401).json({
          success: false,
          message: 'Horodatage invalide.'
        });
      }

      const maintenant = Math.floor(Date.now() / 1000);
      if (Math.abs(maintenant - envoye) > TOLERANCE_SECONDS) {
        return res.status(401).json({
          success: false,
          message: 'Webhook expiré.'
        });
      }

      charge = Buffer.concat([
        Buffer.from(`${horodatage}.`, 'utf8'),
        corpsBrut
      ]);
    }

    const attendue = crypto
      .createHmac('sha256', secret)
      .update(charge)
      .digest('hex');

    if (!comparaisonSure(signatureRecue, attendue)) {
      return res.status(401).json({
        success: false,
        message: 'Signature invalide.'
      });
    }

    return next();
  };
};

module.exports = { verifierSignature, comparaisonSure, TOLERANCE_SECONDS };