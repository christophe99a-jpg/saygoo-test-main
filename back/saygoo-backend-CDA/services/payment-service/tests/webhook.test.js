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
  $transaction: jest.fn(async (arg) =>
    typeof arg === 'function' ? arg(require('../src/config/prisma')) : Promise.all(arg)
  ),
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
    { id: 'p1', reference: REFERENCE, statut: 'EN_ATTENTE_CONFIRMATION', numeroTransaction: null, prestataire: 'PAYGATE_GLOBAL' }
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
    expect(mockPaiements[0].statut).toBe('EN_ATTENTE_CONFIRMATION');
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
    expect(mockPaiements[0].statut).toBe('EN_ATTENTE_CONFIRMATION');
  });

  it('rejette un webhook sans horodatage', async () => {
    const corps = JSON.stringify({ reference: REFERENCE, statut: 'SUCCESS' });
    const res = await request(app)
      .post('/paiements/webhook')
      .set('Content-Type', 'application/json')
      .set('x-paygate-signature', signer(corps, maintenant()))
      .send(corps);

    expect(res.status).toBe(401);
    expect(mockPaiements[0].statut).toBe('EN_ATTENTE_CONFIRMATION');
  });

  it('rejette un webhook rejoué hors de la fenêtre de 5 minutes', async () => {
    const res = await envoyerSigne(
      { reference: REFERENCE, statut: 'SUCCESS' },
      maintenant() - 3600
    );

    expect(res.status).toBe(401);
    expect(mockPaiements[0].statut).toBe('EN_ATTENTE_CONFIRMATION');
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
    expect(mockPaiements[0].statut).toBe('EN_ATTENTE_CONFIRMATION');
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
    expect(mockPaiements[0].statut).toBe('CONFIRME');
    expect(mockPaiements[0].numeroTransaction).toBe('PG-784521');
    expect(mockPaiements[0].datePaiement).toBeInstanceOf(Date);
    expect(mockTentatives).toHaveLength(1);
  });

  it('marque le paiement en échec sur un statut non SUCCESS', async () => {
    const res = await envoyerSigne({ reference: REFERENCE, statut: 'FAILED' });

    expect(res.status).toBe(200);
    expect(mockPaiements[0].statut).toBe('ECHEC');
    expect(mockPaiements[0].datePaiement).toBeUndefined();
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

  it('ignore un webhook sur un paiement rapproché', async () => {
    // Le cas réel : PayGate rejoue un échec après que le comptable
    // a rapproché le paiement. Le rapprochement ne doit pas être défait.
    mockPaiements[0].statut = 'RAPPROCHE';

    const res = await envoyerSigne({ reference: REFERENCE, statut: 'FAILED' });

    expect(res.status).toBe(200);
    expect(res.body.idempotent).toBe(true);
    expect(mockPaiements[0].statut).toBe('RAPPROCHE');
    expect(mockTentatives).toHaveLength(0);
  });

  it('refuse de faire échouer un paiement déjà confirmé', async () => {
    // CONFIRME n'est pas figé (il peut encore être rapproché), mais la
    // machine à états interdit CONFIRME -> ECHEC.
    mockPaiements[0].statut = 'CONFIRME';

    const res = await envoyerSigne({ reference: REFERENCE, statut: 'FAILED' });

    expect(res.status).toBe(200);
    expect(res.body.ignore).toBe(true);
    expect(mockPaiements[0].statut).toBe('CONFIRME');
    expect(mockTentatives).toHaveLength(0);
  });

  it('ignore un statut prestataire inconnu sans rien modifier', async () => {
    const res = await envoyerSigne({ reference: REFERENCE, statut: 'STATUT_BIZARRE' });

    expect(res.status).toBe(200);
    expect(res.body.ignore).toBe(true);
    expect(mockPaiements[0].statut).toBe('EN_ATTENTE_CONFIRMATION');
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