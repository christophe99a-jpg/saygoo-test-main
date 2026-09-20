require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const services = require('./config/services');
const { verifierToken, verifierRoles } = require('./middlewares/auth.middleware');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 8000;
const PREFIXE = '/api/v1';

app.set('trust proxy', 1);

// ── Sécurité ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.APP_URL || 'http://localhost:3001,http://localhost:5173').split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes. Veuillez patienter.' },
}));

// ── Identifiant de corrélation : suit la requête à travers les services ───────
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.requestId);
  next();
});

app.use(morgan(':method :url :status :response-time ms', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// ── Santé de la gateway et des services en aval ──────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'saygoo-api-gateway',
    version: '1.0.0',
    servicesRoutes: services.length,
    timestamp: new Date().toISOString(),
  });
});

app.get(`${PREFIXE}/health/services`, async (req, res) => {
  // Une seule vérification par cible, même si plusieurs préfixes y mènent
  const cibles = [...new Set(services.map((s) => s.cible))];

  const resultats = await Promise.all(
    cibles.map(async (cible) => {
      try {
        const { data } = await axios.get(`${cible}/health`, { timeout: 3000 });
        return { cible, statut: data.status || 'ok', service: data.service };
      } catch (err) {
        return { cible, statut: 'indisponible', erreur: err.code || err.message };
      }
    }),
  );

  const indisponibles = resultats.filter((r) => r.statut === 'indisponible').length;

  res.status(indisponibles > 0 ? 207 : 200).json({
    success: true,
    data: { services: resultats, total: resultats.length, indisponibles },
  });
});

// ── Montage des routes proxy ──────────────────────────────────────────────────
// IMPORTANT : aucun express.json() avant les proxys — le corps de la requête
// doit être transmis tel quel, sinon les POST/PATCH restent bloqués.
for (const service of services) {
  const chemin = `${PREFIXE}${service.prefixe}`;
  const intermediaires = [];

  if (!service.public) {
    intermediaires.push(verifierToken);
    if (service.roles) intermediaires.push(verifierRoles(service.roles));
  }

  intermediaires.push(
    createProxyMiddleware({
      target: service.cible,
      changeOrigin: true,
      // Express a retiré le préfixe de montage : on remet celui du service.
      // La racine arrive sous la forme '/' — on évite le slash final superflu.
      pathRewrite: (chemin) => {
        const [base, query] = chemin.split('?');
        const reste = base === '/' ? '' : base;
        const resultat = `${service.prefixeCible}${reste}` || '/';
        return query ? `${resultat}?${query}` : resultat;
      },
      timeout: 30000,
      proxyTimeout: 30000,
      on: {
        proxyReq: (proxyReq, req) => {
          if (req.requestId) proxyReq.setHeader('x-request-id', req.requestId);
        },
        error: (err, req, res) => {
          logger.error('Service en aval injoignable', {
            cible: service.cible,
            chemin: req.originalUrl,
            err: err.message,
          });
          if (!res.headersSent) {
            res.status(503).json({
              success: false,
              message: 'Service momentanément indisponible. Réessayez dans quelques instants.',
            });
          }
        },
      },
    }),
  );

  app.use(chemin, ...intermediaires);
  logger.debug(`Route montée : ${chemin} -> ${service.cible}`);
}

// ── 404 et erreurs ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route non trouvée : ${req.path}` });
});

app.use((err, req, res, next) => {
  logger.error('Erreur gateway', { err: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Une erreur interne s\'est produite.' : err.message,
  });
});

// ── Démarrage ─────────────────────────────────────────────────────────────────
if (!process.env.JWT_ACCESS_SECRET) {
  logger.error('JWT_ACCESS_SECRET absent : la gateway ne peut pas vérifier les tokens.');
  process.exit(1);
}

app.listen(PORT, () => {
  logger.info(`🚪 SAYGOO API Gateway démarrée sur le port ${PORT}`);
  logger.info(`   Préfixe public : ${PREFIXE}`);
  logger.info(`   ${services.length} routes vers ${[...new Set(services.map((s) => s.cible))].length} services`);
});
