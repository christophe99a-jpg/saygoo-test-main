// La génération d'un PDF prend quelques millisecondes sur un serveur, mais
// jusqu'à plusieurs secondes sur un poste Windows dont l'antivirus analyse
// chaque lecture de fichier de police. Les 5 secondes par défaut de Jest ne
// suffisent pas quand un test enchaîne plusieurs reçus.
jest.setTimeout(30000);

const {
  STATUTS_RECU,
  LONGUEUR_SIGNATURE,
  signerRecu,
  signatureValide,
  urlVerification,
  formaterMontant,
  formaterDate,
  genererRecuPDF
} = require('../src/services/recu');

const recuType = (extra = {}) => ({
  numeroRecu: 'REC-2026-008742',
  reference: 'SAY-PAY-20260914-00087',
  clientNom: 'ABC IMPORT SARL',
  factureNum: 'INV-2026-00452',
  dossierRef: 'SAY-IMP-2026-0087',
  serviceRendu: 'Dédouanement',
  conteneurNum: 'MSKU1234567',
  montant: 850000,
  devise: 'XOF',
  methode: 'FLOOZ',
  prestataire: 'PAYGATE_GLOBAL',
  datePaiement: new Date('2026-09-14T14:06:00Z'),
  statut: 'CONFIRME',
  referenceExterne: 'PG-FLOOZ-784521',
  ...extra
});

describe('formaterMontant', () => {
  it('regroupe les milliers à la française', () => {
    expect(formaterMontant(850000)).toBe('850 000 XOF');
    expect(formaterMontant(1250000)).toBe('1 250 000 XOF');
    expect(formaterMontant(500)).toBe('500 XOF');
  });

  it('n’utilise jamais l’espace fine insécable U+202F', () => {
    // Absente des polices standard des PDF : elle s'afficherait en carré noir.
    const texte = formaterMontant(123456789);
    expect(texte).not.toMatch(/\u202F/);
    expect(texte).not.toMatch(/\u00A0/);
    expect(texte).toBe('123 456 789 XOF');
  });

  it('masque les centimes nuls, affiche les autres', () => {
    expect(formaterMontant(850000.0)).toBe('850 000 XOF');
    expect(formaterMontant(1500.5)).toBe('1 500,50 XOF');
  });

  it('gère une autre devise et les négatifs', () => {
    expect(formaterMontant(1200, 'EUR')).toBe('1 200 EUR');
    expect(formaterMontant(-5000)).toBe('-5 000 XOF');
  });
});

describe('formaterDate', () => {
  it('suit le format du cahier des charges, à l’heure de Lomé', () => {
    expect(formaterDate('2026-09-14T14:06:00Z')).toBe('14/09/2026 - 14:06');
  });

  it('gère une date invalide sans planter', () => {
    expect(formaterDate('pas une date')).toBe('—');
  });
});

describe('Signature', () => {
  const donnees = recuType();

  it('produit une signature de longueur fixe', () => {
    expect(signerRecu(donnees)).toHaveLength(LONGUEUR_SIGNATURE);
  });

  it('est déterministe', () => {
    expect(signerRecu(donnees)).toBe(signerRecu(donnees));
  });

  it('reconnaît une signature authentique', () => {
    expect(signatureValide(donnees, signerRecu(donnees))).toBe(true);
  });

  it('détecte un montant retouché', () => {
    const sig = signerRecu(donnees);
    expect(signatureValide({ ...donnees, montant: 8500000 }, sig)).toBe(false);
  });

  it('détecte un changement de numéro de reçu ou de transaction', () => {
    const sig = signerRecu(donnees);
    expect(signatureValide({ ...donnees, numeroRecu: 'REC-2026-008743' }, sig)).toBe(false);
    expect(signatureValide({ ...donnees, reference: 'SAY-PAY-20260914-00088' }, sig)).toBe(false);
  });

  it('traite 850000 et 850000.00 comme le même montant', () => {
    const sig = signerRecu({ ...donnees, montant: 850000 });
    expect(signatureValide({ ...donnees, montant: '850000.00' }, sig)).toBe(true);
  });

  it('rejette une signature de mauvaise longueur ou de mauvais type', () => {
    expect(signatureValide(donnees, 'trop-court')).toBe(false);
    expect(signatureValide(donnees, null)).toBe(false);
    expect(signatureValide(donnees, 12345)).toBe(false);
  });

  it('refuse de signer sans secret configuré', () => {
    const sauvegarde = process.env.RECU_SECRET;
    delete process.env.RECU_SECRET;
    try {
      expect(() => signerRecu(donnees)).toThrow('RECU_SECRET');
    } finally {
      process.env.RECU_SECRET = sauvegarde;
    }
  });

  it('ne valide pas une signature produite avec une autre clé', () => {
    const sauvegarde = process.env.RECU_SECRET;
    process.env.RECU_SECRET = 'une-autre-cle';
    const sigEtrangere = signerRecu(donnees);
    process.env.RECU_SECRET = sauvegarde;

    expect(signatureValide(donnees, sigEtrangere)).toBe(false);
  });
});

describe('urlVerification', () => {
  it('construit l’adresse encodée dans le QR code', () => {
    expect(urlVerification('REC-2026-008742', 'abc123'))
      .toBe('https://saygoo.test/api/v1/recus/verifier/REC-2026-008742?s=abc123');
  });
});

describe('genererRecuPDF', () => {
  it('produit un PDF valide', async () => {
    const pdf = await genererRecuPDF(recuType());
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(3000);
  });

  it('fonctionne pour les quatre moyens de paiement', async () => {
    for (const methode of ['FLOOZ', 'TMONEY', 'VIREMENT_BANCAIRE', 'VISA_BUSINESS']) {
      const pdf = await genererRecuPDF(recuType({ methode }));
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    }
  });

  it('fonctionne pour un paiement rapproché', async () => {
    const pdf = await genererRecuPDF(recuType({ statut: 'RAPPROCHE' }));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('tolère l’absence des champs facultatifs', async () => {
    const pdf = await genererRecuPDF(recuType({
      factureNum: null, dossierRef: null, serviceRendu: null,
      conteneurNum: null, referenceExterne: null, prestataire: null
    }));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('refuse d’émettre un reçu pour un paiement non encaissé', async () => {
    for (const statut of ['CREE', 'INITIE', 'EN_ATTENTE_CONFIRMATION', 'ECHEC', 'ANNULE']) {
      await expect(genererRecuPDF(recuType({ statut }))).rejects.toThrow('Aucun reçu');
    }
  });

  it('refuse un paiement sans numéro de reçu', async () => {
    await expect(genererRecuPDF(recuType({ numeroRecu: null }))).rejects.toThrow('Numéro');
  });

  it('limite les reçus aux paiements confirmés ou rapprochés', () => {
    expect(STATUTS_RECU).toEqual(['CONFIRME', 'RAPPROCHE']);
  });
});
