const jwt = require('jsonwebtoken');
const request = require('supertest');

// ── Simulation de Prisma ──────────────────────────────────────────────────────

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
        if (include?.tentatives) {
          return { ...p, tentatives: mockTentatives.filter((t) => t.paiementId === p.id) };
        }
        return { ...p };
      }),
      findFirst: jest.fn(async ({ where }) =>
        mockPaiements.find((x) => x.reference === where.reference) || null
      ),
      findMany: jest.fn(async () => mockPaiements.map((p) => ({ ...p, tentatives: [] }))),
      count: jest.fn(async () => mockPaiements.length),
      groupBy: jest.fn(async () => {
        const groupes = {};
        for (const p of mockPaiements) {
          groupes[p.statut] = groupes[p.statut] || { statut: p.statut, _count: { _all: 0 }, _sum: { montant: 0 } };
          groupes[p.statut]._count._all += 1;
          groupes[p.statut]._sum.montant += p.montant;
        }
        return Object.values(groupes);
      })
    },
    tentativePaiement: {
      create: jest.fn(async ({ data }) => {
        const t = { id: `t${mockTentatives.length + 1}`, createdAt: new Date(), ...data };
        mockTentatives.push(t);
        return t;
      })
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

const jeton = (role, organisationId, sub = 'agent-1') =>
  `Bearer ${jwt.sign({ sub, role, organisationId, firstName: 'Awa', lastName: 'Mensah' }, process.env.JWT_ACCESS_SECRET, {
    issuer: 'saygoo-auth', audience: 'saygoo-app', expiresIn: '1h'
  })}`;

// Le client qui paie a l'organisation CLI-1 (son identifiant), le CDA qui le
// suit a ORG-CDA. Le comptable est du personnel SAYGOO, sans organisation.
const COMPTABLE = () => jeton('COMPTABLE');
const CDA = () => jeton('CDA', 'ORG-CDA');
const CLIENT = () => jeton('OPERATEUR_ECONOMIQUE', 'CLI-1');

/** Crée directement un paiement dans un état donné. */
const paiementEn = (statut, extra = {}) => {
  const p = {
    id: `p${mockPaiements.length + 1}`,
    reference: `SAY-PAY-20260920-0000${mockPaiements.length + 1}`,
    clientId: 'CLI-1', clientNom: 'Acme SARL',
    montant: 850000, methode: 'FLOOZ', statut,
    prestataire: 'PAYGATE_GLOBAL',
    organisationId: 'CLI-1',
    suiviParOrganisationId: 'ORG-CDA',
    createdAt: new Date(),
    ...extra
  };
  mockPaiements.push(p);
  return p;
};

const corpsInitiation = (extra = {}) => ({
  clientId: 'CLI-1', clientNom: 'Acme SARL',
  montant: 850000, methode: 'FLOOZ',
  factureNum: 'INV-2026-00452', dossierRef: 'SAY-IMP-2026-0087',
  ...extra
});

beforeEach(() => {
  mockPaiements = [];
  mockTentatives = [];
  mockSequence = 0;
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Initiation', () => {
  it('attribue une référence au format SAY-PAY', async () => {
    const res = await request(app).post('/paiements')
      .set('Authorization', CDA()).send(corpsInitiation());

    expect(res.status).toBe(201);
    expect(res.body.data.paiement.reference).toMatch(/^SAY-PAY-\d{8}-\d{5}$/);
  });

  it('place un paiement Flooz en attente de confirmation', async () => {
    const res = await request(app).post('/paiements')
      .set('Authorization', CDA()).send(corpsInitiation({ methode: 'FLOOZ' }));

    expect(res.body.data.paiement.statut).toBe('EN_ATTENTE_CONFIRMATION');
    expect(res.body.data.paiement.prestataire).toBe('PAYGATE_GLOBAL');
  });

  it('place un virement en statut initié', async () => {
    const res = await request(app).post('/paiements')
      .set('Authorization', CDA()).send(corpsInitiation({ methode: 'VIREMENT_BANCAIRE' }));

    expect(res.body.data.paiement.statut).toBe('INITIE');
    expect(res.body.data.paiement.prestataire).toBe('ECOBANK');
  });

  it('trace chaque étape dans la timeline', async () => {
    await request(app).post('/paiements')
      .set('Authorization', CDA()).send(corpsInitiation({ methode: 'FLOOZ' }));

    // Mobile Money : CREE -> INITIE -> EN_ATTENTE_CONFIRMATION
    expect(mockTentatives.map((t) => t.statut)).toEqual([
      'CREE', 'INITIE', 'EN_ATTENTE_CONFIRMATION'
    ]);
  });

  it('refuse un moyen de paiement retiré du cahier des charges', async () => {
    for (const methode of ['ESPECES', 'WAVE', 'CARTE_BANCAIRE', 'MOBILE_MONEY']) {
      const res = await request(app).post('/paiements')
        .set('Authorization', CDA()).send(corpsInitiation({ methode }));
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('non accepté');
    }
    expect(mockPaiements).toHaveLength(0);
  });

  it('refuse un montant nul ou négatif', async () => {
    for (const montant of [0, -500, 'abc']) {
      const res = await request(app).post('/paiements')
        .set('Authorization', CDA()).send(corpsInitiation({ montant }));
      expect(res.status).toBe(400);
    }
  });

  it('exige client, montant et moyen de paiement', async () => {
    const res = await request(app).post('/paiements')
      .set('Authorization', CDA()).send({ clientId: 'CLI-1' });
    expect(res.status).toBe(400);
  });
});

describe('Confirmation', () => {
  it('confirme un paiement en attente', async () => {
    const p = paiementEn('EN_ATTENTE_CONFIRMATION');
    const res = await request(app).patch(`/paiements/${p.id}/confirmer`)
      .set('Authorization', COMPTABLE()).send({ numeroTransaction: 'PG-784521' });

    expect(res.status).toBe(200);
    expect(p.statut).toBe('CONFIRME');
    expect(p.datePaiement).toBeInstanceOf(Date);
  });

  it('refuse de confirmer deux fois', async () => {
    const p = paiementEn('CONFIRME');
    const res = await request(app).patch(`/paiements/${p.id}/confirmer`)
      .set('Authorization', COMPTABLE()).send({});

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('déjà');
  });

  it('refuse de confirmer un paiement annulé', async () => {
    const p = paiementEn('ANNULE');
    const res = await request(app).patch(`/paiements/${p.id}/confirmer`)
      .set('Authorization', COMPTABLE()).send({});

    expect(res.status).toBe(409);
    expect(p.statut).toBe('ANNULE');
  });

  it('retourne 404 pour un paiement inexistant', async () => {
    const res = await request(app).patch('/paiements/inexistant/confirmer')
      .set('Authorization', COMPTABLE()).send({});
    expect(res.status).toBe(404);
  });
});

describe('Rapprochement', () => {
  it('rapproche un paiement confirmé avec facture, dossier et conteneur', async () => {
    const p = paiementEn('CONFIRME', { factureNum: 'INV-2026-00452' });

    const res = await request(app).patch(`/paiements/${p.id}/rapprocher`)
      .set('Authorization', COMPTABLE())
      .send({ conteneurNum: 'MSKU1234567', serviceRendu: 'Dédouanement', dossierRef: 'SAY-IMP-2026-0087' });

    expect(res.status).toBe(200);
    expect(p.statut).toBe('RAPPROCHE');
    expect(p.conteneurNum).toBe('MSKU1234567');
    expect(p.serviceRendu).toBe('Dédouanement');
    expect(p.rapprochePar).toBe('agent-1');
    expect(p.rapprocheLe).toBeInstanceOf(Date);
  });

  it('exige au moins une facture ou un dossier', async () => {
    const p = paiementEn('CONFIRME');
    const res = await request(app).patch(`/paiements/${p.id}/rapprocher`)
      .set('Authorization', COMPTABLE()).send({ conteneurNum: 'MSKU1234567' });

    expect(res.status).toBe(400);
    expect(p.statut).toBe('CONFIRME');
  });

  it('refuse de rapprocher un paiement non confirmé', async () => {
    const p = paiementEn('EN_ATTENTE_CONFIRMATION', { factureNum: 'INV-2026-00452' });
    const res = await request(app).patch(`/paiements/${p.id}/rapprocher`)
      .set('Authorization', COMPTABLE()).send({});

    expect(res.status).toBe(409);
    expect(p.statut).toBe('EN_ATTENTE_CONFIRMATION');
  });

  it('est réservé au comptable', async () => {
    const p = paiementEn('CONFIRME', { factureNum: 'INV-2026-00452' });
    const res = await request(app).patch(`/paiements/${p.id}/rapprocher`)
      .set('Authorization', CDA()).send({});

    expect(res.status).toBe(403);
    expect(p.statut).toBe('CONFIRME');
  });
});

describe('Remboursement et annulation', () => {
  it('autorise le remboursement d’un paiement rapproché', async () => {
    const p = paiementEn('RAPPROCHE');
    const res = await request(app).patch(`/paiements/${p.id}/rembourser`)
      .set('Authorization', COMPTABLE()).send({ motif: 'Double facturation' });

    expect(res.status).toBe(200);
    expect(p.statut).toBe('REMBOURSEMENT_DEMANDE');
  });

  it('exige un motif de remboursement', async () => {
    const p = paiementEn('CONFIRME');
    const res = await request(app).patch(`/paiements/${p.id}/rembourser`)
      .set('Authorization', COMPTABLE()).send({});
    expect(res.status).toBe(400);
  });

  it('refuse d’annuler un paiement confirmé', async () => {
    // L'argent est encaissé : on rembourse, on n'annule pas.
    const p = paiementEn('CONFIRME');
    const res = await request(app).patch(`/paiements/${p.id}/annuler`)
      .set('Authorization', COMPTABLE()).send({ motif: 'erreur' });

    expect(res.status).toBe(409);
    expect(p.statut).toBe('CONFIRME');
  });

  it('annule un paiement encore en attente', async () => {
    const p = paiementEn('EN_ATTENTE_CONFIRMATION');
    const res = await request(app).patch(`/paiements/${p.id}/annuler`)
      .set('Authorization', COMPTABLE()).send({ motif: 'Client injoignable' });

    expect(res.status).toBe(200);
    expect(p.statut).toBe('ANNULE');
  });
});

describe('Timeline (lot B7)', () => {
  it('restitue le parcours complet dans l’ordre', async () => {
    const init = await request(app).post('/paiements')
      .set('Authorization', CDA()).send(corpsInitiation({ methode: 'FLOOZ' }));
    const id = init.body.data.paiement.id;

    await request(app).patch(`/paiements/${id}/confirmer`)
      .set('Authorization', COMPTABLE()).send({ numeroTransaction: 'PG-1' });
    await request(app).patch(`/paiements/${id}/rapprocher`)
      .set('Authorization', COMPTABLE()).send({ conteneurNum: 'MSKU1234567' });

    const res = await request(app).get(`/paiements/${id}/timeline`)
      .set('Authorization', CLIENT());

    expect(res.status).toBe(200);
    expect(res.body.data.statutActuel).toBe('RAPPROCHE');
    expect(res.body.data.evenements.map((e) => e.statut)).toEqual([
      'CREE', 'INITIE', 'EN_ATTENTE_CONFIRMATION', 'CONFIRME', 'RAPPROCHE'
    ]);
    expect(res.body.data.evenements.at(-1).libelle).toContain('INV-2026-00452');
  });

  it('associe une couleur à chaque événement', async () => {
    const p = paiementEn('CONFIRME');
    mockTentatives.push({ paiementId: p.id, statut: 'CONFIRME', message: 'ok', createdAt: new Date() });

    const res = await request(app).get(`/paiements/${p.id}/timeline`).set('Authorization', CLIENT());
    expect(res.body.data.evenements[0].couleur).toBe('vert');
  });

  it('retourne 404 pour un paiement inexistant', async () => {
    const res = await request(app).get('/paiements/inexistant/timeline').set('Authorization', CLIENT());
    expect(res.status).toBe(404);
  });
});

describe('Statistiques', () => {
  it('compte « encaissé » comme confirmé plus rapproché', async () => {
    paiementEn('CONFIRME', { montant: 100000 });
    paiementEn('RAPPROCHE', { montant: 250000 });
    paiementEn('EN_ATTENTE_CONFIRMATION', { montant: 50000 });
    paiementEn('ECHEC', { montant: 999999 });

    const res = await request(app).get('/paiements/statistiques').set('Authorization', COMPTABLE());
    const stats = res.body.data.statistiques;

    expect(stats.totalEncaisse).toBe(350000);
    expect(stats.totalEnAttente).toBe(50000);
    expect(stats.aRapprocher).toEqual({ nombre: 1, montant: 100000 });
  });

  it('présente les huit statuts, même à zéro', async () => {
    const res = await request(app).get('/paiements/statistiques').set('Authorization', COMPTABLE());
    expect(Object.keys(res.body.data.statistiques.parStatut)).toHaveLength(8);
  });
});

describe('Consultation', () => {
  it('refuse un filtre de statut inconnu', async () => {
    const res = await request(app).get('/paiements?statut=SUCCES').set('Authorization', CLIENT());
    expect(res.status).toBe(400);
  });

  it('ne divulgue jamais le détail d’une erreur', async () => {
    const prisma = require('../src/config/prisma');
    prisma.paiement.findUnique.mockRejectedValueOnce(new Error('relation "Paiement" does not exist'));

    const res = await request(app).get('/paiements/p1').set('Authorization', CLIENT());
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('relation');
  });
});
