// src/config/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SAYGOO API',
      version: '1.0.0',
      description: `
# API SAYGOO - Plateforme Logistech

SAYGOO digitalise et sécurise la chaîne logistique : dédouanement, stockage, transport et vente.

## Authentification
Toutes les routes protégées nécessitent un token JWT dans le header :
\`Authorization: Bearer <token>\`

## Packs disponibles
- **BASIC** : Dédouanement, Cotations, Paiement, Tracking
- **GOLD** : BASIC + Stockage & MAD
- **DIAMOND** : GOLD + Marketplace

## Rôles
- **OPERATEUR** : Importateurs, exportateurs, traders
- **CDA** : Commissionnaires en Douane Agréés
- **ADMIN** : Administrateurs SAYGOO
      `,
      contact: {
        name: 'Support SAYGOO',
        email: 'support@saygoo.tg',
      },
      license: {
        name: 'Propriétaire',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Serveur de développement',
      },
      {
        url: 'https://api.saygoo.tg',
        description: 'Serveur de production',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenu via /api/v1/auth/connexion',
        },
      },
      schemas: {
        // ── Auth ──────────────────────────────────────────────
        InscriptionRequest: {
          type: 'object',
          required: ['raisonSociale', 'nomRepresentant', 'prenomRepresentant', 'email', 'telephone', 'motDePasse'],
          properties: {
            raisonSociale: { type: 'string', example: 'Import Export Togo SARL' },
            nomCommercial: { type: 'string', example: 'IET' },
            formeJuridique: { type: 'string', enum: ['SARL', 'SA', 'EI', 'AUTRE'], example: 'SARL' },
            nomRepresentant: { type: 'string', example: 'Kofi' },
            prenomRepresentant: { type: 'string', example: 'Mensah' },
            email: { type: 'string', format: 'email', example: 'kofi@example.com' },
            telephone: { type: 'string', example: '90000001' },
            motDePasse: { type: 'string', minLength: 8, example: 'motdepasse123' },
            typeActivite: { type: 'string', enum: ['IMPORTATEUR', 'EXPORTATEUR', 'DISTRIBUTEUR', 'TRADER', 'AUTRE'] },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'motDePasse'],
          properties: {
            email: { type: 'string', format: 'email', example: 'kofi@example.com' },
            motDePasse: { type: 'string', example: 'motdepasse123' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Connexion réussie' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                refreshToken: { type: 'string' },
              },
            },
          },
        },

        // ── User ──────────────────────────────────────────────
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            raisonSociale: { type: 'string' },
            email: { type: 'string', format: 'email' },
            telephone: { type: 'string' },
            role: { type: 'string', enum: ['OPERATEUR', 'CDA', 'ADMIN'] },
            pack: { type: 'string', enum: ['BASIC', 'GOLD', 'DIAMOND'] },
            statutKYC: { type: 'string', enum: ['EN_ATTENTE', 'EN_COURS', 'VALIDE', 'REJETE'] },
            scoreRisque: { type: 'integer', minimum: 0, maximum: 100 },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ── Dossier ───────────────────────────────────────────
        CreerDossierRequest: {
          type: 'object',
          required: ['typeOperation', 'regimeDouanier', 'descriptionMarchandises', 'categorieProduit', 'quantite', 'poidsTotalKg', 'valeurFOB', 'modeTransport', 'portDestination', 'nomFournisseur', 'paysFournisseur'],
          properties: {
            typeOperation: { type: 'string', enum: ['IMPORTATION', 'EXPORTATION'], example: 'IMPORTATION' },
            regimeDouanier: { type: 'string', enum: ['MISE_A_CONSOMMATION', 'TRANSIT', 'ADMISSION_TEMPORAIRE', 'AUTRE'], example: 'MISE_A_CONSOMMATION' },
            descriptionMarchandises: { type: 'string', example: 'Téléphones mobiles Samsung' },
            categorieProduit: { type: 'string', enum: ['ALIMENTAIRE', 'ELECTRONIQUE', 'TEXTILE', 'INDUSTRIEL', 'AUTRE'] },
            quantite: { type: 'string', example: '500 unités' },
            poidsTotalKg: { type: 'number', example: 250 },
            valeurFOB: { type: 'integer', example: 15000000 },
            modeTransport: { type: 'string', enum: ['MARITIME', 'AERIEN', 'TERRESTRE'] },
            portDestination: { type: 'string', example: 'Lomé' },
            nomFournisseur: { type: 'string', example: 'Samsung Electronics China' },
            paysFournisseur: { type: 'string', example: 'Chine' },
            priorite: { type: 'string', enum: ['STANDARD', 'URGENT'], default: 'STANDARD' },
          },
        },
        Dossier: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            reference: { type: 'string', example: 'SAY-202504-12345' },
            typeOperation: { type: 'string' },
            statut: { type: 'string', enum: ['BROUILLON', 'SOUMIS', 'VALIDE', 'REJETE', 'DEDOUANE', 'LIVRE'] },
            coutEstime: { type: 'integer' },
            coutFinal: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ── Cotation ──────────────────────────────────────────
        SoumettreCotationRequest: {
          type: 'object',
          required: ['montantHT', 'delaiTraitement'],
          properties: {
            montantHT: { type: 'integer', example: 850000 },
            tva: { type: 'number', example: 18 },
            droitsDouane: { type: 'integer', example: 150000 },
            fraisPortuaires: { type: 'integer', example: 75000 },
            delaiTraitement: { type: 'integer', example: 5, description: 'Délai en jours ouvrables' },
            description: { type: 'string', example: 'Dédouanement complet avec assistance documentaire' },
            conditionsPaiement: { type: 'string', example: '50% à la commande' },
          },
        },

        // ── Paiement ──────────────────────────────────────────
        InitierPaiementRequest: {
          type: 'object',
          required: ['cotationId', 'dossierId', 'modePaiement'],
          properties: {
            cotationId: { type: 'string', format: 'uuid' },
            dossierId: { type: 'string', format: 'uuid' },
            modePaiement: { type: 'string', enum: ['MOBILE_MONEY', 'CARTE_BANCAIRE', 'CREDIT_SAYGOO', 'VIREMENT'] },
            numeroPaiement: { type: 'string', example: '90000001' },
            operateurMobile: { type: 'string', enum: ['FLOOZ', 'TMONEY', 'MOOV', 'MTN', 'ORANGE'] },
            typePaiement: { type: 'string', enum: ['COMPLET', 'FRACTIONNE', 'ACOMPTE'], default: 'COMPLET' },
          },
        },

        // ── Transport ─────────────────────────────────────────
        SimulerTransportRequest: {
          type: 'object',
          required: ['distanceKm', 'poidsTonnes'],
          properties: {
            depart: { type: 'string', example: 'Lome' },
            destination: { type: 'string', example: 'Kara' },
            distanceKm: { type: 'number', example: 420 },
            typeCamion: { type: 'string', enum: ['LEGER', 'MOYEN', 'LOURD', 'SEMI_REMORQUE'], default: 'MOYEN' },
            poidsTonnes: { type: 'number', example: 10 },
            valeurMarchandise: { type: 'integer', example: 15000000 },
            niveauRisque: { type: 'string', enum: ['faible', 'moyen', 'eleve'], default: 'moyen' },
            conditions: {
              type: 'object',
              properties: {
                nuit: { type: 'boolean', default: false },
                pluie: { type: 'boolean', default: false },
                chaleur: { type: 'boolean', default: false },
              },
            },
          },
        },

        // ── Réponse générique ─────────────────────────────────
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Erreur serveur' },
            errors: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentification et gestion des comptes' },
      { name: 'KYC', description: 'Vérification d\'identité (Know Your Customer)' },
      { name: 'Dossiers', description: 'Gestion des dossiers de dédouanement' },
      { name: 'Cotations', description: 'Offres des CDA et comparaison' },
      { name: 'Paiements', description: 'Paiement Mobile Money et escrow' },
      { name: 'Tracking', description: 'Suivi logistique en temps réel' },
      { name: 'Transport', description: 'Simulateur de coût de transport' },
      { name: 'Notifications', description: 'SMS, WhatsApp et Email' },
      { name: 'Stockage', description: 'Pack GOLD - Entrepôts et MAD' },
      { name: 'Marketplace', description: 'Pack DIAMOND - Vente et commandes' },
      { name: 'Analytics', description: 'Dashboard et statistiques' },
    ],
  },
  apis: ['./src/modules/**/*.routes.js'],
};

const specs = swaggerJsdoc(options);

module.exports = specs;