const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// La gateway vérifie le token une première fois pour rejeter tôt les requêtes
// non authentifiées. Chaque service revérifie de son côté : la gateway est un
// filtre de confort, jamais l'unique barrière de sécurité.
const verifierToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token d\'authentification manquant.' });
  }

  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_ACCESS_SECRET, {
      issuer: 'saygoo-auth',
      audience: 'saygoo-app',
    });
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Session expirée. Veuillez vous reconnecter.'
      : 'Token invalide.';
    return res.status(401).json({ success: false, message });
  }
};

const verifierRoles = (roles) => (req, res, next) => {
  if (!roles || roles.length === 0) return next();

  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Non authentifié.' });
  }
  if (!roles.includes(req.user.role)) {
    logger.warn('Accès refusé par la gateway', { userId: req.user.sub, role: req.user.role, requis: roles });
    return res.status(403).json({ success: false, message: 'Accès refusé. Rôle insuffisant.', requis: roles });
  }
  next();
};

module.exports = { verifierToken, verifierRoles };
