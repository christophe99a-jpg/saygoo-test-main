const jwt = require('jsonwebtoken');
const request = require('supertest');

// ── Simulation de Prisma ──────────────────────────────────────────────────────

let mockLivraisons;
let mockSequence;

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));

jest.mock('../src/config/prisma', () => ({
  livraison: {
    findMany: jest.fn(async () => mockLivraisons),
    count: jest.fn(async () => mockLivraisons.length),
    findFirst: jest.fn(async ({ where }) =>
      mockLivraisons.find((l) => l.reference === where.reference) || null
    ),
    findUnique: jest.fn(async ({ where }) =>
      mockLivraisons.find((l) => l.id === where.id || l.reference === where.reference) || null
    ),
    create: jest.fn(async ({ data }) => {
      const livraison = { id: `liv-${mockLivraisons.length + 1}`, ...data };
      mockLivraisons.push(livraison);
      return livraison;
    }),
    update: jest.fn(async ({ where, data }) => {
      const l = mockLivraisons.find((x) => x.id === where.id);
      Object.assign(l, data);
      return l;
    })
  },
  positionGPS: {
    create: jest.fn(async ({ data }) => data),
    findMany: jest.fn(async () => [])
  },
  historiqueLivraison: {
    create: jest.fn(async ({ data }) => data),
    findMany: jest.fn(async () => [])
  },
  $transaction: jest.fn(async (arg) =>
    typeof arg === 'function' ? arg(require('../src/config/prisma')) : Promise.all(arg)
  ),
  $executeRawUnsafe: jest.fn(async () => 0),
  $queryRawUnsafe: jest.fn(async () => [{ nextval: ++mockSequence }]),
  $queryRaw: jest.fn(async () => [{ '?column?': 1 }]),
  $connect: jest.fn(async () => {}),
  $disconnect: jest.fn(async () => {})
}));

const { generateReference } = require('../src/utils/reference');
const app = require('../src/app');

const jeton = (role) =>
  jwt.sign({ sub: 'utilisateur-1', role }, process.env.JWT_ACCESS_SECRET, {
    issuer: 'saygoo-auth', audience: 'saygoo-app', expiresIn: '1h'
  });

const CDA = () => `Bearer ${jeton('CDA')}`;
const CLIENT = () => `Bearer ${jeton('CLIENT')}`;

beforeEach(() => {
  mockSequence = 0;
  mockLivraisons = [{
    id: 'liv-1',
    reference: 'LIV-2026-000001',
    statut: 'EN_TRANSIT',
    destinataire: 'Acme SARL',
    positions: [],
    historique: []
  }];
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Santé du service', () => {
  it('répond sur /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('saygoo-tracking-service');
  });
});

describe('Suivi public', () => {
  it('permet de suivre une livraison sans jeton', async () => {
    const res = await request(app).get('/livraisons/tracker/LIV-2026-000001');
    expect(res.status).toBe(200);
  });

  it('retourne 404 pour une référence inconnue', async () => {
    const res = await request(app).get('/livraisons/tracker/LIV-2026-999999');
    expect(res.status).toBe(404);
  });
});

describe('Routes protégées', () => {
  it('refuse la liste sans jeton', async () => {
    const res = await request(app).get('/livraisons');
    expect(res.status).toBe(401);
  });

  it('accepte la liste avec un jeton valide', async () => {
    const res = await request(app).get('/livraisons').set('Authorization', CLIENT());
    expect(res.status).toBe(200);
  });

  it('refuse la création à un rôle non habilité', async () => {
    const res = await request(app)
      .post('/livraisons')
      .set('Authorization', CLIENT())
      .send({ destinataire: 'Acme' });
    expect(res.status).toBe(403);
  });

  it('refuse le changement de statut à un rôle non habilité', async () => {
    const res = await request(app)
      .patch('/livraisons/liv-1/statut')
      .set('Authorization', CLIENT())
      .send({ statut: 'LIVRE' });
    expect(res.status).toBe(403);
  });

  it('autorise le changement de statut au rôle CDA', async () => {
    const res = await request(app)
      .patch('/livraisons/liv-1/statut')
      .set('Authorization', CDA())
      .send({ statut: 'LIVRE' });
    expect([200, 400]).toContain(res.status); // pas 401 ni 403
  });
});

describe('Génération de référence', () => {
  it('produit le format LIV-ANNEE-NNNNNN', async () => {
    const reference = await generateReference();
    expect(reference).toMatch(/^LIV-\d{4}-\d{6}$/);
  });

  it('ne produit jamais deux fois la même référence en concurrence', async () => {
    // Le défaut corrigé : avec count() + 1, dix appels simultanés
    // lisaient la même valeur et rendaient dix fois le même numéro.
    const references = await Promise.all(
      Array.from({ length: 10 }, () => generateReference())
    );
    expect(new Set(references).size).toBe(10);
  });
});

describe('Confidentialité des erreurs', () => {
  it('ne divulgue jamais le détail technique d’une erreur', async () => {
    const prisma = require('../src/config/prisma');
    prisma.livraison.findUnique.mockRejectedValueOnce(
      new Error('relation "Livraison" does not exist')
    );

    const res = await request(app).get('/livraisons/tracker/LIV-2026-000001');

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Erreur interne.');
    expect(JSON.stringify(res.body)).not.toContain('relation');
  });
});
