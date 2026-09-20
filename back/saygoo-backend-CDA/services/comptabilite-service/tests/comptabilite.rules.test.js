const {
  arrondir,
  validerLignes,
  classeDuCompte,
  sensNormal,
  verifierExercice,
  inverserLignes,
  calculerSolde,
  repartirParAnciennete
} = require('../src/services/comptabilite.rules');

describe('arrondir', () => {
  it('neutralise les erreurs de flottant', () => {
    expect(arrondir(0.1 + 0.2)).toBe(0.3);
    expect(arrondir(1.005)).toBe(1.01);
    expect(arrondir(2360000.555)).toBe(2360000.56);
  });
});

describe('validerLignes — équilibre de la partie double', () => {
  const ligne = (compte, debit, credit) => ({
    compteNumero: compte,
    libelle: 'test',
    debit,
    credit: credit || 0
  });

  it('accepte une écriture équilibrée', () => {
    const res = validerLignes([
      ligne('4111', 2360000, 0),
      ligne('7061', 0, 2000000),
      ligne('4431', 0, 360000)
    ]);

    expect(res.valide).toBe(true);
    expect(res.erreurs).toHaveLength(0);
    expect(res.totalDebit).toBe(2360000);
    expect(res.totalCredit).toBe(2360000);
  });

  it('refuse une écriture déséquilibrée et chiffre l’écart', () => {
    const res = validerLignes([
      ligne('4111', 2360000, 0),
      ligne('7061', 0, 2000000)
    ]);

    expect(res.valide).toBe(false);
    expect(res.erreurs.join(' ')).toContain('360000');
  });

  it('refuse une écriture à une seule ligne', () => {
    const res = validerLignes([ligne('4111', 1000, 0)]);
    expect(res.valide).toBe(false);
  });

  it('refuse une ligne portant débit et crédit à la fois', () => {
    const res = validerLignes([
      ligne('4111', 1000, 1000),
      ligne('7061', 0, 1000)
    ]);
    expect(res.valide).toBe(false);
    expect(res.erreurs.join(' ')).toContain('pas les deux');
  });

  it('refuse un montant négatif', () => {
    const res = validerLignes([
      ligne('4111', -1000, 0),
      ligne('7061', 0, -1000)
    ]);
    expect(res.valide).toBe(false);
    expect(res.erreurs.join(' ')).toContain('négatif');
  });

  it('refuse une ligne de montant nul', () => {
    const res = validerLignes([
      ligne('4111', 1000, 0),
      ligne('7061', 0, 1000),
      ligne('6011', 0, 0)
    ]);
    expect(res.valide).toBe(false);
    expect(res.erreurs.join(' ')).toContain('nul');
  });

  it('reste équilibrée malgré les centimes', () => {
    const res = validerLignes([
      ligne('4111', 0.1, 0),
      ligne('4111', 0.2, 0),
      ligne('7061', 0, 0.3)
    ]);
    expect(res.valide).toBe(true);
  });
});

describe('classeDuCompte', () => {
  it('déduit la classe du premier chiffre', () => {
    expect(classeDuCompte('4111')).toBe('CLASSE_4');
    expect(classeDuCompte('601')).toBe('CLASSE_6');
    expect(classeDuCompte('7')).toBe('CLASSE_7');
  });

  it('rejette un numéro hors classes 1 à 8', () => {
    expect(classeDuCompte('9001')).toBeNull();
    expect(classeDuCompte('0123')).toBeNull();
  });
});

describe('sensNormal', () => {
  it('place les emplois au débit', () => {
    expect(sensNormal('2411')).toBe('DEBIT'); // immobilisations
    expect(sensNormal('6011')).toBe('DEBIT'); // charges
  });

  it('place les ressources au crédit', () => {
    expect(sensNormal('1011')).toBe('CREDIT'); // capital
    expect(sensNormal('7061')).toBe('CREDIT'); // produits
  });

  it('ne tranche pas pour les classes ambivalentes', () => {
    expect(sensNormal('4111')).toBeNull(); // tiers
    expect(sensNormal('5211')).toBeNull(); // trésorerie
    expect(sensNormal('8411')).toBeNull(); // HAO
  });
});

describe('verifierExercice', () => {
  const exercice = {
    annee: 2026,
    dateDebut: '2026-01-01',
    dateFin: '2026-12-31',
    statut: 'OUVERT'
  };

  it('accepte une date dans les bornes', () => {
    expect(verifierExercice('2026-09-19', exercice).valide).toBe(true);
  });

  it('refuse une date hors bornes', () => {
    const res = verifierExercice('2027-01-05', exercice);
    expect(res.valide).toBe(false);
    expect(res.erreur).toContain('hors de l');
  });

  it('refuse toute écriture sur un exercice clôturé', () => {
    const res = verifierExercice('2026-09-19', { ...exercice, statut: 'CLOTURE' });
    expect(res.valide).toBe(false);
    expect(res.erreur).toContain('clôturé');
  });

  it('refuse quand aucun exercice ne couvre la date', () => {
    expect(verifierExercice('2026-09-19', null).valide).toBe(false);
  });
});

describe('inverserLignes — extourne', () => {
  it('permute débits et crédits', () => {
    const origine = [
      { compteNumero: '4111', libelle: 'Client Acme', debit: 2360000, credit: 0 },
      { compteNumero: '7061', libelle: 'Prestation', debit: 0, credit: 2360000 }
    ];

    const extourne = inverserLignes(origine);

    expect(extourne[0].debit).toBe(0);
    expect(extourne[0].credit).toBe(2360000);
    expect(extourne[1].debit).toBe(2360000);
    expect(extourne[1].credit).toBe(0);
    expect(extourne[0].libelle).toContain('Extourne');
  });

  it('produit une écriture elle-même équilibrée', () => {
    const origine = [
      { compteNumero: '4111', libelle: 'a', debit: 1500, credit: 0 },
      { compteNumero: '7061', libelle: 'b', debit: 0, credit: 1000 },
      { compteNumero: '4431', libelle: 'c', debit: 0, credit: 500 }
    ];

    expect(validerLignes(inverserLignes(origine)).valide).toBe(true);
  });
});

describe('calculerSolde', () => {
  it('dégage un solde débiteur', () => {
    const solde = calculerSolde([
      { debit: 5000, credit: 0 },
      { debit: 0, credit: 2000 }
    ]);
    expect(solde.soldeDebiteur).toBe(3000);
    expect(solde.soldeCrediteur).toBe(0);
    expect(solde.sens).toBe('DEBIT');
  });

  it('dégage un solde créditeur', () => {
    const solde = calculerSolde([
      { debit: 1000, credit: 0 },
      { debit: 0, credit: 4000 }
    ]);
    expect(solde.soldeCrediteur).toBe(3000);
    expect(solde.sens).toBe('CREDIT');
  });

  it('signale un compte soldé', () => {
    const solde = calculerSolde([
      { debit: 2000, credit: 0 },
      { debit: 0, credit: 2000 }
    ]);
    expect(solde.sens).toBe('EQUILIBRE');
  });
});

describe('repartirParAnciennete — balance âgée', () => {
  const ref = new Date('2026-09-19');

  it('classe les créances par tranche', () => {
    const tranches = repartirParAnciennete([
      { dateEcheance: '2026-10-15', montant: 1000 }, // à échoir
      { dateEcheance: '2026-09-01', montant: 2000 }, // 18 jours
      { dateEcheance: '2026-08-05', montant: 3000 }, // 45 jours
      { dateEcheance: '2026-07-10', montant: 4000 }, // 71 jours
      { dateEcheance: '2026-01-10', montant: 5000 }  // plus de 90
    ], ref);

    expect(tranches.aEchoir).toBe(1000);
    expect(tranches.jours1a30).toBe(2000);
    expect(tranches.jours31a60).toBe(3000);
    expect(tranches.jours61a90).toBe(4000);
    expect(tranches.plus90).toBe(5000);
    expect(tranches.total).toBe(15000);
  });

  it('retourne des tranches vides sans créance', () => {
    expect(repartirParAnciennete([], ref).total).toBe(0);
  });
});
