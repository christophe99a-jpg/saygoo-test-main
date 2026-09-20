// Table de routage : préfixe public -> service interne.
// Le frontend n'a plus qu'une seule URL à connaître (celle de la gateway).
//
// `prefixe`      -> chemin exposé après /api/v1
// `prefixeCible` -> chemin attendu par le service interne. Express retire le
//                   préfixe de montage avant le proxy : cette valeur est donc
//                   remise devant le chemin restant ('' si le service n'a pas
//                   de préfixe, comme entrepot et oe).
// `public: true` -> aucun token requis (login, inscription...)
// `roles`        -> si défini, seuls ces rôles peuvent atteindre le service

const services = [
  {
    prefixe: '/auth',
    cible: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    prefixeCible: '/auth',
    public: true, // la vérification du token est faite par le service lui-même
  },
  {
    prefixe: '/utilisateurs',
    cible: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    prefixeCible: '/utilisateurs',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    prefixe: '/cotations',
    cible: process.env.COTATION_SERVICE_URL || 'http://localhost:3002',
    prefixeCible: '/cotations',
  },
  {
    prefixe: '/tarification',
    cible: process.env.COTATION_SERVICE_URL || 'http://localhost:3002',
    prefixeCible: '/tarification',
  },
  {
    prefixe: '/comptabilite',
    cible: process.env.COMPTABILITE_SERVICE_URL || 'http://localhost:3003',
    prefixeCible: '/comptabilite',
    roles: ['SUPER_ADMIN', 'ADMIN', 'COMPTABLE'],
  },
  {
    prefixe: '/notifications',
    cible: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
    prefixeCible: '/notifications',
  },
  {
    prefixe: '/factures',
    cible: process.env.FACTURATION_SERVICE_URL || 'http://localhost:3005',
    prefixeCible: '/factures',
  },
  {
    prefixe: '/compte',
    cible: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
    prefixeCible: '/compte',
  },
  {
    prefixe: '/paiements',
    cible: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
    prefixeCible: '/paiements',
  },
  // ── Service dossier (CDA) : plusieurs préfixes vers le même service ──────────
  {
    prefixe: '/dossiers',
    cible: process.env.DOSSIER_SERVICE_URL || 'http://localhost:3007',
    prefixeCible: '/dossiers',
  },
  {
    prefixe: '/documents',
    cible: process.env.DOSSIER_SERVICE_URL || 'http://localhost:3007',
    prefixeCible: '/documents',
  },
  {
    prefixe: '/formalites',
    cible: process.env.DOSSIER_SERVICE_URL || 'http://localhost:3007',
    prefixeCible: '/formalites',
  },
  {
    prefixe: '/transport',
    cible: process.env.DOSSIER_SERVICE_URL || 'http://localhost:3007',
    prefixeCible: '/transport',
  },
  {
    prefixe: '/stockage',
    cible: process.env.DOSSIER_SERVICE_URL || 'http://localhost:3007',
    prefixeCible: '/stockage',
  },
  {
    prefixe: '/vehicules',
    cible: process.env.DOSSIER_SERVICE_URL || 'http://localhost:3007',
    prefixeCible: '/vehicules',
  },
  // ── Suivi de livraison (tracking) ────────────────────────────────────────────
  // public: true — le service gère lui-même l'authentification, car la route
  // /livraisons/tracker/:reference doit rester accessible sans jeton pour que
  // le destinataire suive son colis. Toutes les autres routes du service
  // exigent un token (router.use(authenticate)).
  {
    prefixe: '/livraisons',
    cible: process.env.TRACKING_SERVICE_URL || 'http://localhost:3011',
    prefixeCible: '/livraisons',
    public: true,
  },
  // ── Entrepôt ─────────────────────────────────────────────────────────────────
  {
    prefixe: '/entrepot',
    cible: process.env.ENTREPOT_SERVICE_URL || 'http://localhost:3008',
    prefixeCible: '',
  },
  // ── Espace Opérateur Économique ──────────────────────────────────────────────
  {
    prefixe: '/oe',
    cible: process.env.OE_SERVICE_URL || 'http://localhost:3009',
    prefixeCible: '',
  },
  // ── Consignataire ────────────────────────────────────────────────────────────
  {
    prefixe: '/consignataire',
    cible: process.env.CONSIGNATAIRE_SERVICE_URL || 'http://localhost:3010',
    prefixeCible: '',
  },
];

module.exports = services;