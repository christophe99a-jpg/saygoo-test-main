const jwt = require('jsonwebtoken');
const request = require('supertest');

/**
 * Régression : le jeton d'auth-service nomme l'organisation « organisationId »,
 * mais les contrôleurs lisaient « orgId ». Le filtrage par organisation ne
 * s'appliquait donc jamais, et le Compte Logistique Numérique plantait à
 * chaque appel.
 */

let mockComptes;

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));

jest.mock('../src/config/prisma', () => {
  const client = {
    paiement: {
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0)
    },
    compteLogistique: {
      findUnique: jest.fn(async ({ where }) =>
        mockComptes.find((c) => c.organisationId === where.organisationId) || null
      ),
      create: jest.fn(async ({ data }) => {
        const c = { id: `c${mockComptes.length + 1}`, solde: 0, soldeReserve: 0, devise: 'XOF', ...data };
        mockComptes.push(c);
        return c;
      })
    }
  };
  client.$transaction = jest.fn(async (arg) =>
    typeof arg === 'function' ? arg(client) : Promise.all(arg)
  );
  return client;
});

const app = require('../src/app');
const prisma = require('../src/config/prisma');

/** Jeton construit exactement comme auth-service le fait. */
const jetonAuthService = (charge) =>
  `Bearer ${jwt.sign({ sub: 'user-1', role: 'CDA', ...charge }, process.env.JWT_ACCESS_SECRET, {
    issuer: 'saygoo-auth', audience: 'saygoo-app', expiresIn: '1h'
  })}`;

beforeEach(() => {
  mockComptes = [];
  jest.clearAllMocks();
});

describe('Isolation par organisation', () => {
  it('filtre la liste des paiements sur l’organisation du jeton', async () => {
    await request(app).get('/paiements')
      .set('Authorization', jetonAuthService({ organisationId: 'ORG-1' }));

    const appel = prisma.paiement.findMany.mock.calls[0][0];
    expect(appel.where.organisationId).toBe('ORG-1');
  });

  it('accepte encore l’ancien nom orgId', async () => {
    await request(app).get('/paiements')
      .set('Authorization', jetonAuthService({ orgId: 'ORG-2' }));

    expect(prisma.paiement.findMany.mock.calls[0][0].where.organisationId).toBe('ORG-2');
  });
});

describe('Compte Logistique Numérique', () => {
  it('renvoie le solde de l’organisation du jeton', async () => {
    mockComptes.push({ id: 'c1', organisationId: 'ORG-1', solde: 2500000, soldeReserve: 300000, devise: 'XOF' });

    const res = await request(app).get('/compte/solde')
      .set('Authorization', jetonAuthService({ organisationId: 'ORG-1' }));

    expect(res.status).toBe(200);
    expect(res.body.data.solde).toBe(2500000);
    expect(prisma.compteLogistique.findUnique).toHaveBeenCalledWith({ where: { organisationId: 'ORG-1' } });
  });

  it('répond 403 et non 500 pour un utilisateur sans organisation', async () => {
    const res = await request(app).get('/compte/solde')
      .set('Authorization', jetonAuthService({}));

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('aucune organisation');
    // Prisma n'est même pas interrogé : plus d'appel avec organisationId undefined.
    expect(prisma.compteLogistique.findUnique).not.toHaveBeenCalled();
  });

  it('ne divulgue jamais le détail d’une erreur Prisma', async () => {
    prisma.compteLogistique.findUnique.mockRejectedValueOnce(
      new Error('Invalid `prisma.compteLogistique.findUnique()` invocation')
    );

    const res = await request(app).get('/compte/solde')
      .set('Authorization', jetonAuthService({ organisationId: 'ORG-1' }));

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Erreur interne.');
    expect(JSON.stringify(res.body)).not.toContain('prisma');
  });
});
