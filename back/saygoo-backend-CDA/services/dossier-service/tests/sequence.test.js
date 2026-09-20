// Le module importe le client Prisma par defaut ; on le neutralise puisque
// les tests fournissent leur propre client simule.
jest.mock('../src/config/prisma', () => ({}));

const { prochainNumero, maxExistant } = require('../src/utils/sequence');

// ── Simulation d'une séquence PostgreSQL ──────────────────────────────────────
// Reproduit le comportement réel : is_called à false tant que nextval n'a pas
// été appelé, setval qui repositionne, nextval qui incrémente.

let sequences;
let requetes;

const fabriquerClient = () => ({
  $executeRawUnsafe: jest.fn(async (sql) => {
    requetes.push(sql);
    const creation = sql.match(/CREATE SEQUENCE IF NOT EXISTS (\w+)/);
    if (creation && !sequences[creation[1]]) {
      sequences[creation[1]] = { valeur: 0, is_called: false };
    }
    const setval = sql.match(/setval\('(\w+)',\s*(\d+)\)/);
    if (setval) {
      sequences[setval[1]] = { valeur: Number(setval[2]), is_called: true };
    }
    return 0;
  }),
  $queryRawUnsafe: jest.fn(async (sql) => {
    requetes.push(sql);
    const etat = sql.match(/SELECT is_called FROM (\w+)/);
    if (etat) return [{ is_called: sequences[etat[1]].is_called }];

    const suivant = sql.match(/nextval\('(\w+)'\)/);
    if (suivant) {
      const s = sequences[suivant[1]];
      s.valeur += 1;
      s.is_called = true;
      return [{ valeur: s.valeur }];
    }
    return [];
  })
});

beforeEach(() => {
  sequences = {};
  requetes = [];
});

describe('prochainNumero', () => {
  it('démarre à 1 quand aucune référence n’existe', async () => {
    const client = fabriquerClient();
    const n = await prochainNumero('seq_test', async () => 0, client);
    expect(n).toBe(1);
  });

  it('incrémente à chaque appel', async () => {
    const client = fabriquerClient();
    const a = await prochainNumero('seq_test', async () => 0, client);
    const b = await prochainNumero('seq_test', async () => 0, client);
    const c = await prochainNumero('seq_test', async () => 0, client);
    expect([a, b, c]).toEqual([1, 2, 3]);
  });

  it('s’amorce sur le maximum existant pour éviter les collisions', async () => {
    // saygoo_dossiers contient déjà DD-2026-000009 : la séquence neuve
    // doit repartir à 10, pas à 1.
    const client = fabriquerClient();
    const n = await prochainNumero('seq_dossier_2026', async () => 9, client);
    expect(n).toBe(10);
  });

  it('n’amorce qu’une seule fois', async () => {
    const client = fabriquerClient();
    const amorce = jest.fn(async () => 9);

    await prochainNumero('seq_dossier_2026', amorce, client);
    await prochainNumero('seq_dossier_2026', amorce, client);
    await prochainNumero('seq_dossier_2026', amorce, client);

    expect(amorce).toHaveBeenCalledTimes(1);
  });

  it('ne rend jamais deux fois le même numéro', async () => {
    const client = fabriquerClient();
    const numeros = [];
    for (let i = 0; i < 50; i++) {
      numeros.push(await prochainNumero('seq_test', async () => 0, client));
    }
    expect(new Set(numeros).size).toBe(50);
  });

  it('refuse un nom de séquence non conforme', async () => {
    const client = fabriquerClient();
    await expect(
      prochainNumero("seq'; DROP TABLE \"Dossier\"; --", async () => 0, client)
    ).rejects.toThrow('invalide');
  });
});

describe('maxExistant', () => {
  const modele = (references) => ({
    findMany: jest.fn(async () => references.map((r) => ({ reference: r })))
  });

  it('extrait le plus grand numéro', async () => {
    const max = await maxExistant(
      modele(['DD-2026-000001', 'DD-2026-000009', 'DD-2026-000004']),
      'DD-2026-'
    );
    expect(max).toBe(9);
  });

  it('renvoie 0 sans référence', async () => {
    expect(await maxExistant(modele([]), 'DD-2026-')).toBe(0);
  });

  it('ignore les suffixes non numériques', async () => {
    const max = await maxExistant(
      modele(['DD-2026-000003', 'DD-2026-ABCDEF']),
      'DD-2026-'
    );
    expect(max).toBe(3);
  });

  it('accepte un champ autre que reference', async () => {
    const parc = {
      findMany: jest.fn(async () => [{ lot: 'V003' }, { lot: 'V011' }])
    };
    expect(await maxExistant(parc, 'V', 'lot')).toBe(11);
  });
});

describe('Comparaison avec l’ancienne méthode', () => {
  it('count() + 1 produisait des doublons en concurrence', async () => {
    // Reproduction du défaut corrigé : dix appels simultanés lisent tous
    // le même comptage et rendent tous le même numéro.
    let lignes = 9;
    const ancienne = async () => {
      const count = lignes; // lecture
      await new Promise((r) => setTimeout(r, 1)); // latence réseau
      return count + 1;
    };

    const anciens = await Promise.all(Array.from({ length: 10 }, ancienne));
    expect(new Set(anciens).size).toBe(1); // toutes identiques : le bug

    // Avec la séquence, dix valeurs distinctes.
    const client = fabriquerClient();
    const nouveaux = [];
    for (let i = 0; i < 10; i++) {
      nouveaux.push(await prochainNumero('seq_dossier_2026', async () => 9, client));
    }
    expect(new Set(nouveaux).size).toBe(10);
    expect(Math.min(...nouveaux)).toBe(10); // et aucune collision avec l'existant
  });
});
