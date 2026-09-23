const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const {
  STATUTS,
  STATUTS_FIGES_WEBHOOK,
  LIBELLES,
  verifierTransition,
  traduireStatutPrestataire,
  genererReferencePaiement
} = require('../services/paiement.etats');
const {
  filtreAcces,
  peutAcceder,
  organisationsDuPaiement
} = require('../services/acces');

/**
 * Les quatre moyens de paiement retenus par le cahier des charges.
 * Le schéma Prisma les impose aussi, mais on vérifie ici pour renvoyer
 * un 400 lisible plutôt qu'une erreur Prisma incompréhensible.
 */
const METHODES = {
  VIREMENT_BANCAIRE: { prestataire: 'ECOBANK', mobileMoney: false },
  VISA_BUSINESS: { prestataire: 'ECOBANK', mobileMoney: false },
  FLOOZ: { prestataire: 'PAYGATE_GLOBAL', mobileMoney: true },
  TMONEY: { prestataire: 'PAYGATE_GLOBAL', mobileMoney: true }
};

/**
 * Réponse d'erreur commune. Un utilisateur sans organisation reçoit un 403
 * explicite ; toute autre erreur reste générique côté client, son détail
 * n'apparaissant que dans les logs.
 */
const erreurInterne = (res, err) => {
  if (err?.code === 'SANS_ORGANISATION') {
    return res.status(403).json({
      success: false,
      message: "Votre compte n'est rattaché à aucune organisation."
    });
  }
  return res.status(500).json({ success: false, message: 'Erreur interne.' });
};

// ─────────────────────────────────────────────────────────────────────────────
// Transition unique
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Seul point d'entrée pour changer le statut d'un paiement.
 *
 * Tout changement d'état passe par ici : la transition est validée par la
 * machine à états, puis le statut et la ligne de timeline sont écrits dans
 * la même transaction. Aucun contrôleur n'écrit plus `statut` directement,
 * ce qui garantit que la timeline reste complète.
 *
 * @param {object} paiement  Paiement actuel
 * @param {string} vers      Statut cible
 * @param {object} options
 * @param {string} options.message  Libellé de l'événement pour la timeline
 * @param {object} [options.champs] Champs supplémentaires à mettre à jour
 * @param {object} [options.data]   Données brutes à archiver
 * @param {object} [options.client] Transaction Prisma en cours
 * @returns {Promise<{ok: boolean, paiement?: object, raison?: string, terminal?: boolean}>}
 */
const appliquerTransition = async (paiement, vers, options = {}) => {
  const controle = verifierTransition(paiement.statut, vers);
  if (!controle.valide) {
    return { ok: false, raison: controle.raison, terminal: controle.terminal };
  }

  const executer = async (tx) => {
    const maj = await tx.paiement.update({
      where: { id: paiement.id },
      data: { statut: vers, ...(options.champs || {}) }
    });

    await tx.tentativePaiement.create({
      data: {
        paiementId: paiement.id,
        statut: vers,
        message: options.message || LIBELLES[vers].texte,
        data: options.data || {}
      }
    });

    return maj;
  };

  const maj = options.client
    ? await executer(options.client)
    : await prisma.$transaction(executer);

  return { ok: true, paiement: maj };
};

// ─────────────────────────────────────────────────────────────────────────────
// Initiation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Instructions affichées au client selon le moyen choisi.
 *
 * Mobile Money : le client doit valider sur son téléphone, d'où le passage
 * direct en attente de confirmation. Virement et carte : la demande est
 * initiée, la confirmation viendra d'Ecobank.
 *
 * Ces instructions sont provisoires : les vrais parcours dépendent des API
 * Ecobank et PayGate (lots B5 et B6).
 */
const preparerInitiation = (paiement) => {
  const horodatage = Date.now();

  switch (paiement.methode) {
    case 'FLOOZ':
      return {
        statutCible: STATUTS.EN_ATTENTE_CONFIRMATION,
        referenceExterne: `PG-FLOOZ-${horodatage}`,
        instructions: 'Validez le paiement sur votre téléphone Flooz.'
      };
    case 'TMONEY':
      return {
        statutCible: STATUTS.EN_ATTENTE_CONFIRMATION,
        referenceExterne: `PG-TMONEY-${horodatage}`,
        instructions: 'Validez le paiement sur votre téléphone T-Money.'
      };
    case 'VISA_BUSINESS':
      return {
        statutCible: STATUTS.INITIE,
        referenceExterne: `ECO-VISA-${horodatage}`,
        instructions: 'Vous allez être redirigé vers la page de paiement sécurisée Ecobank.'
      };
    case 'VIREMENT_BANCAIRE':
    default:
      return {
        statutCible: STATUTS.INITIE,
        referenceExterne: `ECO-VIR-${horodatage}`,
        instructions: `Effectuez le virement en indiquant la référence ${paiement.reference}.`
      };
  }
};

const initierPaiement = async (req, res) => {
  try {
    const {
      factureId, factureNum, dossierId, dossierRef,
      clientId, clientNom, clientTel, clientOrganisationId,
      montant, devise, methode, notes, dateEcheance
    } = req.body;

    if (!clientId || !clientNom || !montant || !methode) {
      return res.status(400).json({
        success: false,
        message: 'Client, montant et moyen de paiement sont obligatoires.'
      });
    }

    if (!METHODES[methode]) {
      return res.status(400).json({
        success: false,
        message: `Moyen de paiement non accepté : ${methode}. ` +
          `Acceptés : ${Object.keys(METHODES).join(', ')}.`
      });
    }

    const valeur = parseFloat(montant);
    if (!Number.isFinite(valeur) || valeur <= 0) {
      return res.status(400).json({ success: false, message: 'Montant invalide.' });
    }

    // Le paiement appartient au client ; le CDA qui l'initie le suit.
    const organisations = organisationsDuPaiement(req.user, { clientOrganisationId, clientId });
    if (!organisations.organisationId) {
      return res.status(400).json({
        success: false,
        message: "L'organisation du client est requise pour rattacher le paiement."
      });
    }

    const resultat = await prisma.$transaction(async (tx) => {
      const reference = await genererReferencePaiement(tx);

      const cree = await tx.paiement.create({
        data: {
          reference,
          factureId, factureNum, dossierId, dossierRef,
          clientId, clientNom, clientTel,
          montant: valeur,
          devise: devise || 'XOF',
          methode,
          notes,
          prestataire: METHODES[methode].prestataire,
          statut: STATUTS.CREE,
          agentId: req.user?.sub,
          agentNom: req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || null : null,
          organisationId: organisations.organisationId,
          suiviParOrganisationId: organisations.suiviParOrganisationId,
          dateEcheance: dateEcheance ? new Date(dateEcheance) : null
        }
      });

      // Trace de la création : premier jalon de la timeline.
      await tx.tentativePaiement.create({
        data: {
          paiementId: cree.id,
          statut: STATUTS.CREE,
          message: 'Paiement créé',
          data: { factureNum, dossierRef }
        }
      });

      const preparation = preparerInitiation(cree);

      // CREE -> INITIE est toujours la première étape...
      const initie = await appliquerTransition(cree, STATUTS.INITIE, {
        client: tx,
        message: `Paiement initié auprès de ${METHODES[methode].prestataire}`,
        champs: { referenceExterne: preparation.referenceExterne },
        data: { referenceExterne: preparation.referenceExterne }
      });

      let final = initie.paiement;

      // ...puis, pour le Mobile Money, attente de la validation client.
      if (preparation.statutCible === STATUTS.EN_ATTENTE_CONFIRMATION) {
        const attente = await appliquerTransition(final, STATUTS.EN_ATTENTE_CONFIRMATION, {
          client: tx,
          message: 'En attente de validation sur le téléphone du client'
        });
        final = attente.paiement;
      }

      return { paiement: final, instructions: preparation.instructions };
    });

    logger.info('Paiement initié', {
      reference: resultat.paiement.reference,
      methode,
      userId: req.user?.sub
    });

    return res.status(201).json({
      success: true,
      message: `Paiement ${resultat.paiement.reference} initié.`,
      data: resultat
    });
  } catch (err) {
    logger.error('Erreur initiation paiement', { err: err.message, stack: err.stack });
    return erreurInterne(res, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Changements de statut manuels
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Charge un paiement et renvoie 404 s'il n'existe pas.
 * Renvoie null quand la réponse a déjà été envoyée.
 */
/**
 * Charge un paiement en vérifiant que l'utilisateur y a accès.
 *
 * Un paiement inaccessible reçoit la même réponse qu'un paiement inexistant :
 * répondre 403 révélerait qu'il existe.
 * Renvoie null quand la réponse a déjà été envoyée.
 */
const chargerPaiement = async (req, res, options = {}) => {
  const paiement = await prisma.paiement.findUnique({
    where: { id: req.params.id },
    ...(options.include ? { include: options.include } : {})
  });
  if (!paiement || !peutAcceder(req.user, paiement)) {
    res.status(404).json({ success: false, message: 'Paiement non trouvé.' });
    return null;
  }
  return paiement;
};

const refuserTransition = (res, resultat) =>
  res.status(409).json({ success: false, message: resultat.raison });

const confirmerPaiement = async (req, res) => {
  try {
    const paiement = await chargerPaiement(req, res);
    if (!paiement) return;

    const { numeroTransaction, notes } = req.body;

    const resultat = await appliquerTransition(paiement, STATUTS.CONFIRME, {
      message: 'Paiement confirmé manuellement',
      champs: { numeroTransaction, notes, datePaiement: new Date() },
      data: { numeroTransaction, par: req.user?.sub }
    });

    if (!resultat.ok) return refuserTransition(res, resultat);

    logger.info('Paiement confirmé', { id: paiement.id, par: req.user?.sub });
    return res.json({
      success: true,
      message: 'Paiement confirmé.',
      data: { paiement: resultat.paiement }
    });
  } catch (err) {
    logger.error('Erreur confirmation paiement', { err: err.message });
    return erreurInterne(res, err);
  }
};

/**
 * PATCH /paiements/:id/rapprocher
 *
 * Rattache un paiement confirmé à la chaîne complète du cahier des charges :
 * Client / Dossier / Conteneur / Service / Facture / Prestataire / Transaction.
 * C'est ce passage qui fait du CLN un outil de contrôle financier.
 */
const rapprocherPaiement = async (req, res) => {
  try {
    const paiement = await chargerPaiement(req, res);
    if (!paiement) return;

    const { conteneurNum, serviceRendu, dossierRef, factureNum, dlnuRef } = req.body;

    // Le rapprochement n'a de sens que si le paiement est rattaché à quelque
    // chose : on exige au moins une facture ou un dossier.
    const factureFinale = factureNum || paiement.factureNum;
    const dossierFinal = dossierRef || paiement.dossierRef;
    if (!factureFinale && !dossierFinal) {
      return res.status(400).json({
        success: false,
        message: 'Un rapprochement exige au moins une facture ou un dossier.'
      });
    }

    const resultat = await appliquerTransition(paiement, STATUTS.RAPPROCHE, {
      message: `Rapproché${factureFinale ? ` avec la facture ${factureFinale}` : ''}`,
      champs: {
        conteneurNum: conteneurNum || paiement.conteneurNum,
        serviceRendu: serviceRendu || paiement.serviceRendu,
        dossierRef: dossierFinal,
        factureNum: factureFinale,
        dlnuRef: dlnuRef || paiement.dlnuRef,
        rapprochePar: req.user?.sub || null,
        rapprocheLe: new Date()
      },
      data: { conteneurNum, serviceRendu, dossierRef: dossierFinal, factureNum: factureFinale }
    });

    if (!resultat.ok) return refuserTransition(res, resultat);

    logger.info('Paiement rapproché', { id: paiement.id, par: req.user?.sub });
    return res.json({
      success: true,
      message: 'Paiement rapproché.',
      data: { paiement: resultat.paiement }
    });
  } catch (err) {
    logger.error('Erreur rapprochement', { err: err.message });
    return erreurInterne(res, err);
  }
};

const demanderRemboursement = async (req, res) => {
  try {
    const paiement = await chargerPaiement(req, res);
    if (!paiement) return;

    const { motif } = req.body;
    if (!motif) {
      return res.status(400).json({ success: false, message: 'Le motif est obligatoire.' });
    }

    const resultat = await appliquerTransition(paiement, STATUTS.REMBOURSEMENT_DEMANDE, {
      message: `Remboursement demandé : ${motif}`,
      champs: { notes: motif },
      data: { motif, par: req.user?.sub }
    });

    if (!resultat.ok) return refuserTransition(res, resultat);

    return res.json({
      success: true,
      message: 'Remboursement demandé.',
      data: { paiement: resultat.paiement }
    });
  } catch (err) {
    logger.error('Erreur demande de remboursement', { err: err.message });
    return erreurInterne(res, err);
  }
};

const annulerPaiement = async (req, res) => {
  try {
    const paiement = await chargerPaiement(req, res);
    if (!paiement) return;

    const { motif } = req.body;

    const resultat = await appliquerTransition(paiement, STATUTS.ANNULE, {
      message: `Annulé${motif ? ` : ${motif}` : ''}`,
      champs: { notes: motif || 'Annulé' },
      data: { motif, par: req.user?.sub }
    });

    if (!resultat.ok) return refuserTransition(res, resultat);

    logger.info('Paiement annulé', { id: paiement.id, par: req.user?.sub });
    return res.json({
      success: true,
      message: 'Paiement annulé.',
      data: { paiement: resultat.paiement }
    });
  } catch (err) {
    logger.error('Erreur annulation paiement', { err: err.message });
    return erreurInterne(res, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Webhook
// ─────────────────────────────────────────────────────────────────────────────

const webhook = async (req, res) => {
  try {
    const { reference, statut, numeroTransaction, data } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Référence absente.' });
    }

    const paiement = await prisma.paiement.findFirst({ where: { reference } });
    // Pas de contrôle d'accès par organisation ici : le prestataire n'est pas
    // un utilisateur SAYGOO. Il est authentifié par la signature HMAC,
    // vérifiée par le middleware avant d'arriver dans ce contrôleur.
    if (!paiement) {
      return res.status(404).json({ success: false, message: 'Paiement non trouvé.' });
    }

    // Idempotence : un prestataire rejoue ses webhooks tant qu'il n'a pas
    // reçu de 200. Un paiement figé (rapproché ou terminé) n'est plus modifié,
    // et on répond 200 pour que le prestataire cesse de réessayer.
    if (STATUTS_FIGES_WEBHOOK.includes(paiement.statut)) {
      logger.info('Webhook ignoré (paiement figé)', { reference, statutActuel: paiement.statut });
      return res.json({ success: true, message: 'Paiement déjà traité.', idempotent: true });
    }

    const cible = traduireStatutPrestataire(statut);
    if (!cible) {
      // Statut inconnu : on ne devine pas. On trace et on répond 200 pour
      // ne pas déclencher de rejeu en boucle, mais sans rien modifier.
      logger.warn('Webhook : statut prestataire inconnu', { reference, statut });
      return res.json({ success: true, message: 'Statut ignoré.', ignore: true });
    }

    // Un rejeu de la même notification est un non-événement.
    if (cible === paiement.statut) {
      return res.json({ success: true, message: 'Paiement déjà traité.', idempotent: true });
    }

    const resultat = await appliquerTransition(paiement, cible, {
      message: `Notification ${paiement.prestataire || 'prestataire'} : ${statut}`,
      champs: {
        numeroTransaction: numeroTransaction || paiement.numeroTransaction,
        webhookData: data || {},
        ...(cible === STATUTS.CONFIRME ? { datePaiement: new Date() } : {})
      },
      data: data || {}
    });

    if (!resultat.ok) {
      // Transition refusée (par exemple une confirmation après annulation) :
      // on le trace, et on répond 200 pour stopper les rejeux.
      logger.warn('Webhook : transition refusée', {
        reference, depuis: paiement.statut, vers: cible, raison: resultat.raison
      });
      return res.json({ success: true, message: 'Transition ignorée.', ignore: true });
    }

    logger.info('Webhook traité', { reference, statut: cible });
    return res.json({ success: true, message: 'Webhook traité.' });
  } catch (err) {
    logger.error('Erreur webhook', { err: err.message, stack: err.stack });
    return erreurInterne(res, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Consultation
// ─────────────────────────────────────────────────────────────────────────────

const listerPaiements = async (req, res) => {
  try {
    const { page = 1, limit = 10, statut, methode, clientId, dateDebut, dateFin } = req.query;

    const taille = Math.min(parseInt(limit, 10) || 10, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * taille;
    const where = {};

    if (statut) {
      if (!STATUTS[statut]) {
        return res.status(400).json({ success: false, message: `Statut inconnu : ${statut}.` });
      }
      where.statut = statut;
    }
    if (methode) where.methode = methode;
    if (clientId) where.clientId = clientId;
    Object.assign(where, filtreAcces(req.user));
    if (dateDebut || dateFin) {
      where.createdAt = {};
      if (dateDebut) where.createdAt.gte = new Date(dateDebut);
      if (dateFin) where.createdAt.lte = new Date(dateFin);
    }

    const [paiements, total] = await Promise.all([
      prisma.paiement.findMany({
        where, skip, take: taille,
        orderBy: { createdAt: 'desc' },
        include: { tentatives: { orderBy: { createdAt: 'asc' } } }
      }),
      prisma.paiement.count({ where })
    ]);

    return res.json({
      success: true,
      data: {
        paiements,
        pagination: {
          total,
          page: parseInt(page, 10) || 1,
          limit: taille,
          totalPages: Math.ceil(total / taille)
        }
      }
    });
  } catch (err) {
    logger.error('Erreur liste paiements', { err: err.message });
    return erreurInterne(res, err);
  }
};

const getPaiement = async (req, res) => {
  try {
    const paiement = await prisma.paiement.findUnique({
      where: { id: req.params.id },
      include: { tentatives: { orderBy: { createdAt: 'asc' } } }
    });

    // Inaccessible ou inexistant : même réponse, pour ne pas révéler l'existence.
    if (!paiement || !peutAcceder(req.user, paiement)) {
      return res.status(404).json({ success: false, message: 'Paiement non trouvé.' });
    }

    return res.json({
      success: true,
      data: { paiement, libelleStatut: LIBELLES[paiement.statut] }
    });
  } catch (err) {
    logger.error('Erreur lecture paiement', { err: err.message });
    return erreurInterne(res, err);
  }
};

/**
 * GET /paiements/:id/timeline   (lot B7)
 *
 * La timeline de la fiche transaction du cahier des charges :
 *   14:02 Paiement créé
 *   14:05 Paiement initié auprès de PAYGATE_GLOBAL
 *   14:06 Notification PAYGATE_GLOBAL : SUCCESS
 *   14:07 Rapproché avec la facture INV-2026-00452
 *
 * Chaque transition étant écrite par appliquerTransition(), la timeline
 * est complète par construction.
 */
const getTimeline = async (req, res) => {
  try {
    const paiement = await prisma.paiement.findUnique({
      where: { id: req.params.id },
      include: { tentatives: { orderBy: { createdAt: 'asc' } } }
    });

    // Inaccessible ou inexistant : même réponse, pour ne pas révéler l'existence.
    if (!paiement || !peutAcceder(req.user, paiement)) {
      return res.status(404).json({ success: false, message: 'Paiement non trouvé.' });
    }

    const evenements = paiement.tentatives.map((t) => ({
      date: t.createdAt,
      statut: t.statut,
      libelle: t.message || LIBELLES[t.statut]?.texte || t.statut,
      couleur: LIBELLES[t.statut]?.couleur || 'gris'
    }));

    return res.json({
      success: true,
      data: {
        reference: paiement.reference,
        statutActuel: paiement.statut,
        libelleStatut: LIBELLES[paiement.statut],
        evenements
      }
    });
  } catch (err) {
    logger.error('Erreur timeline', { err: err.message });
    return erreurInterne(res, err);
  }
};

/**
 * GET /paiements/statistiques
 *
 * « Encaissé » regroupe CONFIRME et RAPPROCHE : un paiement rapproché reste
 * un paiement encaissé. « À rapprocher » isole les CONFIRME, c'est la file
 * de travail du comptable.
 */
const getStatistiques = async (req, res) => {
  try {
    const where = {};
    Object.assign(where, filtreAcces(req.user));

    const groupes = await prisma.paiement.groupBy({
      by: ['statut'],
      where,
      _count: { _all: true },
      _sum: { montant: true }
    });

    const parStatut = Object.fromEntries(Object.keys(STATUTS).map((s) => [s, 0]));
    const montantParStatut = Object.fromEntries(Object.keys(STATUTS).map((s) => [s, 0]));
    let total = 0;

    for (const g of groupes) {
      parStatut[g.statut] = g._count._all;
      montantParStatut[g.statut] = g._sum.montant || 0;
      total += g._count._all;
    }

    const encaisse = montantParStatut.CONFIRME + montantParStatut.RAPPROCHE;
    const enAttente = montantParStatut.CREE + montantParStatut.INITIE +
      montantParStatut.EN_ATTENTE_CONFIRMATION;

    return res.json({
      success: true,
      data: {
        statistiques: {
          total,
          parStatut,
          totalEncaisse: encaisse,
          totalEnAttente: enAttente,
          aRapprocher: { nombre: parStatut.CONFIRME, montant: montantParStatut.CONFIRME }
        }
      }
    });
  } catch (err) {
    logger.error('Erreur statistiques', { err: err.message });
    return erreurInterne(res, err);
  }
};

module.exports = {
  initierPaiement,
  confirmerPaiement,
  rapprocherPaiement,
  demanderRemboursement,
  annulerPaiement,
  webhook,
  listerPaiements,
  getPaiement,
  getTimeline,
  getStatistiques,
  // exportés pour les tests
  appliquerTransition,
  METHODES
};
