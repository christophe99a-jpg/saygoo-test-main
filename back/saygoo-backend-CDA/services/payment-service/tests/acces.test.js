const jwt = require('jsonwebtoken');
const request = require('supertest');

/**
 * Règles d'accès : le paiement appartient au client qui paie, le CDA qui
 * l'a initié le suit, le personnel SAYGOO voit tout, les autres rien.
 */

let mockPaiements;
let mockTentatives;
let mockSequence;

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));

jest.mock('../src/config/prisma', () => {
  const client = {
    paiement: {
      create: jest.fn(async ({ data }) => {
        const p = { id: `p${mockPaiements.length + 1}`, createdAt: new Date(), ...data };
        mockPaiements.push(p);
        return p;
      }),
      update: jest.fn(async ({ where, data }) => {
        const p = mockPaiements.find((x) => x.id === where.id);
        Object.assign(p, data);
        return { ...p };
      }),
      findUnique: jest.fn(async ({ where, include }) => {
        const p = mockPaiements.find((x) => x.id === where.id);
        if (!p) return null;
        return include?.tentatives ? { ...p, tentatives: [] } : { ...p };
      }),
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      groupBy: jest.fn(async () => [])
    },
    tentativePaiement: {
      create: jest.fn(async ({ data }) => { mockTentatives.push(data); return data; })
    },
    $executeRawUnsafe: jest.fn(async () => 0),
    $queryRawUnsafe: jest.fn(async () => [{ valeur: ++mockSequence }])
  };
  client.$transaction = jest.fn(async (arg) =>
    typeof arg === 'function' ? arg(client) : Promise.all(arg)
  );
  return client;
});

const app = require('../src/app');
const prisma = require('../src/config/prisma');
const {
  filtreAcces,
  peutAcceder,
  organisationsDuPaiement
} = require('../src/services/acces');

const jeton = (role, organisationId) =>
  `Bearer ${jwt.sign({ sub: 'u', role, organisationId }, process.env.JWT_ACCESS_SECRET, {
    issuer: 'saygoo-auth', audience: 'saygoo-app', expiresIn: '1h'
  })}`;

const IMPORTATEUR_A = () => jeton('OPERATEUR_ECONOMIQUE', 'ORG-A');
const IMPORTATEUR_B = () => jeton('OPERATEUR_ECONOMIQUE', 'ORG-B');
const CDA_1 = () => jeton('CDA', 'ORG-CDA-1');
const CDA_2 = () => jeton('CDA', 'ORG-CDA-2');
const COMPTABLE = () => jeton('COMPTABLE');
const SANS_ORGANISATION = () => jeton('CDA');

/** Paiement de l'importateur A, suivi par le CDA 1. */
const paiementDeA = (extra = {}) => {
  const p = {
    id: `p${mockPaiements.length + 1}`,
    reference: 'SAY-PAY-20260921-00001',
    clientNom: 'ABC IMPORT', montant: 500000, methode: 'FLOOZ',
    statut: 'EN_ATTENTE_CONFIRMATION',
    organisationId: 'ORG-A',
    suiviParOrganisationId: 'ORG-CDA-1',
    createdAt: new Date(),
    ...extra
  };
  mockPaiements.push(p);
  return p;
};

beforeEach(() => {
  mockPaiements = [];
  mockTentatives = [];
  mockSequence = 0;
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Règles d’accès (unitaires)', () => {
  const p = { organisationId: 'ORG-A', suiviParOrganisationId: 'ORG-CDA-1' };

  it('donne accès au client propriétaire', () => {
    expect(peutAcceder({ role: 'OPERATEUR_ECONOMIQUE', orgId: 'ORG-A' }, p)).toBe(true);
  });

  it('donne accès au CDA qui suit', () => {
    expect(peutAcceder({ role: 'CDA', orgId: 'ORG-CDA-1' }, p)).toBe(true);
  });

  it('refuse l’accès à une autre organisation', () => {
    expect(peutAcceder({ role: 'OPERATEUR_ECONOMIQUE', orgId: 'ORG-B' }, p)).toBe(false);
    expect(peutAcceder({ role: 'CDA', orgId: 'ORG-CDA-2' }, p)).toBe(false);
  });

  it('refuse l’accès à un utilisateur sans organisation', () => {
    expect(peutAcceder({ role: 'CDA' }, p)).toBe(false);
  });

  it('donne accès à tout le personnel SAYGOO', () => {
    for (const role of ['SUPER_ADMIN', 'ADMIN', 'COMPTABLE', 'MANAGER']) {
      expect(peutAcceder({ role }, p)).toBe(true);
    }
  });

  it('ne produit jamais de filtre vide pour un utilisateur sans organisation', () => {
    // Un filtre vide renverrait TOUS les paiements : c'est la fuite à éviter.
    expect(() => filtreAcces({ role: 'CDA' })).toThrow();
  });

  it('ne filtre pas pour le personnel', () => {
    expect(filtreAcces({ role: 'COMPTABLE' })).toEqual({});
  });
});

describe('Rattachement à la création', () => {
  it('importateur : le paiement est à lui, sans suivi', () => {
    expect(organisationsDuPaiement({ role: 'OPERATEUR_ECONOMIQUE', orgId: 'ORG-A' }, {}))
      .toEqual({ organisationId: 'ORG-A', suiviParOrganisationId: null });
  });

  it('importateur : ne peut pas payer au nom d’un autre', () => {
    // Le client ne choisit pas son organisation : elle vient de son jeton.
    expect(organisationsDuPaiement(
      { role: 'OPERATEUR_ECONOMIQUE', orgId: 'ORG-A' },
      { clientOrganisationId: 'ORG-B' }
    ).organisationId).toBe('ORG-A');
  });

  it('CDA : le paiement est au client, le CDA le suit', () => {
    expect(organisationsDuPaiement({ role: 'CDA', orgId: 'ORG-CDA-1' }, { clientOrganisationId: 'ORG-A' }))
      .toEqual({ organisationId: 'ORG-A', suiviParOrganisationId: 'ORG-CDA-1' });
  });

  it('personnel : le paiement est au client, sans suivi', () => {
    expect(organisationsDuPaiement({ role: 'COMPTABLE' }, { clientOrganisationId: 'ORG-A' }))
      .toEqual({ organisationId: 'ORG-A', suiviParOrganisationId: null });
  });
});

describe('Initiation via l’API', () => {
  const corps = (extra = {}) => ({
    clientId: 'ORG-A', clientNom: 'ABC IMPORT', montant: 500000, methode: 'FLOOZ', ...extra
  });

  it('autorise désormais l’importateur à payer lui-même', async () => {
    // La route autorisait un rôle 'CLIENT' inexistant : l'importateur recevait 403.
    const res = await request(app).post('/paiements').set('Authorization', IMPORTATEUR_A()).send(corps());
    expect(res.status).toBe(201);
    expect(res.body.data.paiement.organisationId).toBe('ORG-A');
    expect(res.body.data.paiement.suiviParOrganisationId).toBeNull();
  });

  it('rattache un paiement initié par un CDA au client et au CDA', async () => {
    const res = await request(app).post('/paiements').set('Authorization', CDA_1())
      .send(corps({ clientOrganisationId: 'ORG-A' }));
    expect(res.body.data.paiement.organisationId).toBe('ORG-A');
    expect(res.body.data.paiement.suiviParOrganisationId).toBe('ORG-CDA-1');
  });

  it('refuse un paiement sans organisation cliente identifiable', async () => {
    const res = await request(app).post('/paiements').set('Authorization', CDA_1())
      .send({ clientNom: 'Inconnu', montant: 1000, methode: 'FLOOZ', clientId: undefined });
    expect(res.status).toBe(400);
  });

  it('refuse un CDA sans organisation', async () => {
    const res = await request(app).post('/paiements').set('Authorization', SANS_ORGANISATION())
      .send(corps({ clientOrganisationId: 'ORG-A' }));
    expect(res.status).toBe(403);
    expect(mockPaiements).toHaveLength(0);
  });
});

describe('Consultation d’un paiement', () => {
  it.each([
    ['le client propriétaire', IMPORTATEUR_A, 200],
    ['le CDA qui le suit', CDA_1, 200],
    ['le comptable SAYGOO', COMPTABLE, 200],
    ['un autre importateur', IMPORTATEUR_B, 404],
    ['un autre CDA', CDA_2, 404]
  ])('%s → %i', async (_, qui, attendu) => {
    const p = paiementDeA();
    const res = await request(app).get(`/paiements/${p.id}`).set('Authorization', qui());
    expect(res.status).toBe(attendu);
  });

  it('répond comme pour un paiement inexistant, sans révéler qu’il existe', async () => {
    const p = paiementDeA();
    const etranger = await request(app).get(`/paiements/${p.id}`).set('Authorization', IMPORTATEUR_B());
    const inexistant = await request(app).get('/paiements/inexistant').set('Authorization', IMPORTATEUR_B());
    expect(etranger.status).toBe(inexistant.status);
    expect(etranger.body).toEqual(inexistant.body);
  });

  it('protège aussi la timeline', async () => {
    const p = paiementDeA();
    const res = await request(app).get(`/paiements/${p.id}/timeline`).set('Authorization', IMPORTATEUR_B());
    expect(res.status).toBe(404);
  });

  it('protège aussi le reçu', async () => {
    const p = paiementDeA({ statut: 'CONFIRME' });
    const res = await request(app).get(`/paiements/${p.id}/recu`).set('Authorization', IMPORTATEUR_B());
    expect(res.status).toBe(404);
  });
});

describe('Actions sur un paiement', () => {
  it('interdit à un CDA de confirmer un paiement qu’il ne suit pas', async () => {
    const p = paiementDeA();
    const res = await request(app).patch(`/paiements/${p.id}/confirmer`)
      .set('Authorization', CDA_2()).send({});
    expect(res.status).toBe(404);
    expect(p.statut).toBe('EN_ATTENTE_CONFIRMATION');
  });

  it('autorise le CDA qui le suit à le confirmer', async () => {
    const p = paiementDeA();
    const res = await request(app).patch(`/paiements/${p.id}/confirmer`)
      .set('Authorization', CDA_1()).send({});
    expect(res.status).toBe(200);
    expect(p.statut).toBe('CONFIRME');
  });
});

describe('Listes', () => {
  it('répond 403 à un utilisateur sans organisation, au lieu de tout lui montrer', async () => {
    const res = await request(app).get('/paiements').set('Authorization', SANS_ORGANISATION());
    expect(res.status).toBe(403);
    expect(prisma.paiement.findMany).not.toHaveBeenCalled();
  });

  it('applique le filtre aux statistiques', async () => {
    await request(app).get('/paiements/statistiques').set('Authorization', CDA_1());
    const where = prisma.paiement.groupBy.mock.calls[0][0].where;
    expect(where.OR).toContainEqual({ suiviParOrganisationId: 'ORG-CDA-1' });
  });

  it('ne filtre pas pour le personnel SAYGOO', async () => {
    await request(app).get('/paiements').set('Authorization', COMPTABLE());
    expect(prisma.paiement.findMany.mock.calls[0][0].where.OR).toBeUndefined();
  });
});
