const prisma = require('../config/prisma');
const logger = require('../utils/logger');

// ── Helper : historiser une action ──────────────────────────────────────────────
const logHistorique = (demandeId, action, userId, userNom, description) =>
  prisma.historiqueTransport.create({
    data: { demandeId, action, userId, userNom, description }
  });

const generateTransportReference = async () => {
  const year = new Date().getFullYear();
  const prefix = `TR-${year}-`;
  const count = await prisma.demandeTransport.count({ where: { reference: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(6, '0')}`;
};

// Pool de démonstration utilisé le temps qu'un vrai service Transporteur existe.
// À remplacer par un appel réel à ce service (matching type de camion / capacité / destination).
const POOL_TRANSPORTEURS_DEMO = [
  { transporteurNom: 'LOGISTIC TRANS', note: 5, disponibilite: "Disponible aujourd'hui" },
  { transporteurNom: 'AFRICA LOGISTICS', note: 4, disponibilite: 'Disponible demain' },
  { transporteurNom: 'WEST CARGO', note: 5, disponibilite: "Disponible aujourd'hui" }
];

// ── RÉCEPTION D'UNE DEMANDE DE TRANSPORT ────────────────────────────────────────
const creerDemande = async (req, res) => {
  try {
    const {
      clientId, clientNom, lieuChargement, destination, paysDestination,
      natureMarchandise, quantite, poidsKg, organisationId
    } = req.body;

    if (!clientNom || !clientId || !lieuChargement || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Client, lieu de chargement et destination sont obligatoires.'
      });
    }

    const reference = await generateTransportReference();

    const demande = await prisma.demandeTransport.create({
      data: {
        reference,
        clientId,
        clientNom,
        lieuChargement,
        destination,
        paysDestination,
        natureMarchandise,
        quantite: quantite ? parseFloat(quantite) : null,
        poidsKg: poidsKg ? parseFloat(poidsKg) : null,
        organisationId,
        statut: 'NOUVEAU'
      }
    });

    await logHistorique(demande.id, 'Demande reçue', req.user?.sub, req.user?.firstName, null);

    logger.info('Demande de transport créée', { reference });

    return res.status(201).json({ success: true, message: `Demande ${reference} reçue.`, data: { demande } });
  } catch (err) {
    logger.error('Erreur création demande transport', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── LISTE / RECHERCHE ────────────────────────────────────────────────────────────
const listerDemandes = async (req, res) => {
  try {
    const { search, statut, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (statut) where.statut = statut;
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { clientNom: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [demandes, total] = await Promise.all([
      prisma.demandeTransport.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.demandeTransport.count({ where })
    ]);

    return res.json({
      success: true,
      data: { demandes, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } }
    });
  } catch (err) {
    logger.error('Erreur liste demandes transport', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DÉTAIL ───────────────────────────────────────────────────────────────────────
const getDemande = async (req, res) => {
  try {
    const { id } = req.params;

    const demande = await prisma.demandeTransport.findUnique({
      where: { id },
      include: { offres: true, documents: true, historique: { orderBy: { createdAt: 'asc' } } }
    });

    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }

    return res.json({ success: true, data: { demande } });
  } catch (err) {
    logger.error('Erreur détail demande transport', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── VALIDATION : vérifie que les formalités douanières sont terminées ──────────
const validerDemande = async (req, res) => {
  try {
    const { id } = req.params;

    const demande = await prisma.demandeTransport.findUnique({ where: { id }, include: { documents: true } });
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }
    if (demande.statut !== 'NOUVEAU') {
      return res.status(400).json({ success: false, message: 'Seule une demande Nouvelle peut être validée.' });
    }

    const typesRequis = ['BAD', 'DECLARATION', 'BL'];
    const typesPresents = demande.documents.map((d) => d.type.toUpperCase());
    const manquants = typesRequis.filter((t) => !typesPresents.includes(t));

    if (manquants.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Formalités incomplètes : documents manquants (${manquants.join(', ')}).`
      });
    }

    await logHistorique(id, 'Demande validée — formalités douanières terminées', req.user?.sub, req.user?.firstName, null);

    return res.json({ success: true, message: 'Demande validée. Vous pouvez lancer la recherche de transporteurs.' });
  } catch (err) {
    logger.error('Erreur validation demande transport', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── REFUS / DEMANDE DE COMPLÉMENT ────────────────────────────────────────────────
const refuserDemande = async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;

    if (!motif) {
      return res.status(400).json({ success: false, message: 'Le motif de refus est obligatoire.' });
    }

    const demande = await prisma.demandeTransport.findUnique({ where: { id } });
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }

    const updated = await prisma.demandeTransport.update({ where: { id }, data: { statut: 'REFUSE', motifRefus: motif } });

    await logHistorique(id, 'Demande refusée', req.user?.sub, req.user?.firstName, motif);

    return res.json({ success: true, message: 'Demande refusée.', data: { demande: updated } });
  } catch (err) {
    logger.error('Erreur refus demande transport', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

const demanderComplement = async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaire } = req.body;

    if (!commentaire) {
      return res.status(400).json({ success: false, message: 'Le commentaire est obligatoire.' });
    }

    const demande = await prisma.demandeTransport.findUnique({ where: { id } });
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }

    await logHistorique(id, 'Complément demandé', req.user?.sub, req.user?.firstName, commentaire);

    logger.info('Complément demandé — notification client à envoyer', { demandeId: id });

    return res.json({ success: true, message: 'Demande de complément envoyée au client.' });
  } catch (err) {
    logger.error('Erreur demande de complément', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── RECHERCHE AUTOMATIQUE DE TRANSPORTEURS ──────────────────────────────────────
const lancerRecherche = async (req, res) => {
  try {
    const { id } = req.params;

    const demande = await prisma.demandeTransport.findUnique({ where: { id } });
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }
    if (demande.statut !== 'NOUVEAU') {
      return res.status(400).json({ success: false, message: 'La recherche ne peut être lancée que sur une demande Nouvelle.' });
    }

    const dejaLancee = await prisma.offreTransporteur.count({ where: { demandeId: id } });
    if (dejaLancee > 0) {
      return res.status(400).json({ success: false, message: 'La recherche a déjà été lancée pour cette demande.' });
    }

    await prisma.$transaction([
      prisma.demandeTransport.update({ where: { id }, data: { statut: 'RECHERCHE_TRANSPORTEUR' } }),
      ...POOL_TRANSPORTEURS_DEMO.map((t) =>
        prisma.offreTransporteur.create({ data: { demandeId: id, ...t } })
      )
    ]);

    await logHistorique(id, 'Recherche de transporteurs lancée', req.user?.sub, req.user?.firstName, null);

    const offres = await prisma.offreTransporteur.findMany({ where: { demandeId: id } });

    return res.status(201).json({ success: true, message: 'Transporteurs disponibles trouvés.', data: { offres } });
  } catch (err) {
    logger.error('Erreur recherche transporteurs', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── SÉLECTION D'UNE OFFRE ────────────────────────────────────────────────────────
const selectionnerOffre = async (req, res) => {
  try {
    const { offreId } = req.params;

    const offre = await prisma.offreTransporteur.findUnique({ where: { id: offreId } });
    if (!offre) {
      return res.status(404).json({ success: false, message: 'Offre non trouvée.' });
    }

    await prisma.$transaction([
      prisma.offreTransporteur.updateMany({ where: { demandeId: offre.demandeId }, data: { selectionnee: false } }),
      prisma.offreTransporteur.update({ where: { id: offreId }, data: { selectionnee: true } })
    ]);

    await logHistorique(offre.demandeId, `Offre sélectionnée : ${offre.transporteurNom}`, req.user?.sub, req.user?.firstName, null);

    return res.json({ success: true, message: `${offre.transporteurNom} sélectionné.` });
  } catch (err) {
    logger.error('Erreur sélection offre', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── AFFECTATION DU TRANSPORT ─────────────────────────────────────────────────────
const affecterTransport = async (req, res) => {
  try {
    const { id } = req.params;
    const { transporteurNom, typeCamion, conducteurNom, conducteurTelephone, dateChargement } = req.body;

    if (!transporteurNom || !conducteurNom) {
      return res.status(400).json({ success: false, message: 'Le transporteur et le conducteur sont obligatoires.' });
    }

    const demande = await prisma.demandeTransport.findUnique({ where: { id } });
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }
    if (demande.statut !== 'RECHERCHE_TRANSPORTEUR') {
      return res.status(400).json({ success: false, message: 'Il faut d\'abord lancer la recherche et sélectionner une offre.' });
    }

    const updated = await prisma.demandeTransport.update({
      where: { id },
      data: {
        statut: 'AFFECTE',
        transporteurNom,
        typeCamion,
        conducteurNom,
        conducteurTelephone,
        dateChargement: dateChargement ? new Date(dateChargement) : new Date()
      }
    });

    await logHistorique(id, 'Transport affecté', req.user?.sub, req.user?.firstName, `${transporteurNom} — ${conducteurNom}`);

    return res.json({ success: true, message: 'Transport affecté. Ordre de transport généré.', data: { demande: updated } });
  } catch (err) {
    logger.error('Erreur affectation transport', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── SUIVI : démarrage + mise à jour de position ────────────────────────────────
const demarrerTransport = async (req, res) => {
  try {
    const { id } = req.params;

    const demande = await prisma.demandeTransport.findUnique({ where: { id } });
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }
    if (demande.statut !== 'AFFECTE') {
      return res.status(400).json({ success: false, message: 'Seul un transport Affecté peut démarrer.' });
    }

    const updated = await prisma.demandeTransport.update({ where: { id }, data: { statut: 'EN_TRANSPORT' } });

    await logHistorique(id, 'Transport démarré', req.user?.sub, req.user?.firstName, null);

    return res.json({ success: true, message: 'Transport en cours.', data: { demande: updated } });
  } catch (err) {
    logger.error('Erreur démarrage transport', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

const mettreAJourPosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { position, statutSuivi } = req.body;

    if (!position) {
      return res.status(400).json({ success: false, message: 'La position est obligatoire.' });
    }

    const demande = await prisma.demandeTransport.findUnique({ where: { id } });
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }
    if (demande.statut !== 'EN_TRANSPORT') {
      return res.status(400).json({ success: false, message: 'Le transport n\'est pas en cours.' });
    }

    const updated = await prisma.demandeTransport.update({
      where: { id },
      data: { dernierePosition: position, statutSuivi: statutSuivi || demande.statutSuivi || 'EN_COURS' }
    });

    await logHistorique(id, `Position mise à jour : ${position}`, req.user?.sub, req.user?.firstName, statutSuivi || null);

    return res.json({ success: true, message: 'Position mise à jour.', data: { demande: updated } });
  } catch (err) {
    logger.error('Erreur mise à jour position', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── LIVRAISON (avec preuve de livraison et clôture) ────────────────────────────
const confirmerLivraison = async (req, res) => {
  try {
    const { id } = req.params;
    const { podUrl, signatureConfirmee, dateLivraison } = req.body;

    const demande = await prisma.demandeTransport.findUnique({ where: { id } });
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }
    if (demande.statut !== 'EN_TRANSPORT') {
      return res.status(400).json({ success: false, message: 'Seul un transport En cours peut être livré.' });
    }
    if (!podUrl) {
      return res.status(400).json({ success: false, message: 'La preuve de livraison (POD) est obligatoire.' });
    }

    const updated = await prisma.demandeTransport.update({
      where: { id },
      data: {
        statut: 'LIVRE',
        podUrl,
        signatureConfirmee: !!signatureConfirmee,
        dateLivraison: dateLivraison ? new Date(dateLivraison) : new Date()
      }
    });

    await logHistorique(id, 'Livraison confirmée — dossier clôturé', req.user?.sub, req.user?.firstName, null);

    return res.json({ success: true, message: 'Livraison confirmée. Dossier clôturé.', data: { demande: updated } });
  } catch (err) {
    logger.error('Erreur confirmation livraison', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DOCUMENTS ─────────────────────────────────────────────────────────────────────
const ajouterDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, type, url } = req.body;

    const demande = await prisma.demandeTransport.findUnique({ where: { id } });
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }
    if (!nom || !type || !url) {
      return res.status(400).json({ success: false, message: 'Le nom, le type et l\'URL du fichier sont obligatoires.' });
    }

    const document = await prisma.documentTransport.create({
      data: { demandeId: id, nom, type, url, uploadePar: req.user?.sub || 'inconnu' }
    });

    await logHistorique(id, `Document ajouté : ${type}`, req.user?.sub, req.user?.firstName, nom);

    return res.status(201).json({ success: true, message: 'Document ajouté.', data: { document } });
  } catch (err) {
    logger.error('Erreur ajout document transport', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listerDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const documents = await prisma.documentTransport.findMany({ where: { demandeId: id }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { documents } });
  } catch (err) {
    logger.error('Erreur liste documents transport', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── HISTORIQUE ────────────────────────────────────────────────────────────────────
const getHistorique = async (req, res) => {
  try {
    const { id } = req.params;
    const historique = await prisma.historiqueTransport.findMany({ where: { demandeId: id }, orderBy: { createdAt: 'asc' } });
    return res.json({ success: true, data: { historique } });
  } catch (err) {
    logger.error('Erreur historique transport', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  creerDemande,
  listerDemandes,
  getDemande,
  validerDemande,
  refuserDemande,
  demanderComplement,
  lancerRecherche,
  selectionnerOffre,
  affecterTransport,
  demarrerTransport,
  mettreAJourPosition,
  confirmerLivraison,
  ajouterDocument,
  listerDocuments,
  getHistorique
};