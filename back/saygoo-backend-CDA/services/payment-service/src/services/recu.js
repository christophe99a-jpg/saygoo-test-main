const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Reçus de paiement SAYGOO (lot B8).
 *
 * Chaque reçu porte un QR code qui permet à un tiers — douane, banque,
 * transitaire — de vérifier qu'il a bien été émis par SAYGOO et qu'il n'a
 * pas été modifié.
 *
 * Le principe : le QR contient le numéro du reçu et une signature HMAC
 * calculée sur ses données essentielles (numéro, transaction, montant).
 * Sans la clé secrète du serveur, impossible de fabriquer une signature
 * valide. Un reçu dont on aurait retouché le montant échoue donc à la
 * vérification.
 */

/** Statuts pour lesquels un reçu peut être émis : l'argent est encaissé. */
const STATUTS_RECU = ['CONFIRME', 'RAPPROCHE'];

/** Longueur de la signature, en caractères hexadécimaux (96 bits). */
const LONGUEUR_SIGNATURE = 24;

// ─────────────────────────────────────────────────────────────────────────────
// Signature
// ─────────────────────────────────────────────────────────────────────────────

const lireSecret = () => {
  const secret = process.env.RECU_SECRET;
  // Sans secret, on refuse de signer. Une valeur par défaut rendrait les
  // signatures devinables par quiconque lit le code source.
  if (!secret) {
    throw new Error('RECU_SECRET absent : impossible de signer un reçu.');
  }
  return secret;
};

/**
 * Données couvertes par la signature. Le montant est normalisé à deux
 * décimales pour que 850000 et 850000.00 donnent la même signature.
 */
const chargeSignee = ({ numeroRecu, reference, montant, devise }) =>
  [numeroRecu, reference, Number(montant).toFixed(2), devise || 'XOF'].join('|');

const signerRecu = (donnees) =>
  crypto
    .createHmac('sha256', lireSecret())
    .update(chargeSignee(donnees))
    .digest('hex')
    .slice(0, LONGUEUR_SIGNATURE);

/**
 * Compare la signature présentée à celle recalculée, à temps constant.
 * Une comparaison ordinaire s'arrête au premier caractère différent, ce qui
 * permettrait de deviner une signature caractère par caractère en mesurant
 * le temps de réponse.
 */
const signatureValide = (donnees, signature) => {
  if (typeof signature !== 'string' || signature.length !== LONGUEUR_SIGNATURE) {
    return false;
  }
  const attendue = Buffer.from(signerRecu(donnees), 'utf8');
  const recue = Buffer.from(signature, 'utf8');
  return attendue.length === recue.length && crypto.timingSafeEqual(attendue, recue);
};

/** URL encodée dans le QR code. */
const urlVerification = (numeroRecu, signature) => {
  const base = (process.env.RECU_VERIFICATION_URL ||
    'http://localhost:8000/api/v1/recus/verifier').replace(/\/+$/, '');
  return `${base}/${encodeURIComponent(numeroRecu)}?s=${signature}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Mise en forme
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formate un montant à la française : 850 000 XOF.
 *
 * On n'utilise pas Intl.NumberFormat('fr-FR') : il sépare les milliers par
 * une espace fine insécable (U+202F), absente de l'encodage des polices
 * standard des PDF. Elle s'afficherait comme un carré noir. On regroupe
 * donc les chiffres à la main, avec une espace ordinaire.
 */
const formaterMontant = (montant, devise = 'XOF') => {
  const valeur = Math.round(Number(montant) * 100) / 100;
  const [entier, decimales] = Math.abs(valeur).toFixed(2).split('.');
  const groupes = entier.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  // Le franc CFA n'a pas de subdivision en usage : on masque les centimes nuls.
  const partieDecimale = decimales === '00' ? '' : `,${decimales}`;
  return `${valeur < 0 ? '-' : ''}${groupes}${partieDecimale} ${devise}`;
};

/**
 * Formate une date au format du cahier des charges : 14/09/2026 - 14:06.
 *
 * Le Togo est à UTC+0 sans heure d'été : les composantes UTC donnent donc
 * l'heure locale de Lomé, quel que soit le fuseau du serveur.
 */
const formaterDate = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  const deux = (n) => String(n).padStart(2, '0');
  return `${deux(d.getUTCDate())}/${deux(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}` +
    ` - ${deux(d.getUTCHours())}:${deux(d.getUTCMinutes())}`;
};

const LIBELLES_METHODE = {
  FLOOZ: 'Mobile Money - Flooz',
  TMONEY: 'Mobile Money - T-Money',
  VIREMENT_BANCAIRE: 'Virement bancaire',
  VISA_BUSINESS: 'Carte VISA Business'
};

const LIBELLES_PRESTATAIRE = {
  PAYGATE_GLOBAL: 'PAYGATE GLOBAL',
  ECOBANK: 'ECOBANK'
};

const LIBELLES_STATUT_RECU = {
  CONFIRME: 'PAIEMENT CONFIRMÉ',
  RAPPROCHE: 'PAIEMENT CONFIRMÉ ET RAPPROCHÉ'
};

// ─────────────────────────────────────────────────────────────────────────────
// Génération du PDF
// ─────────────────────────────────────────────────────────────────────────────

const COULEURS = {
  encre: '#1a1a1a',
  gris: '#6b7280',
  filet: '#e5e7eb',
  accent: '#0f766e',
  fondStatut: '#ecfdf5'
};

/**
 * Trace une coche vectorielle.
 *
 * Le caractère ✓ n'existe pas dans les polices standard des PDF : il
 * s'afficherait comme un carré. On le dessine donc comme un tracé.
 */
const dessinerCoche = (doc, x, y, taille, couleur) => {
  doc.save()
    .lineWidth(taille * 0.18)
    .lineCap('round')
    .lineJoin('round')
    .strokeColor(couleur)
    .moveTo(x, y + taille * 0.55)
    .lineTo(x + taille * 0.38, y + taille * 0.9)
    .lineTo(x + taille, y + taille * 0.1)
    .stroke()
    .restore();
};

/**
 * Écrit une paire libellé / valeur, la valeur étant alignée sur une colonne
 * fixe pour que plusieurs lignes successives restent lisibles d'un coup d'œil.
 */
const paire = (doc, x, colonne, libelle, valeur, taille) => {
  const y = doc.y;
  doc.font('Helvetica').fontSize(taille).fillColor(COULEURS.gris).text(libelle, x, y, { lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(taille).fillColor(COULEURS.encre)
    .text(valeur || '—', x + colonne, y, { lineBreak: false });
  doc.y = y + taille * 1.45;
  doc.x = x;
};

/**
 * Produit le PDF d'un reçu.
 *
 * @param {object} paiement  Paiement confirmé, avec numeroRecu renseigné
 * @returns {Promise<Buffer>}
 */
const genererRecuPDF = async (paiement) => {
  if (!STATUTS_RECU.includes(paiement.statut)) {
    throw new Error(`Aucun reçu pour un paiement au statut ${paiement.statut}.`);
  }
  if (!paiement.numeroRecu) {
    throw new Error('Numéro de reçu absent.');
  }

  const signature = signerRecu(paiement);
  const lien = urlVerification(paiement.numeroRecu, signature);
  const qr = await QRCode.toBuffer(lien, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 360
  });

  const doc = new PDFDocument({
    size: 'A5',
    margins: { top: 44, bottom: 40, left: 44, right: 44 },
    info: {
      Title: `Reçu ${paiement.numeroRecu}`,
      Author: 'SAYGOO Logistics',
      Subject: `Reçu de paiement ${paiement.reference}`
    }
  });

  const morceaux = [];
  doc.on('data', (m) => morceaux.push(m));
  const termine = new Promise((resoudre, rejeter) => {
    doc.on('end', () => resoudre(Buffer.concat(morceaux)));
    doc.on('error', rejeter);
  });

  const gauche = doc.page.margins.left;
  const largeur = doc.page.width - gauche - doc.page.margins.right;

  // ── En-tête ────────────────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COULEURS.encre)
    .text('SAYGOO LOGISTICS', gauche, doc.y, { width: largeur, align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor(COULEURS.gris)
    .text('REÇU DE PAIEMENT', { width: largeur, align: 'center', characterSpacing: 1.5 });

  doc.moveDown(0.9);
  paire(doc, gauche, 62, 'Reçu', paiement.numeroRecu, 9);
  paire(doc, gauche, 62, 'Transaction', paiement.reference, 9);

  const filet = () => {
    doc.moveDown(0.6);
    doc.moveTo(gauche, doc.y).lineTo(gauche + largeur, doc.y)
      .lineWidth(0.6).strokeColor(COULEURS.filet).stroke();
    doc.moveDown(0.6);
  };

  const rubrique = (titre, ...lignes) => {
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COULEURS.gris)
      .text(titre.toUpperCase(), gauche, doc.y, { characterSpacing: 0.8 });
    doc.moveDown(0.15);
    lignes.filter(Boolean).forEach((ligne, i) => {
      doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(i === 0 ? 10.5 : 9)
        .fillColor(i === 0 ? COULEURS.encre : COULEURS.gris)
        .text(ligne, { width: largeur });
    });
    doc.moveDown(0.55);
  };

  filet();

  // ── Corps ──────────────────────────────────────────────────────────────────
  rubrique('Client', paiement.clientNom);
  if (paiement.factureNum) rubrique('Facture', paiement.factureNum);

  const service = paiement.serviceRendu || 'Prestation logistique';
  rubrique(
    'Service',
    paiement.conteneurNum ? `${service} - Conteneur ${paiement.conteneurNum}` : service,
    paiement.dossierRef ? `Dossier ${paiement.dossierRef}` : null
  );

  // Montant mis en valeur : c'est l'information que le vérificateur contrôle.
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COULEURS.gris)
    .text('MONTANT', gauche, doc.y, { characterSpacing: 0.8 });
  doc.moveDown(0.1);
  doc.font('Helvetica-Bold').fontSize(19).fillColor(COULEURS.encre)
    .text(formaterMontant(paiement.montant, paiement.devise), { width: largeur });
  doc.moveDown(0.55);

  rubrique(
    'Moyen de paiement',
    LIBELLES_METHODE[paiement.methode] || paiement.methode,
    paiement.prestataire ? `via ${LIBELLES_PRESTATAIRE[paiement.prestataire] || paiement.prestataire}` : null
  );
  rubrique('Date', formaterDate(paiement.datePaiement || paiement.updatedAt || paiement.createdAt));

  // ── Statut ─────────────────────────────────────────────────────────────────
  const hauteurStatut = 26;
  const yStatut = doc.y;
  doc.roundedRect(gauche, yStatut, largeur, hauteurStatut, 4).fill(COULEURS.fondStatut);
  dessinerCoche(doc, gauche + 11, yStatut + 8, 10, COULEURS.accent);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COULEURS.accent)
    .text(LIBELLES_STATUT_RECU[paiement.statut], gauche + 30, yStatut + 8.5, { width: largeur - 40 });
  doc.y = yStatut + hauteurStatut;

  filet();

  // ── Références ─────────────────────────────────────────────────────────────
  paire(doc, gauche, 102, 'Référence fournisseur',
    paiement.referenceExterne || paiement.numeroTransaction, 8);
  paire(doc, gauche, 102, 'Référence SAYGOO', paiement.reference, 8);

  // ── QR code de vérification ────────────────────────────────────────────────
  // Placé en pied de page, à position fixe, pour qu'il reste au même endroit
  // quelle que soit la longueur du corps.
  const tailleQr = 92;
  const yQr = doc.page.height - doc.page.margins.bottom - tailleQr - 4;
  doc.image(qr, gauche, yQr, { width: tailleQr, height: tailleQr });

  const xTexte = gauche + tailleQr + 14;
  const largeurTexte = largeur - tailleQr - 14;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COULEURS.encre)
    .text('QR code de vérification', xTexte, yQr + 10, { width: largeurTexte });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(7.5).fillColor(COULEURS.gris)
    .text(
      'Scannez ce code pour vérifier que ce reçu a bien été émis par SAYGOO et ' +
      "qu'il n'a pas été modifié.",
      { width: largeurTexte, lineGap: 1 }
    );
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(6.5).fillColor(COULEURS.gris)
    .text('Document généré électroniquement.', { width: largeurTexte });

  doc.end();
  return termine;
};

module.exports = {
  STATUTS_RECU,
  LONGUEUR_SIGNATURE,
  signerRecu,
  signatureValide,
  urlVerification,
  formaterMontant,
  formaterDate,
  genererRecuPDF
};
