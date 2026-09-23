/**
 * Règles d'accès aux paiements.
 *
 * Un paiement a deux organisations :
 *
 *   organisationId          l'organisation du client qui paie (l'importateur).
 *                           C'est son Compte Logistique Numérique qui est concerné.
 *
 *   suiviParOrganisationId  l'organisation qui suit le paiement pour lui,
 *                           typiquement le CDA qui l'a initié.
 *
 * Un utilisateur voit un paiement si son organisation figure dans l'un ou
 * l'autre champ. Le personnel SAYGOO voit tous les paiements.
 *
 * Toutes les lectures et toutes les actions passent par ce module : c'est
 * ce qui garantit qu'aucun point d'entrée n'oublie le contrôle.
 */

/** Personnel SAYGOO : accès à toutes les organisations. */
const PERSONNEL_SAYGOO = ['SUPER_ADMIN', 'ADMIN', 'COMPTABLE', 'MANAGER'];

const estPersonnel = (utilisateur) => PERSONNEL_SAYGOO.includes(utilisateur?.role);

const erreurSansOrganisation = () => {
  const err = new Error('Aucune organisation rattachée au compte utilisateur.');
  err.code = 'SANS_ORGANISATION';
  return err;
};

/**
 * Condition Prisma limitant une requête aux paiements visibles.
 *
 * Un utilisateur hors personnel et sans organisation lève une erreur plutôt
 * que de recevoir un filtre vide : un filtre vide renverrait TOUS les
 * paiements, ce qui est exactement la fuite qu'on cherche à fermer.
 */
const filtreAcces = (utilisateur) => {
  if (estPersonnel(utilisateur)) return {};

  const organisation = utilisateur?.orgId;
  if (!organisation) throw erreurSansOrganisation();

  return {
    OR: [
      { organisationId: organisation },
      { suiviParOrganisationId: organisation }
    ]
  };
};

/** Indique si un utilisateur peut consulter ou agir sur un paiement donné. */
const peutAcceder = (utilisateur, paiement) => {
  if (!paiement) return false;
  if (estPersonnel(utilisateur)) return true;

  const organisation = utilisateur?.orgId;
  if (!organisation) return false;

  return paiement.organisationId === organisation ||
    paiement.suiviParOrganisationId === organisation;
};

/**
 * Détermine les deux organisations d'un paiement au moment de sa création.
 *
 * - L'importateur qui paie lui-même : le paiement est à lui, personne ne le suit.
 * - Un CDA qui initie pour un client : le paiement est au client, le CDA le suit.
 * - Le personnel SAYGOO : le paiement est au client, sans suivi.
 *
 * @returns {{organisationId: string, suiviParOrganisationId: string|null}}
 */
const organisationsDuPaiement = (utilisateur, { clientOrganisationId, clientId }) => {
  if (utilisateur?.role === 'OPERATEUR_ECONOMIQUE') {
    if (!utilisateur.orgId) throw erreurSansOrganisation();
    return { organisationId: utilisateur.orgId, suiviParOrganisationId: null };
  }

  // Tant que chaque compte est sa propre organisation, l'organisation du
  // client est son identifiant. clientOrganisationId permet de la fournir
  // explicitement le jour où ce ne sera plus le cas.
  const organisationClient = clientOrganisationId || clientId || null;

  if (estPersonnel(utilisateur)) {
    return { organisationId: organisationClient, suiviParOrganisationId: null };
  }

  if (!utilisateur?.orgId) throw erreurSansOrganisation();
  return { organisationId: organisationClient, suiviParOrganisationId: utilisateur.orgId };
};

module.exports = {
  PERSONNEL_SAYGOO,
  estPersonnel,
  erreurSansOrganisation,
  filtreAcces,
  peutAcceder,
  organisationsDuPaiement
};
