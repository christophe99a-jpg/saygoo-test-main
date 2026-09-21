const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token d\'authentification manquant.'
    });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
      issuer: 'saygoo-auth',
      audience: 'saygoo-app'
    });
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Session expirée. Veuillez vous reconnecter.'
      : 'Token invalide.';
    return res.status(401).json({ success: false, message });
  }

  // Le jeton émis par auth-service nomme l'organisation « organisationId ».
  // Les contrôleurs de ce service lisent historiquement « orgId ». Sans cette
  // correspondance, orgId valait toujours undefined : le filtrage par
  // organisation ne s'appliquait jamais et chaque utilisateur voyait les
  // données de toutes les organisations. On expose les deux noms.
  req.user = {
    ...decoded,
    orgId: decoded.orgId ?? decoded.organisationId,
    organisationId: decoded.organisationId ?? decoded.orgId
  };
  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Non authentifié.' });
    }
    if (!roles.includes(req.user.role)) {
      logger.warn('Accès refusé par rôle', {
        userId: req.user.sub,
        role: req.user.role,
        required: roles
      });
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Rôle insuffisant.',
        required: roles
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };