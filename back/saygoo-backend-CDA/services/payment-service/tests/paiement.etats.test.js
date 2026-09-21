// Le module importe le client Prisma par défaut ; les tests fournissent le leur.
jest.mock('../src/config/prisma', () => ({}));

const {
  STATUTS,
  TRANSITIONS,
  STATUTS_TERMINAUX,
  STATUTS_FIGES_WEBHOOK,
  LIBELLES,
  transitionPermise,
  verifierTransition,
  traduireStatutPrestataire,
  genererReferencePaiement,
  genererReferenceInstruction,
  referenceValide
} = require('../src/services/paiement.etats');

// ── Séquence PostgreSQL simulée ───────────────────────────────────────────────

let sequences;

const clientSimule = () => ({
  $executeRawUnsafe: jest.fn(async (sql) => {
    const m = sql.match(/CREATE SEQUENCE IF NOT EXISTS (\w+)/);
    if (m && sequences[m[1]] === undefined) sequences[m[1]] = 0;
    return 0;
  }),
  $queryRawUnsafe: jest.fn(async (sql) => {
    const m = sql.match(/nextval\('(\w+)'\)/);
    if (m) {
      sequences[m[1]] += 1;
      return [{ valeur: sequences[m[1]] }];
    }
    return [];
  })
});

beforeEach(() => {
  sequences = {};
});

// ── Les huit statuts ──────────────────────────────────────────────────────────

describe('Statuts de paiement', () => {
  it('définit exactement les huit statuts du cahier des charges', () => {
    expect(Object.keys(STATUTS)).toEqual([
      'CREE',
      'INITIE',
      'EN_ATTENTE_CONFIRMATION',
      'CONFIRME',
      'RAPPROCHE',
      'ECHEC',
      'REMBOURSEMENT_DEMANDE',
      'ANNULE'
    ]);
  });

  it('donne un libellé et une couleur à chaque statut', () => {
    for (const statut of Object.keys(STATUTS)) {
      expect(LIBELLES[statut]).toBeDefined();
      expect(LIBELLES[statut].texte).toBeTruthy();
      expect(LIBELLES[statut].couleur).toBeTruthy();
    }
  });

  it('déclare une liste de transitions pour chaque statut', () => {
    for (const statut of Object.keys(STATUTS)) {
      expect(Array.isArray(TRANSITIONS[statut])).toBe(true);
    }
  });

  it('ne laisse aucune sortie aux états terminaux', () => {
    expect(STATUTS_TERMINAUX.sort()).toEqual(
      ['ANNULE', 'ECHEC', 'REMBOURSEMENT_DEMANDE'].sort()
    );
    for (const statut of STATUTS_TERMINAUX) {
      expect(TRANSITIONS[statut]).toHaveLength(0);
    }
  });

  it('fige RAPPROCHE vis-a-vis des webhooks sans le rendre terminal', () => {
    // Le comptable peut encore rembourser ; le prestataire ne peut plus rien.
    expect(STATUTS_FIGES_WEBHOOK).toContain('RAPPROCHE');
    expect(STATUTS_TERMINAUX).not.toContain('RAPPROCHE');
    expect(TRANSITIONS.RAPPROCHE).toEqual(['REMBOURSEMENT_DEMANDE']);
  });
});

// ── Le chemin nominal ─────────────────────────────────────────────────────────

describe('Parcours nominal', () => {
  it('suit l’enchaînement du cahier des charges', () => {
    const parcours = [
      'CREE',
      'INITIE',
      'EN_ATTENTE_CONFIRMATION',
      'CONFIRME',
      'RAPPROCHE'
    ];

    for (let i = 0; i < parcours.length - 1; i++) {
      const etape = verifierTransition(parcours[i], parcours[i + 1]);
      expect(etape.valide).toBe(true);
    }
  });

  it('autorise le raccourci INITIE vers CONFIRME', () => {
    // Certains prestataires confirment immédiatement, sans état intermédiaire.
    expect(verifierTransition('INITIE', 'CONFIRME').valide).toBe(true);
  });
});

// ── Les transitions interdites ────────────────────────────────────────────────

describe('Transitions interdites', () => {
  it('refuse de revenir en arrière', () => {
    const res = verifierTransition('CONFIRME', 'INITIE');
    expect(res.valide).toBe(false);
    expect(res.raison).toContain('interdite');
  });

  it('refuse de sauter le rapprochement', () => {
    expect(verifierTransition('EN_ATTENTE_CONFIRMATION', 'RAPPROCHE').valide).toBe(false);
  });

  it('refuse toute modification d’un paiement rapproché, sauf remboursement', () => {
    expect(verifierTransition('RAPPROCHE', 'ECHEC').valide).toBe(false);
    expect(verifierTransition('RAPPROCHE', 'CONFIRME').valide).toBe(false);
    expect(verifierTransition('RAPPROCHE', 'REMBOURSEMENT_DEMANDE').valide).toBe(true);
  });

  it('refuse toute sortie d’un échec', () => {
    const res = verifierTransition('ECHEC', 'CONFIRME');
    expect(res.valide).toBe(false);
    expect(res.terminal).toBe(true);
  });

  it('refuse de ressusciter un paiement annulé', () => {
    expect(verifierTransition('ANNULE', 'INITIE').valide).toBe(false);
  });

  it('refuse une transition vers le même statut', () => {
    const res = verifierTransition('CONFIRME', 'CONFIRME');
    expect(res.valide).toBe(false);
    expect(res.raison).toContain('déjà');
  });

  it('refuse un statut inconnu', () => {
    expect(verifierTransition('CONFIRME', 'PAYE').valide).toBe(false);
    expect(verifierTransition('INEXISTANT', 'CONFIRME').valide).toBe(false);
  });

  it('empêche un webhook tardif de dégrader un paiement rapproché', () => {
    // Le cas réel : PayGate rejoue une notification d'échec après
    // que le comptable a rapproché le paiement.
    const res = verifierTransition('RAPPROCHE', 'ECHEC');
    expect(res.valide).toBe(false);
  });
});

// ── Traduction des statuts prestataires ───────────────────────────────────────

describe('traduireStatutPrestataire', () => {
  it('traduit les confirmations', () => {
    expect(traduireStatutPrestataire('SUCCESS')).toBe('CONFIRME');
    expect(traduireStatutPrestataire('completed')).toBe('CONFIRME');
    expect(traduireStatutPrestataire('Paid')).toBe('CONFIRME');
  });

  it('traduit les attentes et les échecs', () => {
    expect(traduireStatutPrestataire('PENDING')).toBe('EN_ATTENTE_CONFIRMATION');
    expect(traduireStatutPrestataire('FAILED')).toBe('ECHEC');
    expect(traduireStatutPrestataire('CANCELLED')).toBe('ANNULE');
  });

  it('renvoie null sur un statut inconnu plutôt que de deviner', () => {
    expect(traduireStatutPrestataire('BIZARRE')).toBeNull();
    expect(traduireStatutPrestataire(null)).toBeNull();
    expect(traduireStatutPrestataire('')).toBeNull();
  });
});

// ── Références ────────────────────────────────────────────────────────────────

describe('genererReferencePaiement', () => {
  it('respecte le format SAY-PAY-AAAAMMJJ-NNNNN', async () => {
    const reference = await genererReferencePaiement(clientSimule());
    expect(reference).toMatch(/^SAY-PAY-\d{8}-\d{5}$/);
  });

  it('porte la date du jour', async () => {
    const reference = await genererReferencePaiement(clientSimule());
    const jour = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    expect(reference).toContain(jour);
  });

  it('commence à 00001', async () => {
    const reference = await genererReferencePaiement(clientSimule());
    expect(reference.endsWith('-00001')).toBe(true);
  });

  it('ne rend jamais deux fois la même référence', async () => {
    const client = clientSimule();
    const references = [];
    for (let i = 0; i < 100; i++) {
      references.push(await genererReferencePaiement(client));
    }
    expect(new Set(references).size).toBe(100);
  });

  it('distingue les instructions des paiements', async () => {
    const client = clientSimule();
    const paiement = await genererReferencePaiement(client);
    const instruction = await genererReferenceInstruction(client);

    expect(paiement).toContain('SAY-PAY-');
    expect(instruction).toContain('SAY-INS-');
    // Séquences distinctes : les deux repartent de 1.
    expect(paiement.endsWith('-00001')).toBe(true);
    expect(instruction.endsWith('-00001')).toBe(true);
  });
});

describe('referenceValide', () => {
  it('accepte le format du cahier des charges', () => {
    expect(referenceValide('SAY-PAY-20260914-00087')).toBe(true);
  });

  it('refuse l’ancien format', () => {
    expect(referenceValide('PAY-2026-000001')).toBe(false);
  });

  it('refuse les entrées malformées', () => {
    expect(referenceValide('SAY-PAY-2026-00087')).toBe(false);
    expect(referenceValide('SAY-PAY-20260914-87')).toBe(false);
    expect(referenceValide('')).toBe(false);
    expect(referenceValide(null)).toBe(false);
  });
});
