/**
 * Règles comptables SYSCOHADA.
 *
 * Ces fonctions sont volontairement pures : aucun accès à la base, aucun
 * effet de bord. Elles concentrent les invariants comptables et sont
 * testables isolément.
 */

/**
 * Arrondi monétaire à 2 décimales.
 *
 * Les montants transitent en Decimal(15,2) côté base, mais JavaScript
 * manipule des flottants. Sans arrondi explicite, 0.1 + 0.2 donne
 * 0.30000000000000004 et le contrôle d'équilibre échoue à tort.
 */
const arrondir = (montant) => Math.round((Number(montant) + Number.EPSILON) * 100) / 100;

/**
 * Somme d'un champ sur un ensemble de lignes, arrondie.
 */
const totaliser = (lignes, champ) =>
  arrondir(lignes.reduce((somme, ligne) => somme + Number(ligne[champ] || 0), 0));

/**
 * Valide un ensemble de lignes d'écriture.
 *
 * Invariants vérifiés :
 *  1. au moins deux lignes (une écriture en partie double a deux sens)
 *  2. chaque ligne porte un débit OU un crédit, jamais les deux, jamais aucun
 *  3. aucun montant négatif : un sens inverse s'exprime par l'autre colonne
 *  4. total débit = total crédit
 *
 * @returns {{valide: boolean, erreurs: string[], totalDebit: number, totalCredit: number}}
 */
const validerLignes = (lignes) => {
  const erreurs = [];

  if (!Array.isArray(lignes) || lignes.length < 2) {
    erreurs.push('Une écriture comptable comporte au moins deux lignes.');
    return { valide: false, erreurs, totalDebit: 0, totalCredit: 0 };
  }

  lignes.forEach((ligne, index) => {
    const numero = index + 1;
    const debit = Number(ligne.debit || 0);
    const credit = Number(ligne.credit || 0);

    if (!ligne.compteNumero) {
      erreurs.push(`Ligne ${numero} : compte comptable absent.`);
    }

    if (debit < 0 || credit < 0) {
      erreurs.push(`Ligne ${numero} : montant négatif interdit. Utilisez la colonne opposée.`);
    }

    if (debit > 0 && credit > 0) {
      erreurs.push(`Ligne ${numero} : une ligne porte un débit ou un crédit, pas les deux.`);
    }

    if (debit === 0 && credit === 0) {
      erreurs.push(`Ligne ${numero} : montant nul.`);
    }
  });

  const totalDebit = totaliser(lignes, 'debit');
  const totalCredit = totaliser(lignes, 'credit');

  if (totalDebit !== totalCredit) {
    const ecart = arrondir(totalDebit - totalCredit);
    erreurs.push(
      `Écriture déséquilibrée : débit ${totalDebit}, crédit ${totalCredit}, écart ${ecart}.`
    );
  }

  return { valide: erreurs.length === 0, erreurs, totalDebit, totalCredit };
};

/**
 * Déduit la classe SYSCOHADA d'un numéro de compte.
 * Le premier chiffre porte la classe, de 1 à 8.
 */
const classeDuCompte = (numero) => {
  const premier = String(numero).charAt(0);
  if (!/^[1-8]$/.test(premier)) return null;
  return `CLASSE_${premier}`;
};

/**
 * Sens normal d'un compte selon sa classe.
 *
 * Emplois (actif, charges) au débit ; ressources (passif, produits) au crédit.
 * La classe 8 regroupe charges et produits HAO : son sens dépend du compte,
 * on ne peut donc pas le déduire de la seule classe.
 */
const sensNormal = (numero) => {
  const premier = String(numero).charAt(0);
  switch (premier) {
    case '2': // actif immobilisé
    case '3': // stocks
    case '6': // charges
      return 'DEBIT';
    case '1': // ressources durables
    case '7': // produits
      return 'CREDIT';
    case '4': // tiers : créances au débit, dettes au crédit
    case '5': // trésorerie : selon le compte
    case '8': // HAO : charges et produits mêlés
      return null;
    default:
      return null;
  }
};

/**
 * Vérifie qu'une date tombe dans les bornes d'un exercice ouvert.
 */
const verifierExercice = (dateEcriture, exercice) => {
  if (!exercice) {
    return { valide: false, erreur: 'Aucun exercice ne couvre cette date.' };
  }
  if (exercice.statut === 'CLOTURE') {
    return { valide: false, erreur: `L'exercice ${exercice.annee} est clôturé.` };
  }

  const date = new Date(dateEcriture);
  if (date < new Date(exercice.dateDebut) || date > new Date(exercice.dateFin)) {
    return {
      valide: false,
      erreur: `La date ${date.toISOString().slice(0, 10)} est hors de l'exercice ${exercice.annee}.`
    };
  }

  return { valide: true };
};

/**
 * Construit les lignes d'extourne : débits et crédits inversés.
 *
 * SYSCOHADA interdit de supprimer une écriture validée. La correction passe
 * par une écriture inverse qui laisse les deux traces dans le journal.
 */
const inverserLignes = (lignes) =>
  lignes.map((ligne) => ({
    compteNumero: ligne.compteNumero ?? ligne.compte?.numero,
    tiersCode: ligne.tiersCode,
    libelle: `Extourne — ${ligne.libelle}`,
    debit: arrondir(Number(ligne.credit || 0)),
    credit: arrondir(Number(ligne.debit || 0)),
    ordre: ligne.ordre
  }));

/**
 * Calcule le solde d'un compte à partir de ses mouvements.
 * Le sens du solde suit la colonne dominante.
 */
const calculerSolde = (mouvements) => {
  const debit = totaliser(mouvements, 'debit');
  const credit = totaliser(mouvements, 'credit');
  const solde = arrondir(debit - credit);

  return {
    totalDebit: debit,
    totalCredit: credit,
    soldeDebiteur: solde > 0 ? solde : 0,
    soldeCrediteur: solde < 0 ? arrondir(-solde) : 0,
    sens: solde > 0 ? 'DEBIT' : solde < 0 ? 'CREDIT' : 'EQUILIBRE'
  };
};

/**
 * Répartit des créances par tranche d'ancienneté.
 * Tranches usuelles du recouvrement : à échoir, 1-30, 31-60, 61-90, plus de 90.
 */
const repartirParAnciennete = (creances, dateReference = new Date()) => {
  const tranches = {
    aEchoir: 0,
    jours1a30: 0,
    jours31a60: 0,
    jours61a90: 0,
    plus90: 0,
    total: 0
  };

  creances.forEach((creance) => {
    const echeance = new Date(creance.dateEcheance);
    const jours = Math.floor((dateReference - echeance) / 86400000);
    const montant = Number(creance.montant || 0);

    if (jours <= 0) tranches.aEchoir += montant;
    else if (jours <= 30) tranches.jours1a30 += montant;
    else if (jours <= 60) tranches.jours31a60 += montant;
    else if (jours <= 90) tranches.jours61a90 += montant;
    else tranches.plus90 += montant;

    tranches.total += montant;
  });

  Object.keys(tranches).forEach((cle) => {
    tranches[cle] = arrondir(tranches[cle]);
  });

  return tranches;
};

module.exports = {
  arrondir,
  totaliser,
  validerLignes,
  classeDuCompte,
  sensNormal,
  verifierExercice,
  inverserLignes,
  calculerSolde,
  repartirParAnciennete
};
