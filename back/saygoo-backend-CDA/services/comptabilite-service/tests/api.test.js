const jwt = require('jsonwebtoken');
const request = require('supertest');

// ── Simulation de Prisma ──────────────────────────────────────────────────────
// Les tests valident le routage, l'authentification, les autorisations par rôle
// et les contrôles métier. Aucune base PostgreSQL n'est requise.

const mockComptes = [
  { id: 'c1', numero: '4111', intitule: 'Clients locaux', classe: 'CLASSE_4', sens: 'DEBIT', actif: true, collectif: true },
  { id: 'c2', numero: '7061', intitule: 'Prestations de transit', classe: 'CLASSE_7', sens: 'CREDIT', actif: true, collectif: false },
  { id: 'c3', numero: '4431', intitule: 'TVA facturée', classe: 'CLASSE_4', sens: 'CREDIT', actif: true, collectif: false },
  { id: 'c4', numero: '6052', intitule: 'Carburant', classe: 'CLASSE_6', sens: 'DEBIT', actif: false, collectif: false }
];

const mockJournaux = [
  { id: 'j1', code: 'VE', libelle: 'Journal des ventes', type: 'VENTE', actif: true },
  { id: 'j2', code: 'OD', libelle: 'Opérations diverses', type: 'OPERATIONS_DIVERSES', actif: true }
];

let mockExercices;
let mockEcritures;

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));

jest.mock('../src/config/prisma', () => ({
  compteComptable: {
    findMany: jest.fn(async ({ where } = {}) => {
      if (where?.numero?.in) return mockComptes.filter((c) => where.numero.in.includes(c.numero));
      return mockComptes;
    }),
    findUnique: jest.fn(async ({ where }) =>
      mockComptes.find((c) => c.numero === where.numero || c.id === where.id) || null
    ),
    create: jest.fn(async ({ data }) => ({ id: 'nouveau', actif: true, ...data })),
    update: jest.fn(async ({ where, data }) => ({
      ...mockComptes.find((c) => c.numero === where.numero), ...data
    }))
  },
  journal: {
    findMany: jest.fn(async () => mockJournaux),
    findUnique: jest.fn(async ({ where }) =>
      mockJournaux.find((j) => j.code === where.code) || null
    )
  },
  exercice: {
    findMany: jest.fn(async () => mockExercices),
    // Le contrôleur cherche l'exercice couvrant la date SANS filtrer sur le
    // statut : c'est ce qui lui permet de refuser explicitement un exercice
    // clôturé plutôt que de répondre « aucun exercice ».
    findFirst: jest.fn(async ({ where } = {}) =>
      mockExercices.find((e) => !where?.statut || e.statut === where.statut) || null
    ),
    findUnique: jest.fn(async ({ where }) =>
      mockExercices.find((e) => e.annee === where.annee) || null
    ),
    create: jest.fn(async ({ data }) => ({ id: 'ex-new', statut: 'OUVERT', ...data })),
    update: jest.fn(async ({ where, data }) => ({
      ...mockExercices.find((e) => e.annee === where.annee), ...data
    }))
  },
  ecriture: {
    findMany: jest.fn(async () => mockEcritures),
    count: jest.fn(async ({ where } = {}) =>
      where?.statut === 'BROUILLON'
        ? mockEcritures.filter((e) => e.statut === 'BROUILLON').length
        : mockEcritures.length
    ),
    findUnique: jest.fn(async ({ where }) =>
      mockEcritures.find((e) => e.id === where.id) || null
    ),
    create: jest.fn(async ({ data }) => ({ id: 'ec-new', ...data })),
    update: jest.fn(async ({ where, data }) => ({ id: where.id, ...data })),
    delete: jest.fn(async () => ({}))
  },
  ligneEcriture: {
    findMany: jest.fn(async () => []),
    groupBy: jest.fn(async () => [])
  },
  ajustementComptable: {
    findMany: jest.fn(async () => []),
    findUnique: jest.fn(async () => null),
    create: jest.fn(async ({ data }) => ({ id: 'aj-1', ...data })),
    update: jest.fn(async ({ where, data }) => ({ id: where.id, ...data }))
  },
  $transaction: jest.fn(async (arg) =>
    typeof arg === 'function' ? arg(require('../src/config/prisma')) : Promise.all(arg)
  ),
  $executeRawUnsafe: jest.fn(async () => 0),
  $queryRawUnsafe: jest.fn(async () => [{ nextval: 1 }]),
  $queryRaw: jest.fn(async () => [{ '?column?': 1 }]),
  $connect: jest.fn(async () => {}),
  $disconnect: jest.fn(async () => {})
}));

const app = require('../src/app');

// ── Jetons ────────────────────────────────────────────────────────────────────

const jeton = (role, sub = 'utilisateur-1') =>
  jwt.sign({ sub, role }, process.env.JWT_ACCESS_SECRET, {
    issuer: 'saygoo-auth',
    audience: 'saygoo-app',
    expiresIn: '1h'
  });

const COMPTABLE = () => `Bearer ${jeton('COMPTABLE')}`;
const OPERATEUR = () => `Bearer ${jeton('OPERATEUR_ECONOMIQUE')}`;

const ecritureValide = {
  journalCode: 'VE',
  dateEcriture: '2026-06-15',
  libelle: 'Facture SAY-FAC-2026-0001',
  reference: 'SAY-FAC-2026-0001',
  lignes: [
    { compteNumero: '4111', libelle: 'Client Acme', debit: 2360000, credit: 0, tiersCode: 'CLI-001' },
    { compteNumero: '7061', libelle: 'Transit', debit: 0, credit: 2000000 },
    { compteNumero: '4431', libelle: 'TVA 18%', debit: 0, credit: 360000 }
  ]
};

beforeEach(() => {
  mockExercices = [{
    id: 'ex1', annee: 2026,
    dateDebut: new Date('2026-01-01'), dateFin: new Date('2026-12-31'),
    statut: 'OUVERT'
  }];
  mockEcritures = [];
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Santé du service', () => {
  it('répond sur /health sans authentification', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('saygoo-comptabilite-service');
    expect(res.body.referentiel).toContain('SYSCOHADA');
  });
});

describe('Authentification et autorisations', () => {
  it('refuse un accès sans jeton', async () => {
    const res = await request(app).get('/comptabilite/comptes');
    expect(res.status).toBe(401);
  });

  it('refuse un rôle non comptable', async () => {
    const res = await request(app)
      .get('/comptabilite/comptes')
      .set('Authorization', OPERATEUR());
    expect(res.status).toBe(403);
  });

  it('accepte le rôle COMPTABLE', async () => {
    const res = await request(app)
      .get('/comptabilite/comptes')
      .set('Authorization', COMPTABLE());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(4);
  });
});

describe('Plan de comptes', () => {
  it('déduit la classe du numéro à la création', async () => {
    const res = await request(app)
      .post('/comptabilite/comptes')
      .set('Authorization', COMPTABLE())
      .send({ numero: '6135', intitule: 'Frais de transit portuaire' });

    expect(res.status).toBe(201);
    expect(res.body.data.classe).toBe('CLASSE_6');
  });

  it('refuse un numéro hors classes 1 à 8', async () => {
    const res = await request(app)
      .post('/comptabilite/comptes')
      .set('Authorization', COMPTABLE())
      .send({ numero: '9001', intitule: 'Compte analytique' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('SYSCOHADA');
  });

  it('refuse un compte déjà existant', async () => {
    const res = await request(app)
      .post('/comptabilite/comptes')
      .set('Authorization', COMPTABLE())
      .send({ numero: '4111', intitule: 'Doublon' });

    expect(res.status).toBe(409);
  });
});

describe('Création d’écritures', () => {
  it('accepte une écriture équilibrée', async () => {
    const res = await request(app)
      .post('/comptabilite/ecritures')
      .set('Authorization', COMPTABLE())
      .send(ecritureValide);

    expect(res.status).toBe(201);
    expect(res.body.data.statut).toBeUndefined(); // brouillon par défaut côté base
    expect(Number(res.body.data.totalDebit)).toBe(2360000);
  });

  it('refuse une écriture déséquilibrée', async () => {
    const res = await request(app)
      .post('/comptabilite/ecritures')
      .set('Authorization', COMPTABLE())
      .send({
        ...ecritureValide,
        lignes: [
          { compteNumero: '4111', libelle: 'a', debit: 2360000, credit: 0 },
          { compteNumero: '7061', libelle: 'b', debit: 0, credit: 2000000 }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.erreurs.join(' ')).toContain('déséquilibrée');
  });

  it('refuse un compte inconnu', async () => {
    const res = await request(app)
      .post('/comptabilite/ecritures')
      .set('Authorization', COMPTABLE())
      .send({
        ...ecritureValide,
        lignes: [
          { compteNumero: '9999', libelle: 'a', debit: 100, credit: 0 },
          { compteNumero: '7061', libelle: 'b', debit: 0, credit: 100 }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('9999');
  });

  it('refuse un compte désactivé', async () => {
    const res = await request(app)
      .post('/comptabilite/ecritures')
      .set('Authorization', COMPTABLE())
      .send({
        ...ecritureValide,
        lignes: [
          { compteNumero: '6052', libelle: 'a', debit: 100, credit: 0 },
          { compteNumero: '7061', libelle: 'b', debit: 0, credit: 100 }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('désactivés');
  });

  it('refuse une date hors exercice', async () => {
    const res = await request(app)
      .post('/comptabilite/ecritures')
      .set('Authorization', COMPTABLE())
      .send({ ...ecritureValide, dateEcriture: '2027-03-01' });

    expect(res.status).toBe(400);
  });

  it('refuse toute écriture sur un exercice clôturé', async () => {
    mockExercices[0].statut = 'CLOTURE';

    const res = await request(app)
      .post('/comptabilite/ecritures')
      .set('Authorization', COMPTABLE())
      .send(ecritureValide);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('clôturé');
  });
});

describe('Immuabilité des écritures validées', () => {
  it('refuse la suppression d’une écriture validée', async () => {
    mockEcritures.push({ id: 'ec1', statut: 'VALIDEE', numero: 'VE-2026-000001' });

    const res = await request(app)
      .delete('/comptabilite/ecritures/ec1')
      .set('Authorization', COMPTABLE());

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('extourne');
  });

  it('autorise la suppression d’un brouillon', async () => {
    mockEcritures.push({ id: 'ec2', statut: 'BROUILLON' });

    const res = await request(app)
      .delete('/comptabilite/ecritures/ec2')
      .set('Authorization', COMPTABLE());

    expect(res.status).toBe(200);
  });

  it('refuse d’extourner un brouillon', async () => {
    mockEcritures.push({
      id: 'ec3', statut: 'BROUILLON', lignes: [],
      journal: mockJournaux[0], exercice: mockExercices[0]
    });

    const res = await request(app)
      .post('/comptabilite/ecritures/ec3/extourner')
      .set('Authorization', COMPTABLE())
      .send({ motif: 'erreur de saisie' });

    expect(res.status).toBe(409);
  });

  it('exige un motif pour extourner', async () => {
    const res = await request(app)
      .post('/comptabilite/ecritures/ec1/extourner')
      .set('Authorization', COMPTABLE())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('motif');
  });
});

describe('Clôture d’exercice', () => {
  it('refuse la clôture s’il reste des brouillons', async () => {
    mockEcritures.push({ id: 'ec4', statut: 'BROUILLON' });

    const res = await request(app)
      .post('/comptabilite/exercices/2026/cloturer')
      .set('Authorization', COMPTABLE());

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('brouillon');
  });

  it('clôture un exercice sans brouillon', async () => {
    const res = await request(app)
      .post('/comptabilite/exercices/2026/cloturer')
      .set('Authorization', COMPTABLE());

    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe('CLOTURE');
  });

  it('refuse de clôturer deux fois', async () => {
    mockExercices[0].statut = 'CLOTURE';

    const res = await request(app)
      .post('/comptabilite/exercices/2026/cloturer')
      .set('Authorization', COMPTABLE());

    expect(res.status).toBe(409);
  });
});

describe('Ajustements comptables', () => {
  it('refuse un montant négatif', async () => {
    const res = await request(app)
      .post('/comptabilite/ajustements')
      .set('Authorization', COMPTABLE())
      .send({ clientId: 'CLI-001', sens: 'CREDIT', montant: -5000, motif: 'geste commercial' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('positif');
  });

  it('crée une demande avec une référence SAY-AJU', async () => {
    const res = await request(app)
      .post('/comptabilite/ajustements')
      .set('Authorization', COMPTABLE())
      .send({ clientId: 'CLI-001', sens: 'CREDIT', montant: 50000, motif: 'geste commercial' });

    expect(res.status).toBe(201);
    expect(res.body.data.reference).toMatch(/^SAY-AJU-\d{8}-\d{5}$/);
  });
});

describe('Export comptable', () => {
  it('renvoie un CSV avec BOM et séparateur point-virgule', async () => {
    const res = await request(app)
      .get('/comptabilite/export/ecritures')
      .set('Authorization', COMPTABLE());

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text.charCodeAt(0)).toBe(0xFEFF);
    expect(res.text).toContain('Journal;Numero;Date');
  });
});

describe('Balance générale', () => {
  it('signale une comptabilité équilibrée', async () => {
    const res = await request(app)
      .get('/comptabilite/balance')
      .set('Authorization', COMPTABLE());

    expect(res.status).toBe(200);
    expect(res.body.data.totaux.equilibree).toBe(true);
  });
});
