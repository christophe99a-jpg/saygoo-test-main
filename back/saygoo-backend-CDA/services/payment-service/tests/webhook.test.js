const crypto = require('crypto');
const request = require('supertest');

// ── Simulation de Prisma ──────────────────────────────────────────────────────
// Aucune connexion PostgreSQL n'est nécessaire : on remplace le client Prisma
// par un jeu de données en mémoire. Les tests restent rapides et ne touchent
// jamais à la base de développement.

let mockPaiements;
let mockTentatives;

jest.mock('../src/config/prisma', () => ({
  paiement: {
    findFirst: jest.fn(async ({ where }) =>
      mockPaiements.find((p) => p.reference === where.reference) || null
    ),
    update: jest.fn(async ({ where, data }) => {
      const p = mockPaiements.find((x) => x.id === where.id);
      Object.assign(p, data);
      return p;
    })
  },
  tentativePaiement: {
    create: jest.fn(async ({ data }) => {
      mockTentatives.push(data);
      return data;
    })
  },
  // $transaction reçoit un tableau de promesses déjà lancées par Prisma.
  $transaction: jest.fn(async (operations) => Promise.all(operations)),
  $queryRaw: jest.fn(async () => [{ '?column?': 1 }]),
  $connect: jest.fn(async () => {}),
  $disconnect: jest.fn(async () => {})
}));

// Le logger écrit sur la sortie standard : on le neutralise pour garder
// un rapport de test lisible.
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const app = require('../src/app');

// ── Utilitaires ───────────────────────────────────────────────────────────────

const SECRET = process.env.PAYGATE_WEBHOOK_SECRET;
const REFERENCE = 'SAY-PAY-20260919-00001';

const maintenant = () => Math.floor(Date.now() / 1000);

const signer = (corps, horodatage) =>
  crypto.createHmac('sha256', SECRET).update(`${horodatage}.${corps}`).digest('hex');

/** Envoie un webhook correctement signé. */
const envoyerSigne = (charge, horodatage = maintenant()) => {
  const corps = JSON.stringify(charge);
  return request(app)
    .post('/paiements/webhook')
    .set('Content-Type', 'application/json')
    .set('x-paygate-timestamp', String(horodatage))
    .set('x-paygate-signature', signer(corps, horodatage))
    .send(corps);
};

beforeEach(() => {
  mockPaiements = [
    { id: 'p1', reference: REFERENCE, statut: 'EN_COURS', numeroTransaction: null }
  ];
  mockTentatives = [];
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /paiements/webhook — vérification de signature', () => {

  it('rejette une requête sans signature', async () => {
    const res = await request(app)
      .post('/paiements/webhook')
      .send({ reference: REFERENCE, statut: 'SUCCESS' });

    expect(res.status).toBe(401);
    expect(mockPaiements[0].statut).toBe('EN_COURS');
  });

  it('rejette une signature invalide', async () => {
    const corps = JSON.stringify({ reference: REFERENCE, statut: 'SUCCESS' });
    const res = await request(app)
      .post('/paiements/webhook')
      .set('Content-Type', 'application/json')
      .set('x-paygate-timestamp', String(maintenant()))
      .set('x-paygate-signature', 'f'.repeat(64))
      .send(corps);

    expect(res.status).toBe(401);
    expect(mockPaiements[0].statut).toBe('EN_COURS');
  });

  it('rejette un webhook sans horodatage', async () => {
    const corps = JSON.stringify({ reference: REFERENCE, statut: 'SUCCESS' });
    const res = await request(app)
      .post('/paiements/webhook')
      .set('Content-Type', 'application/json')
      .set('x-paygate-signature', signer(corps, maintenant()))
      .send(corps);

    expect(res.status).toBe(401);
    expect(mockPaiements[0].statut).toBe('EN_COURS');
  });

  it('rejette un webhook rejoué hors de la fenêtre de 5 minutes', async () => {
    const res = await envoyerSigne(
      { reference: REFERENCE, statut: 'SUCCESS' },
      maintenant() - 3600
    );

    expect(res.status).toBe(401);
    expect(mockPaiements[0].statut).toBe('EN_COURS');
  });

  it('rejette une signature valide pour un corps différent', async () => {
    const corpsSigne = JSON.stringify({ reference: REFERENCE, statut: 'FAILED' });
    const ts = maintenant();
    const res = await request(app)
      .post('/paiements/webhook')
      .set('Content-Type', 'application/json')
      .set('x-paygate-timestamp', String(ts))
      .set('x-paygate-signature', signer(corpsSigne, ts))
      .send(JSON.stringify({ reference: REFERENCE, statut: 'SUCCESS' }));

    expect(res.status).toBe(401);
    expect(mockPaiements[0].statut).toBe('EN_COURS');
  });
});

describe('POST /paiements/webhook — traitement', () => {

  it('accepte un webhook signé et confirme le paiement', async () => {
    const res = await envoyerSigne({
      reference: REFERENCE,
      statut: 'SUCCESS',
      numeroTransaction: 'PG-784521'
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPaiements[0].statut).toBe('SUCCES');
    expect(mockPaiements[0].numeroTransaction).toBe('PG-784521');
    expect(mockPaiements[0].datePaiement).toBeInstanceOf(Date);
    expect(mockTentatives).toHaveLength(1);
  });

  it('marque le paiement en échec sur un statut non SUCCESS', async () => {
    const res = await envoyerSigne({ reference: REFERENCE, statut: 'FAILED' });

    expect(res.status).toBe(200);
    expect(mockPaiements[0].statut).toBe('ECHEC');
    expect(mockPaiements[0].datePaiement).toBeNull();
  });

  it('retourne 404 pour une référence inconnue', async () => {
    const res = await envoyerSigne({ reference: 'SAY-PAY-INEXISTANT', statut: 'SUCCESS' });

    expect(res.status).toBe(404);
  });

  it('retourne 400 si la référence est absente', async () => {
    const res = await envoyerSigne({ statut: 'SUCCESS' });

    expect(res.status).toBe(400);
  });
});

describe('POST /paiements/webhook — idempotence', () => {

  it('ignore un rejeu sur un paiement déjà confirmé', async () => {
    mockPaiements[0].statut = 'SUCCES';

    const res = await envoyerSigne({ reference: REFERENCE, statut: 'FAILED' });

    expect(res.status).toBe(200);
    expect(res.body.idempotent).toBe(true);
    expect(mockPaiements[0].statut).toBe('SUCCES');
    expect(mockTentatives).toHaveLength(0);
  });

  it('ignore un rejeu sur un paiement annulé', async () => {
    mockPaiements[0].statut = 'ANNULE';

    const res = await envoyerSigne({ reference: REFERENCE, statut: 'SUCCESS' });

    expect(res.status).toBe(200);
    expect(res.body.idempotent).toBe(true);
    expect(mockPaiements[0].statut).toBe('ANNULE');
  });

  it('ne crée pas de doublon dans TentativePaiement sur double envoi', async () => {
    await envoyerSigne({ reference: REFERENCE, statut: 'SUCCESS' });
    await envoyerSigne({ reference: REFERENCE, statut: 'SUCCESS' });

    expect(mockTentatives).toHaveLength(1);
  });
});