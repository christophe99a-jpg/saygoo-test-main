const prisma = require('../config/prisma');
const logger = require('../utils/logger');

// ── Helper : historiser une action ──────────────────────────────────────────────
const logHistorique = (demandeId, action, userId, userNom, description) =>
  prisma.historiqueStockage.create({
    data: { demandeId, action, userId, userNom, description }
  });

// ── Helper : générer une référence unique ST-2026-000245 ───────────────────────
const generateStockageReference = async () => {
  const year = new Date().getFullYear();
  const prefix = `ST-${year}-`;

  const count = await prisma.demandeStockage.count({ where: { reference: { startsWith: prefix } } });

  return `${prefix}${String(count + 1).padStart(6, '0')}`;
};

// ── RÉCEPTION D'UNE DEMANDE DE STOCKAGE ─────────────────────────────────────────
const creerDemande = async (req, res) => {
  try {
    const {
      clientId, clientNom, blReference, nature, typeStockage,
      quantite, uniteQuantite, dateEntreeSouhaitee, dureeEstimeeJours, organisationId
    } = req.body;

    if (!clientNom || !clientId || !nature || !typeStockage) {
      return res.status(400).json({
        success: false,
        message: 'Client, nature de la marchandise et type de stockage sont obligatoires.'
      });
    }

    const reference = await generateStockageReference();

    const demande = await prisma.demandeStockage.create({
      data: {
        reference,
        clientId,
        clientNom,
        blReference,
        nature,
        typeStockage,
        quantite: quantite ? parseFloat(quantite) : null,
        uniteQuantite,
        dateEntreeSouhaitee: dateEntreeSouhaitee ? new Date(dateEntreeSouhaitee) : null,
        dureeEstimeeJours: dureeEstimeeJours ? parseInt(dureeEstimeeJours) : null,
        organisationId,
        statut: 'NOUVEAU'
      }
    });

    await logHistorique(demande.id, 'Demande reçue', req.user?.sub, req.user?.firstName, null);

    logger.info('Demande de stockage créée', { reference });

    return res.status(201).json({ success: true, message: `Demande ${reference} reçue.`, data: { demande } });
  } catch (err) {
    logger.error('Erreur création demande stockage', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── LISTE / RECHERCHE ────────────────────────────────────────────────────────────
const listerDemandes = async (req, res) => {
  try {
    const { search, statut, typeStockage, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (statut) where.statut = statut;
    if (typeStockage) where.typeStockage = typeStockage;
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { clientNom: { contains: search, mode: 'insensitive' } },
        { nature: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [demandes, total] = await Promise.all([
      prisma.demandeStockage.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.demandeStockage.count({ where })
    ]);

    return res.json({
      success: true,
      data: { demandes, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } }
    });
  } catch (err) {
    logger.error('Erreur liste demandes stockage', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DÉTAIL ───────────────────────────────────────────────────────────────────────
const getDemande = async (req, res) => {
  try {
    const { id } = req.params;

    const demande = await prisma.demandeStockage.findUnique({
      where: { id },
      include: { documents: true, historique: { orderBy: { createdAt: 'asc' } } }
    });

    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }

    return res.json({ success: true, data: { demande } });
  } catch (err) {
    logger.error('Erreur détail demande stockage', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── ACCEPTER ─────────────────────────────────────────────────────────────────────
const accepterDemande = async (req, res) => {
  try {
    const { id } = req.params;
    const demande = await prisma.demandeStockage.findUnique({ where: { id } });

    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }
    if (demande.statut !== 'NOUVEAU') {
      return res.status(400).json({ success: false, message: 'Seule une demande Nouvelle peut être acceptée.' });
    }

    const updated = await prisma.demandeStockage.update({ where: { id }, data: { statut: 'ACCEPTE' } });

    await logHistorique(id, 'Demande acceptée', req.user?.sub, req.user?.firstName, null);

    // NOTE : transfert au Gestionnaire d'entrepôt à notifier via notification-service
    logger.info('Demande acceptée — transfert au Gestionnaire d\'entrepôt à notifier', { reference: demande.reference });

    return res.json({ success: true, message: 'Demande acceptée.', data: { demande: updated } });
  } catch (err) {
    logger.error('Erreur acceptation demande stockage', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── REFUSER ──────────────────────────────────────────────────────────────────────
const refuserDemande = async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;

    if (!motif) {
      return res.status(400).json({ success: false, message: 'Le motif de refus est obligatoire.' });
    }

    const demande = await prisma.demandeStockage.findUnique({ where: { id } });
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }
    if (demande.statut !== 'NOUVEAU') {
      return res.status(400).json({ success: false, message: 'Seule une demande Nouvelle peut être refusée.' });
    }

    const updated = await prisma.demandeStockage.update({
      where: { id },
      data: { statut: 'REFUSE', motifRefus: motif }
    });

    await logHistorique(id, 'Demande refusée', req.user?.sub, req.user?.firstName, motif);

    return res.json({ success: true, message: 'Demande refusée.', data: { demande: updated } });
  } catch (err) {
    logger.error('Erreur refus demande stockage', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DEMANDER DES INFORMATIONS COMPLÉMENTAIRES ──────────────────────────────────
const demanderInfos = async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaire } = req.body;

    if (!commentaire) {
      return res.status(400).json({ success: false, message: 'Le commentaire est obligatoire.' });
    }

    const demande = await prisma.demandeStockage.findUnique({ where: { id } });
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }

    await logHistorique(id, 'Informations complémentaires demandées', req.user?.sub, req.user?.firstName, commentaire);

    logger.info('Informations complémentaires demandées — notification client à envoyer', { demandeId: id });

    return res.json({ success: true, message: 'Demande d\'informations envoyée au client.' });
  } catch (err) {
    logger.error('Erreur demande d\'informations', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── AFFECTATION D'EMPLACEMENT (après acceptation) ──────────────────────────────
const affecterEmplacement = async (req, res) => {
  try {
    const { id } = req.params;
    const { zone, allee, emplacement, dateEntreeReelle, dureeEstimeeJours } = req.body;

    if (!zone || !emplacement) {
      return res.status(400).json({ success: false, message: 'La zone et l\'emplacement sont obligatoires.' });
    }

    const demande = await prisma.demandeStockage.findUnique({ where: { id } });
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }
    if (demande.statut !== 'ACCEPTE') {
      return res.status(400).json({ success: false, message: 'Seule une demande Acceptée peut recevoir un emplacement.' });
    }

    const entree = dateEntreeReelle ? new Date(dateEntreeReelle) : new Date();
    const duree = dureeEstimeeJours ? parseInt(dureeEstimeeJours) : demande.dureeEstimeeJours;
    const dateSortiePrevue = duree ? new Date(entree.getTime() + duree * 24 * 60 * 60 * 1000) : null;

    const updated = await prisma.demandeStockage.update({
      where: { id },
      data: {
        statut: 'STOCKE',
        zone,
        allee,
        emplacement,
        dateEntreeReelle: entree,
        dureeEstimeeJours: duree,
        dateSortiePrevue
      }
    });

    await logHistorique(id, 'Emplacement affecté', req.user?.sub, req.user?.firstName, `${zone} / ${allee || '-'} / ${emplacement}`);

    return res.json({ success: true, message: 'Emplacement affecté. Marchandise stockée.', data: { demande: updated } });
  } catch (err) {
    logger.error('Erreur affectation emplacement', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── MODIFIER L'AFFECTATION (pendant le stockage) ───────────────────────────────
const modifierEmplacement = async (req, res) => {
  try {
    const { id } = req.params;
    const { zone, allee, emplacement, dateSortiePrevue } = req.body;

    const demande = await prisma.demandeStockage.findUnique({ where: { id } });
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }
    if (demande.statut !== 'STOCKE') {
      return res.status(400).json({ success: false, message: 'Seule une marchandise Stockée peut être modifiée.' });
    }

    const updated = await prisma.demandeStockage.update({
      where: { id },
      data: {
        zone: zone ?? demande.zone,
        allee: allee ?? demande.allee,
        emplacement: emplacement ?? demande.emplacement,
        dateSortiePrevue: dateSortiePrevue ? new Date(dateSortiePrevue) : demande.dateSortiePrevue
      }
    });

    await logHistorique(id, 'Affectation modifiée', req.user?.sub, req.user?.firstName, null);

    return res.json({ success: true, message: 'Affectation mise à jour.', data: { demande: updated } });
  } catch (err) {
    logger.error('Erreur modification emplacement', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── AUTORISER LA SORTIE (passe en Prêt à sortir) ───────────────────────────────
const autoriserSortie = async (req, res) => {
  try {
    const { id } = req.params;
    const demande = await prisma.demandeStockage.findUnique({ where: { id } });

    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }
    if (demande.statut !== 'STOCKE') {
      return res.status(400).json({ success: false, message: 'Seule une marchandise Stockée peut être autorisée à sortir.' });
    }

    const updated = await prisma.demandeStockage.update({ where: { id }, data: { statut: 'PRET_A_SORTIR' } });

    await logHistorique(id, 'Sortie autorisée', req.user?.sub, req.user?.firstName, null);

    // NOTE : le gestionnaire du MAD reçoit automatiquement une notification avec la liste des pièces à fournir
    logger.info('Sortie autorisée — notification au gestionnaire du MAD à envoyer', { reference: demande.reference });

    return res.json({ success: true, message: 'Sortie autorisée. En attente de la sortie effective.', data: { demande: updated } });
  } catch (err) {
    logger.error('Erreur autorisation sortie', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── EFFECTUER LA SORTIE (clôture le dossier) ───────────────────────────────────
const effectuerSortie = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantiteSortie, modeSortie, dateSortie } = req.body;

    const demande = await prisma.demandeStockage.findUnique({ where: { id }, include: { documents: true } });
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }
    if (demande.statut !== 'PRET_A_SORTIR') {
      return res.status(400).json({ success: false, message: 'La sortie doit d\'abord être autorisée.' });
    }

    const typesRequis = ['DDU', 'BAD', 'FACTURE_MAD', 'BON_A_ENLEVER'];
    const typesPresents = demande.documents.map((d) => d.type.toUpperCase());
    const manquants = typesRequis.filter((t) => !typesPresents.includes(t));

    if (manquants.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible d'effectuer la sortie : documents manquants (${manquants.join(', ')}).`
      });
    }

    const updated = await prisma.demandeStockage.update({
      where: { id },
      data: {
        statut: 'CLOTURE',
        quantiteSortie: quantiteSortie ? parseFloat(quantiteSortie) : demande.quantite,
        modeSortie,
        dateSortieReelle: dateSortie ? new Date(dateSortie) : new Date()
      }
    });

    await logHistorique(id, 'Sortie effectuée — dossier clôturé', req.user?.sub, req.user?.firstName, `Emplacement libéré : ${demande.emplacement || '-'}`);

    return res.json({ success: true, message: 'Sortie effectuée. Emplacement libéré.', data: { demande: updated } });
  } catch (err) {
    logger.error('Erreur sortie effective', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DOCUMENTS ─────────────────────────────────────────────────────────────────────
const ajouterDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, type, url } = req.body;

    const demande = await prisma.demandeStockage.findUnique({ where: { id } });
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée.' });
    }
    if (!nom || !type || !url) {
      return res.status(400).json({ success: false, message: 'Le nom, le type et l\'URL du fichier sont obligatoires.' });
    }

    const document = await prisma.documentStockage.create({
      data: { demandeId: id, nom, type, url, uploadePar: req.user?.sub || 'inconnu' }
    });

    await logHistorique(id, `Document ajouté : ${type}`, req.user?.sub, req.user?.firstName, nom);

    return res.status(201).json({ success: true, message: 'Document ajouté.', data: { document } });
  } catch (err) {
    logger.error('Erreur ajout document stockage', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listerDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const documents = await prisma.documentStockage.findMany({ where: { demandeId: id }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { documents } });
  } catch (err) {
    logger.error('Erreur liste documents stockage', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── HISTORIQUE ────────────────────────────────────────────────────────────────────
const getHistorique = async (req, res) => {
  try {
    const { id } = req.params;
    const historique = await prisma.historiqueStockage.findMany({ where: { demandeId: id }, orderBy: { createdAt: 'asc' } });
    return res.json({ success: true, data: { historique } });
  } catch (err) {
    logger.error('Erreur historique stockage', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  creerDemande,
  listerDemandes,
  getDemande,
  accepterDemande,
  refuserDemande,
  demanderInfos,
  affecterEmplacement,
  modifierEmplacement,
  autoriserSortie,
  effectuerSortie,
  ajouterDocument,
  listerDocuments,
  getHistorique
};