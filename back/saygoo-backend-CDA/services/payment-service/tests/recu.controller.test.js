// La génération d'un PDF prend quelques millisecondes sur un serveur, mais
// jusqu'à plusieurs secondes sur un poste Windows dont l'antivirus analyse
// chaque lecture de fichier de police. Les 5 secondes par défaut de Jest ne
// suffisent pas quand un test enchaîne plusieurs reçus.
jest.setTimeout(30000);

const jwt = require('jsonwebtoken');
const request = require('supertest');

// ── Simulation de Prisma ──────────────────────────────────────────────────────

let mockPaiements;
let mockSequence;

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));

jest.mock('../src/config/prisma', () => {
  const client = {
    paiement: {
      findUnique: jest.fn(async ({ where }) => {
        const p = where.id
          ? mockPaiements.find((x) => x.id === where.id)
          : mockPaiements.find((x) => x.numeroRecu === where.numeroRecu);
        return p ? { ...p } : null;
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        const p = mockPaiements.find((x) => x.id === where.id && x.numeroRecu === where.numeroRecu);
        if (!p) return { count: 0 };
        Object.assign(p, data);
        return { count: 1 };
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
const prisma = require('../src/config/prisma');
const { signerRecu } = require('../src/services/recu');

const jeton = (role) =>
  `Bearer ${jwt.sign({ sub: 'user-1', role }, process.env.JWT_ACCESS_SECRET, {
    issuer: 'saygoo-auth', audience: 'saygoo-app', expiresIn: '1h'
  })}`;

const paiement = (extra = {}) => {
  const p = {
    id: `p${mockPaiements.length + 1}`,
    reference: 'SAY-PAY-20260914-00087',
    numeroRecu: null,
    clientNom: 'ABC IMPORT SARL',
    clientTel: '+228 90 00 00 00',
    factureNum: 'INV-2026-00452',
    montant: 850000, devise: 'XOF',
    methode: 'FLOOZ', prestataire: 'PAYGATE_GLOBAL',
    statut: 'CONFIRME',
    datePaiement: new Date('2026-09-14T14:06:00Z'),
    ...extra
  };
  mockPaiements.push(p);
  return p;
};

beforeEach(() => {
  mockPaiements = [];
  mockSequence = 8741;
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /paiements/:id/recu — téléchargement', () => {
  it('renvoie un PDF pour un paiement confirmé', async () => {
    const p = paiement();
    const res = await request(app).get(`/paiements/${p.id}/recu`)
      .set('Authorization', jeton('CLIENT'))
      .buffer(true).parse((r, cb) => {
        const morceaux = [];
        r.on('data', (m) => morceaux.push(m));
        r.on('end', () => cb(null, Buffer.concat(morceaux)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('attribue un numéro de reçu au format REC-AAAA-NNNNNN', async () => {
    const p = paiement();
    const res = await request(app).get(`/paiements/${p.id}/recu`).set('Authorization', jeton('CLIENT'));

    const annee = new Date().getUTCFullYear();
    expect(p.numeroRecu).toBe(`REC-${annee}-008742`);
    expect(res.headers['content-disposition']).toContain(`REC-${annee}-008742.pdf`);
  });

  it('conserve le même numéro aux téléchargements suivants', async () => {
    const p = paiement();
    await request(app).get(`/paiements/${p.id}/recu`).set('Authorization', jeton('CLIENT'));
    const premier = p.numeroRecu;

    prisma.$queryRawUnsafe.mockClear();
    await request(app).get(`/paiements/${p.id}/recu`).set('Authorization', jeton('CLIENT'));

    expect(p.numeroRecu).toBe(premier);
    // La séquence n'a pas été consommée une seconde fois.
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('refuse un reçu pour un paiement non encaissé', async () => {
    const p = paiement({ statut: 'EN_ATTENTE_CONFIRMATION' });
    const res = await request(app).get(`/paiements/${p.id}/recu`).set('Authorization', jeton('CLIENT'));

    expect(res.status).toBe(409);
    expect(p.numeroRecu).toBeNull();
  });

  it('retourne 404 pour un paiement inexistant', async () => {
    const res = await request(app).get('/paiements/inexistant/recu').set('Authorization', jeton('CLIENT'));
    expect(res.status).toBe(404);
  });

  it('exige une authentification', async () => {
    const p = paiement();
    const res = await request(app).get(`/paiements/${p.id}/recu`);
    expect(res.status).toBe(401);
  });
});

describe('GET /recus/verifier/:numeroRecu — vérification publique', () => {
  const recuEmis = (extra = {}) => {
    const p = paiement({ numeroRecu: 'REC-2026-008742', ...extra });
    return { p, signature: signerRecu(p) };
  };

  it('confirme un reçu authentique, sans authentification', async () => {
    const { signature } = recuEmis();
    const res = await request(app).get(`/recus/verifier/REC-2026-008742?s=${signature}`);

    expect(res.status).toBe(200);
    expect(res.body.authentique).toBe(true);
    expect(res.body.valable).toBe(true);
    expect(res.body.recu.montantFormate).toBe('850 000 XOF');
    expect(res.body.recu.clientNom).toBe('ABC IMPORT SARL');
  });

  it('n’expose aucune donnée absente du reçu imprimé', async () => {
    const { signature } = recuEmis();
    const res = await request(app).get(`/recus/verifier/REC-2026-008742?s=${signature}`);

    expect(res.body.recu).not.toHaveProperty('clientTel');
    expect(res.body.recu).not.toHaveProperty('id');
    expect(JSON.stringify(res.body)).not.toContain('+228');
  });

  it('refuse une signature invalide', async () => {
    recuEmis();
    const res = await request(app).get('/recus/verifier/REC-2026-008742?s=ffffffffffffffffffffffff');

    expect(res.status).toBe(404);
    expect(res.body.authentique).toBe(false);
  });

  it('répond pareil pour un reçu inexistant et une signature fausse', async () => {
    recuEmis();
    const faux = await request(app).get('/recus/verifier/REC-2026-008742?s=ffffffffffffffffffffffff');
    const inexistant = await request(app).get('/recus/verifier/REC-2026-999999?s=ffffffffffffffffffffffff');

    // Même statut, même message : impossible de savoir quels numéros existent.
    expect(inexistant.status).toBe(faux.status);
    expect(inexistant.body).toEqual(faux.body);
  });

  it('refuse une vérification sans signature', async () => {
    recuEmis();
    const res = await request(app).get('/recus/verifier/REC-2026-008742');
    expect(res.status).toBe(404);
  });

  it('signale un reçu authentique mais remboursé depuis', async () => {
    const { signature } = recuEmis({ statut: 'REMBOURSEMENT_DEMANDE' });
    const res = await request(app).get(`/recus/verifier/REC-2026-008742?s=${signature}`);

    expect(res.status).toBe(200);
    expect(res.body.authentique).toBe(true);
    expect(res.body.valable).toBe(false);
    expect(res.body.alerte).toContain('remboursement');
  });

  it('détecte un reçu dont le montant a été modifié en base', async () => {
    // Signature calculée sur 850 000, puis montant altéré : la vérification échoue.
    const { p, signature } = recuEmis();
    p.montant = 8500000;

    const res = await request(app).get(`/recus/verifier/REC-2026-008742?s=${signature}`);
    expect(res.status).toBe(404);
    expect(res.body.authentique).toBe(false);
  });
});
