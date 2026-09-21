const prisma = require('../config/prisma');

/**
 * Cycle de vie d'un paiement SAYGOO.
 *
 * Le cahier des charges définit huit statuts et leur enchaînement :
 *
 *   CREE → INITIE → EN_ATTENTE_CONFIRMATION → CONFIRME → RAPPROCHE
 *                                                 ↓
 *                            ECHEC | REMBOURSEMENT_DEMANDE | ANNULE
 *
 * RAPPROCHE est le statut qui distingue un simple encaissement d'un
 * paiement réellement rattaché à sa facture, son dossier et son conteneur.
 * C'est lui qui fait du CLN un outil de contrôle financier et non un
 * simple journal de transactions.
 */

const STATUTS = {
  CREE: 'CREE',
  INITIE: 'INITIE',
  EN_ATTENTE_CONFIRMATION: 'EN_ATTENTE_CONFIRMATION',
  CONFIRME: 'CONFIRME',
  RAPPROCHE: 'RAPPROCHE',
  ECHEC: 'ECHEC',
  REMBOURSEMENT_DEMANDE: 'REMBOURSEMENT_DEMANDE',
  ANNULE: 'ANNULE'
};

/**
 * Transitions autorisées. Toute transition absente de cette table
 * est refusée : c'est ce qui empêche un webhook tardif de faire
 * repasser un paiement rapproché à « en attente ».
 */
const TRANSITIONS = {
  CREE: ['INITIE', 'ANNULE'],
  INITIE: ['EN_ATTENTE_CONFIRMATION', 'CONFIRME', 'ECHEC', 'ANNULE'],
  EN_ATTENTE_CONFIRMATION: ['CONFIRME', 'ECHEC', 'ANNULE'],
  CONFIRME: ['RAPPROCHE', 'REMBOURSEMENT_DEMANDE'],
  RAPPROCHE: ['REMBOURSEMENT_DEMANDE'],
  // États terminaux : plus aucune transition.
  ECHEC: [],
  REMBOURSEMENT_DEMANDE: [],
  ANNULE: []
};

/**
 * Deux notions à ne pas confondre.
 *
 * TERMINAL : le paiement n'a plus aucune transition possible. Cette liste
 * se déduit de TRANSITIONS, elle n'est pas écrite à la main : impossible
 * qu'elle diverge de la table si celle-ci évolue.
 */
const STATUTS_TERMINAUX = Object.keys(TRANSITIONS).filter(
  (statut) => TRANSITIONS[statut].length === 0
);

/**
 * FIGÉ POUR LES WEBHOOKS : un prestataire ne doit plus modifier ces
 * paiements. RAPPROCHE en fait partie sans être terminal — le comptable
 * peut encore déclencher un remboursement, mais une notification tardive
 * de PayGate ne doit pas défaire son rapprochement.
 */
const STATUTS_FIGES_WEBHOOK = [...STATUTS_TERMINAUX, 'RAPPROCHE'];

/** Libellés destinés à l'interface, avec leur pastille de couleur. */
const LIBELLES = {
  CREE: { texte: 'Créé', couleur: 'jaune' },
  INITIE: { texte: 'Paiement initié', couleur: 'bleu' },
  EN_ATTENTE_CONFIRMATION: { texte: 'En attente de confirmation', couleur: 'orange' },
  CONFIRME: { texte: 'Paiement confirmé', couleur: 'vert' },
  RAPPROCHE: { texte: 'Rapproché', couleur: 'vert' },
  ECHEC: { texte: 'Échec', couleur: 'rouge' },
  REMBOURSEMENT_DEMANDE: { texte: 'Remboursement demandé', couleur: 'violet' },
  ANNULE: { texte: 'Annulé', couleur: 'gris' }
};

/**
 * Indique si une transition est permise.
 */
const transitionPermise = (depuis, vers) =>
  Array.isArray(TRANSITIONS[depuis]) && TRANSITIONS[depuis].includes(vers);

/**
 * Valide une transition et explique le refus le cas échéant.
 *
 * @returns {{valide: boolean, raison?: string, terminal?: boolean}}
 */
const verifierTransition = (depuis, vers) => {
  if (!STATUTS[depuis]) {
    return { valide: false, raison: `Statut de départ inconnu : ${depuis}.` };
  }
  if (!STATUTS[vers]) {
    return { valide: false, raison: `Statut d'arrivée inconnu : ${vers}.` };
  }
  if (depuis === vers) {
    return { valide: false, raison: 'Le paiement est déjà dans cet état.', terminal: false };
  }
  if (STATUTS_TERMINAUX.includes(depuis)) {
    return {
      valide: false,
      raison: `Le paiement est ${LIBELLES[depuis].texte.toLowerCase()} : son état ne change plus.`,
      terminal: true
    };
  }
  if (!transitionPermise(depuis, vers)) {
    return {
      valide: false,
      raison: `Transition interdite : ${depuis} vers ${vers}. Attendu : ${TRANSITIONS[depuis].join(', ') || 'aucune'}.`
    };
  }
  return { valide: true };
};

/**
 * Traduit le statut renvoyé par un prestataire vers le vocabulaire SAYGOO.
 *
 * Chaque prestataire a ses propres libellés ; cette table les rassemble
 * pour éviter que le vocabulaire externe ne se répande dans le code métier.
 */
const STATUTS_PRESTATAIRES = {
  SUCCESS: STATUTS.CONFIRME,
  SUCCESSFUL: STATUTS.CONFIRME,
  COMPLETED: STATUTS.CONFIRME,
  PAID: STATUTS.CONFIRME,
  PENDING: STATUTS.EN_ATTENTE_CONFIRMATION,
  PROCESSING: STATUTS.EN_ATTENTE_CONFIRMATION,
  FAILED: STATUTS.ECHEC,
  ERROR: STATUTS.ECHEC,
  DECLINED: STATUTS.ECHEC,
  CANCELLED: STATUTS.ANNULE,
  CANCELED: STATUTS.ANNULE
};

const traduireStatutPrestataire = (statutExterne) => {
  if (!statutExterne) return null;
  return STATUTS_PRESTATAIRES[String(statutExterne).toUpperCase()] || null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Références
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Génère une référence de paiement au format du cahier des charges :
 * SAY-PAY-20260914-00087
 *
 * La numérotation repart de 1 chaque jour, via une séquence PostgreSQL
 * nommée d'après la date. Une séquence est atomique : contrairement à un
 * `count() + 1`, elle ne peut pas rendre deux fois la même valeur, même
 * si dix paiements sont créés dans la même milliseconde.
 *
 * @param {object} [client] Client Prisma ou transaction en cours
 */
const genererReferencePaiement = async (client = prisma) => {
  const jour = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const sequence = `seq_paiement_${jour}`;

  await client.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS ${sequence}`);
  const [resultat] = await client.$queryRawUnsafe(
    `SELECT nextval('${sequence}') AS valeur`
  );

  return `SAY-PAY-${jour}-${String(resultat.valeur).padStart(5, '0')}`;
};

/**
 * Référence d'instruction de paiement : SAY-INS-20260914-00012
 */
const genererReferenceInstruction = async (client = prisma) => {
  const jour = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const sequence = `seq_instruction_${jour}`;

  await client.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS ${sequence}`);
  const [resultat] = await client.$queryRawUnsafe(
    `SELECT nextval('${sequence}') AS valeur`
  );

  return `SAY-INS-${jour}-${String(resultat.valeur).padStart(5, '0')}`;
};

/** Vérifie qu'une chaîne respecte le format SAY-PAY-AAAAMMJJ-NNNNN. */
const referenceValide = (reference) =>
  /^SAY-PAY-\d{8}-\d{5}$/.test(String(reference || ''));

module.exports = {
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
};
