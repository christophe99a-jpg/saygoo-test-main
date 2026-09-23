/**
 * Tests de l'inscription publique.
 *
 * Le contrôleur est appelé directement, avec un Prisma simulé : aucune base
 * n'est nécessaire, et le service n'a pas besoin d'être démarré.
 */

let mockUtilisateurs;

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));

jest.mock('../src/config/prisma', () => ({
  utilisateur: {
    findUnique: jest.fn(async ({ where }) =>
      mockUtilisateurs.find((u) => u.email === where.email) || null),
    create: jest.fn(async ({ data }) => {
      const u = { ...data };
      mockUtilisateurs.push(u);
      return u;
    })
  },
  jetonUsage: { create: jest.fn(async ({ data }) => data) },
  journalAuth: { create: jest.fn(async ({ data }) => data) }
}));

const prisma = require('../src/config/prisma');
const { register } = require('../src/controllers/auth.controller');

/** Réponse Express minimale qui enregistre ce qu'on lui envoie. */
const reponse = () => {
  const res = {};
  res.status = jest.fn((code) => { res.statusCode = code; return res; });
  res.json = jest.fn((corps) => { res.corps = corps; return res; });
  return res;
};

const inscrire = async (corps) => {
  const res = reponse();
  await register({ body: corps, ip: '127.0.0.1', headers: {} }, res);
  return res;
};

const corpsValide = (extra = {}) => ({
  email: 'Nouveau@Import.tg',
  motDePasse: 'motdepasse-solide',
  prenom: 'Awa',
  nom: 'Mensah',
  role: 'OPERATEUR_ECONOMIQUE',
  raisonSociale: 'ABC IMPORT SARL',
  ...extra
});

beforeEach(() => {
  mockUtilisateurs = [];
  jest.clearAllMocks();
});

describe('Inscription — organisation', () => {
  it('fait du compte sa propre organisation', async () => {
    const res = await inscrire(corpsValide());

    expect(res.statusCode).toBe(201);
    const cree = prisma.utilisateur.create.mock.calls[0][0].data;
    expect(cree.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(cree.organisationId).toBe(cree.id);
  });

  it('ignore une organisation fournie par le client', async () => {
    // Sans ce garde-fou, on pourrait s'inscrire dans l'organisation d'une
    // autre société et en consulter les paiements.
    await inscrire(corpsValide({ organisationId: 'ORG-DE-LA-CONCURRENCE' }));

    const cree = prisma.utilisateur.create.mock.calls[0][0].data;
    expect(cree.organisationId).not.toBe('ORG-DE-LA-CONCURRENCE');
    expect(cree.organisationId).toBe(cree.id);
  });

  it('donne une organisation distincte à chaque compte', async () => {
    await inscrire(corpsValide({ email: 'a@test.tg' }));
    await inscrire(corpsValide({ email: 'b@test.tg' }));

    const [a, b] = prisma.utilisateur.create.mock.calls.map((c) => c[0].data);
    expect(a.organisationId).not.toBe(b.organisationId);
  });
});

describe('Inscription — rôles', () => {
  it.each(['OPERATEUR_ECONOMIQUE', 'CDA', 'CONSIGNATAIRE', 'GESTIONNAIRE_ENTREPOT', 'TRANSPORTEUR'])(
    'accepte le rôle métier %s', async (role) => {
      const res = await inscrire(corpsValide({ role }));
      expect(res.statusCode).toBe(201);
    });

  it.each(['SUPER_ADMIN', 'ADMIN', 'COMPTABLE', 'MANAGER'])(
    'refuse le rôle du personnel %s', async (role) => {
      const res = await inscrire(corpsValide({ role }));
      expect(res.statusCode).toBe(400);
      expect(prisma.utilisateur.create).not.toHaveBeenCalled();
    });

  it('refuse un rôle inexistant sans laisser fuir l’erreur Prisma', async () => {
    const res = await inscrire(corpsValide({ role: 'PIRATE' }));
    expect(res.statusCode).toBe(400);
    expect(prisma.utilisateur.create).not.toHaveBeenCalled();
  });
});

describe('Inscription — comportement conservé', () => {
  it('crée le compte en attente de validation', async () => {
    await inscrire(corpsValide());
    expect(prisma.utilisateur.create.mock.calls[0][0].data.statut).toBe('EN_ATTENTE_VALIDATION');
  });

  it('refuse un email déjà utilisé', async () => {
    await inscrire(corpsValide());
    const res = await inscrire(corpsValide());
    expect(res.statusCode).toBe(409);
  });

  it('normalise l’email', async () => {
    await inscrire(corpsValide());
    expect(prisma.utilisateur.create.mock.calls[0][0].data.email).toBe('nouveau@import.tg');
  });

  it('ne divulgue jamais le détail d’une erreur', async () => {
    prisma.utilisateur.create.mockRejectedValueOnce(new Error('relation "Utilisateur" does not exist'));
    const res = await inscrire(corpsValide());
    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.corps)).not.toContain('relation');
  });
});
