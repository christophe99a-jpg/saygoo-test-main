/**
 * Initialisation du référentiel comptable.
 *
 * Plan de comptes SYSCOHADA révisé (AUDCIF 2017), restreint aux comptes utiles
 * à une activité de transit, transport et entreposage. L'Acte uniforme impose
 * que le plan de chaque entité soit « suffisamment détaillé pour permettre
 * l'enregistrement des opérations » : cette base est donc à compléter par le
 * comptable selon les besoins réels.
 *
 * Lancement : node prisma/seed.js
 */

const prisma = require('../src/config/prisma');

const COMPTES = [
  // ── Classe 1 : ressources durables ────────────────────────────────────────
  ['101', 'Capital social', 'CLASSE_1', 'CREDIT'],
  ['106', 'Réserves', 'CLASSE_1', 'CREDIT'],
  ['110', 'Report à nouveau créditeur', 'CLASSE_1', 'CREDIT'],
  ['129', 'Report à nouveau débiteur', 'CLASSE_1', 'DEBIT'],
  ['130', 'Résultat net de l\'exercice', 'CLASSE_1', 'CREDIT'],
  ['162', 'Emprunts auprès des établissements de crédit', 'CLASSE_1', 'CREDIT'],

  // ── Classe 2 : actif immobilisé ───────────────────────────────────────────
  ['2441', 'Matériel informatique', 'CLASSE_2', 'DEBIT'],
  ['2442', 'Matériel de bureau', 'CLASSE_2', 'DEBIT'],
  ['2451', 'Matériel de transport — véhicules utilitaires', 'CLASSE_2', 'DEBIT'],
  ['2452', 'Matériel de transport — porte-conteneurs', 'CLASSE_2', 'DEBIT'],
  ['2481', 'Matériel de manutention', 'CLASSE_2', 'DEBIT'],
  ['2844', 'Amortissements du matériel de bureau et informatique', 'CLASSE_2', 'CREDIT'],
  ['2845', 'Amortissements du matériel de transport', 'CLASSE_2', 'CREDIT'],

  // ── Classe 3 : stocks ─────────────────────────────────────────────────────
  ['331', 'Marchandises en entrepôt', 'CLASSE_3', 'DEBIT'],
  ['335', 'Fournitures et consommables', 'CLASSE_3', 'DEBIT'],

  // ── Classe 4 : tiers ──────────────────────────────────────────────────────
  ['4011', 'Fournisseurs locaux', 'CLASSE_4', 'CREDIT', true],
  ['4012', 'Fournisseurs étrangers', 'CLASSE_4', 'CREDIT', true],
  ['4013', 'Transporteurs sous-traitants', 'CLASSE_4', 'CREDIT', true],
  ['409', 'Fournisseurs débiteurs', 'CLASSE_4', 'DEBIT', true],
  ['4111', 'Clients locaux', 'CLASSE_4', 'DEBIT', true],
  ['4112', 'Clients étrangers', 'CLASSE_4', 'DEBIT', true],
  ['416', 'Clients douteux ou litigieux', 'CLASSE_4', 'DEBIT', true],
  ['419', 'Clients créditeurs — avances et acomptes reçus', 'CLASSE_4', 'CREDIT', true],
  ['421', 'Personnel — rémunérations dues', 'CLASSE_4', 'CREDIT'],
  ['431', 'Sécurité sociale', 'CLASSE_4', 'CREDIT'],
  ['4431', 'État — TVA facturée sur prestations', 'CLASSE_4', 'CREDIT'],
  ['4441', 'État — TVA due', 'CLASSE_4', 'CREDIT'],
  ['4452', 'État — TVA récupérable sur achats', 'CLASSE_4', 'DEBIT'],
  ['447', 'État — impôts retenus à la source', 'CLASSE_4', 'CREDIT'],
  ['4471', 'Droits de douane et taxes portuaires à reverser', 'CLASSE_4', 'CREDIT'],
  ['471', 'Débiteurs divers', 'CLASSE_4', 'DEBIT'],
  ['472', 'Créditeurs divers', 'CLASSE_4', 'CREDIT'],
  ['4781', 'Débours clients — avances sur frais portuaires', 'CLASSE_4', 'DEBIT', true],

  // ── Classe 5 : trésorerie ─────────────────────────────────────────────────
  ['5211', 'Banque Ecobank — compte courant', 'CLASSE_5', 'DEBIT'],
  ['5212', 'Banque — second établissement', 'CLASSE_5', 'DEBIT'],
  ['5231', 'Compte de monnaie électronique — Flooz', 'CLASSE_5', 'DEBIT'],
  ['5232', 'Compte de monnaie électronique — T-Money', 'CLASSE_5', 'DEBIT'],
  ['5241', 'Compte Logistique Numérique — fonds clients', 'CLASSE_5', 'DEBIT'],
  ['5242', 'Compte Logistique Numérique — fonds réservés (escrow)', 'CLASSE_5', 'DEBIT'],
  ['571', 'Caisse siège', 'CLASSE_5', 'DEBIT'],
  ['585', 'Virements de fonds internes', 'CLASSE_5', 'DEBIT'],

  // ── Classe 6 : charges ────────────────────────────────────────────────────
  ['6051', 'Fournitures de bureau', 'CLASSE_6', 'DEBIT'],
  ['6052', 'Carburant et lubrifiants', 'CLASSE_6', 'DEBIT'],
  ['611', 'Transports sur achats', 'CLASSE_6', 'DEBIT'],
  ['6131', 'Transport sous-traité — fret terrestre', 'CLASSE_6', 'DEBIT'],
  ['6132', 'Transport sous-traité — fret maritime', 'CLASSE_6', 'DEBIT'],
  ['6133', 'Manutention et acconage', 'CLASSE_6', 'DEBIT'],
  ['6134', 'Frais de magasinage et d\'entreposage', 'CLASSE_6', 'DEBIT'],
  ['622', 'Locations et charges locatives', 'CLASSE_6', 'DEBIT'],
  ['624', 'Entretien et réparations des véhicules', 'CLASSE_6', 'DEBIT'],
  ['625', 'Primes d\'assurance', 'CLASSE_6', 'DEBIT'],
  ['6251', 'Assurance de la marchandise transportée', 'CLASSE_6', 'DEBIT'],
  ['627', 'Publicité et relations publiques', 'CLASSE_6', 'DEBIT'],
  ['6311', 'Frais bancaires', 'CLASSE_6', 'DEBIT'],
  ['6312', 'Commissions sur encaissements électroniques', 'CLASSE_6', 'DEBIT'],
  ['632', 'Rémunérations d\'intermédiaires et honoraires', 'CLASSE_6', 'DEBIT'],
  ['641', 'Impôts et taxes directs', 'CLASSE_6', 'DEBIT'],
  ['6611', 'Salaires et appointements', 'CLASSE_6', 'DEBIT'],
  ['664', 'Charges sociales', 'CLASSE_6', 'DEBIT'],
  ['6811', 'Dotations aux amortissements d\'exploitation', 'CLASSE_6', 'DEBIT'],
  ['6591', 'Pertes sur créances irrécouvrables', 'CLASSE_6', 'DEBIT'],

  // ── Classe 7 : produits ───────────────────────────────────────────────────
  ['7061', 'Prestations de transit et dédouanement', 'CLASSE_7', 'CREDIT'],
  ['7062', 'Prestations de transport terrestre', 'CLASSE_7', 'CREDIT'],
  ['7063', 'Prestations d\'entreposage et magasinage', 'CLASSE_7', 'CREDIT'],
  ['7064', 'Prestations de manutention', 'CLASSE_7', 'CREDIT'],
  ['7065', 'Prestations de consignation', 'CLASSE_7', 'CREDIT'],
  ['7066', 'Commissions d\'intermédiation logistique', 'CLASSE_7', 'CREDIT'],
  ['707', 'Produits accessoires', 'CLASSE_7', 'CREDIT'],
  ['7071', 'Frais de dossier et services administratifs', 'CLASSE_7', 'CREDIT'],
  ['7191', 'Rabais, remises et ristournes accordés', 'CLASSE_7', 'DEBIT'],
  ['771', 'Revenus financiers', 'CLASSE_7', 'CREDIT'],

  // ── Classe 8 : hors activités ordinaires ──────────────────────────────────
  ['831', 'Charges hors activités ordinaires', 'CLASSE_8', 'DEBIT'],
  ['821', 'Produits hors activités ordinaires', 'CLASSE_8', 'CREDIT']
];

const JOURNAUX = [
  ['VE', 'Journal des ventes', 'VENTE'],
  ['AC', 'Journal des achats', 'ACHAT'],
  ['BQ', 'Journal de banque', 'BANQUE'],
  ['CA', 'Journal de caisse', 'CAISSE'],
  ['OD', 'Journal des opérations diverses', 'OPERATIONS_DIVERSES'],
  ['AN', 'Journal des à-nouveaux', 'A_NOUVEAUX']
];

const seed = async () => {
  console.log('Initialisation du plan comptable SYSCOHADA...');

  for (const [numero, intitule, classe, sens, collectif] of COMPTES) {
    await prisma.compteComptable.upsert({
      where: { numero },
      update: { intitule, classe, sens, collectif: Boolean(collectif) },
      create: { numero, intitule, classe, sens, collectif: Boolean(collectif) }
    });
  }
  console.log(`  ${COMPTES.length} comptes en place.`);

  for (const [code, libelle, type] of JOURNAUX) {
    await prisma.journal.upsert({
      where: { code },
      update: { libelle, type },
      create: { code, libelle, type }
    });
  }
  console.log(`  ${JOURNAUX.length} journaux en place.`);

  // Exercice de l'année courante, s'il n'existe pas déjà
  const annee = new Date().getFullYear();
  const exercice = await prisma.exercice.findUnique({ where: { annee } });
  if (!exercice) {
    await prisma.exercice.create({
      data: {
        annee,
        dateDebut: new Date(`${annee}-01-01T00:00:00Z`),
        dateFin: new Date(`${annee}-12-31T23:59:59Z`)
      }
    });
    console.log(`  Exercice ${annee} ouvert.`);
  } else {
    console.log(`  Exercice ${annee} déjà présent.`);
  }

  console.log('Terminé.');
};

seed()
  .catch((err) => {
    console.error('Échec du seed :', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
