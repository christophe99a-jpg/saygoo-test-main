const prisma = require('../config/prisma');
const logger = require('../utils/logger');

const FORMALITES_IMPORT = [
  'Déclaration en douane',
  'Paiement des droits et taxes',
  'Bon à enlever',
  'Assurance',
  'Immatriculation',
];

const FORMALITES_TRANSIT = ['Déclaration Transit', 'Laisser-passer', 'Autorisation de sortie', 'Documents CEDEAO'];

const generateReferenceVente = async () => {
  const year = new Date().getFullYear();
  const prefix = `ACH-${year}-`;
  const count = await prisma.venteVehicule.count({ where: { reference: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(6, '0')}`;
};

const generateDossierReference = async () => {
  const year = new Date().getFullYear();
  const prefix = `DD-${year}-`;
  const count = await prisma.dossier.count({ where: { reference: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(6, '0')}`;
};

// ── ACHAT DU VÉHICULE (ultra simplifié) ─────────────────────────────────────────
// Crée automatiquement le dossier de dédouanement/transit + lance les formalités
const acheter = async (req, res) => {
  try {
    const { vehiculeId } = req.params;
    const { typeAchat, entreprise, telephone, assuranceDuree, destinationPays, destinationVille } = req.body;

    if (!['IMPORT', 'TRANSIT'].includes(typeAchat)) {
      return res.status(400).json({ success: false, message: 'Le type d\'achat doit être IMPORT ou TRANSIT.' });
    }
    if (typeAchat === 'TRANSIT' && !destinationPays) {
      return res.status(400).json({ success: false, message: 'Le pays de destination est obligatoire pour un achat Transit.' });
    }

    const vehicule = await prisma.vehicule.findUnique({ where: { id: vehiculeId } });
    if (!vehicule) {
      return res.status(404).json({ success: false, message: 'Véhicule non trouvé.' });
    }
    if (vehicule.statut === 'VENDU') {
      return res.status(400).json({ success: false, message: 'Ce véhicule a déjà été vendu.' });
    }

    const acheteurId = req.user?.sub;
    const dossierReference = await generateDossierReference();
    const venteReference = await generateReferenceVente();

    // 1. Créer le dossier de dédouanement/transit
    const dossier = await prisma.dossier.create({
      data: {
        reference: dossierReference,
        clientId: acheteurId,
        clientNom: entreprise || req.user?.firstName || 'Opérateur économique',
        typeMarchandise: 'VEHICULE',
        regimeDouanier: typeAchat === 'IMPORT' ? 'IM4' : 'TRANSIT',
        typeVehicule: null,
        description: `Achat véhicule ${vehicule.marque} ${vehicule.modele} (${vehicule.annee}) — Lot ${vehicule.lot}`,
        valeurFOB: vehicule.prix,
        destinationPays: typeAchat === 'TRANSIT' ? destinationPays : null,
        destinationVille: typeAchat === 'TRANSIT' ? destinationVille : null,
        statut: 'EN_ATTENTE',
      },
    });

    // 2. Lancer automatiquement les formalités correspondantes
    const formalites = typeAchat === 'IMPORT' ? FORMALITES_IMPORT : FORMALITES_TRANSIT;
    await prisma.formaliteDossier.createMany({
      data: formalites.map((libelle) => ({ dossierId: dossier.id, type: typeAchat, libelle })),
    });

    await prisma.historiqueDossier.create({
      data: {
        dossierId: dossier.id,
        action: `Achat véhicule confirmé (${typeAchat})`,
        userId: acheteurId,
        userNom: req.user?.firstName,
        nouveauStatut: 'EN_ATTENTE',
      },
    });

    // 3. Enregistrer la vente
    const vente = await prisma.venteVehicule.create({
      data: {
        reference: venteReference,
        vehiculeId,
        acheteurId,
        acheteurEntreprise: entreprise,
        acheteurTelephone: telephone,
        typeAchat,
        dossierId: dossier.id,
        assuranceDuree: typeAchat === 'IMPORT' ? assuranceDuree : null,
        destinationPays: typeAchat === 'TRANSIT' ? destinationPays : null,
        destinationVille: typeAchat === 'TRANSIT' ? destinationVille : null,
        statut: 'CONFIRME',
      },
    });

    // 4. Marquer le véhicule comme vendu
    await prisma.vehicule.update({ where: { id: vehiculeId }, data: { statut: 'VENDU' } });

    logger.info('Achat de véhicule confirmé', { venteReference, dossierReference, typeAchat });

    return res.status(201).json({
      success: true,
      message: `Achat confirmé. Référence : ${venteReference}. Dossier de ${typeAchat === 'IMPORT' ? 'dédouanement' : 'transit'} : ${dossierReference}. Vous serez notifié à chaque étape.`,
      data: { vente, dossier },
    });
  } catch (err) {
    logger.error('Erreur achat véhicule', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── SUIVI GLOBAL D'UN ACHAT (achat + dossier + progression des formalités) ─────
const getSuiviAchat = async (req, res) => {
  try {
    const { id } = req.params;

    const vente = await prisma.venteVehicule.findUnique({
      where: { id },
      include: { vehicule: true },
    });
    if (!vente) {
      return res.status(404).json({ success: false, message: 'Achat non trouvé.' });
    }

    const dossier = vente.dossierId
      ? await prisma.dossier.findUnique({
          where: { id: vente.dossierId },
          include: { formalites: true, historique: { orderBy: { createdAt: 'asc' } } },
        })
      : null;

    const formalites = dossier?.formalites || [];
    const total = formalites.length;
    const completes = formalites.filter((f) => f.complete).length;
    const progression = total > 0 ? Math.round((completes / total) * 100) : 0;

    return res.json({
      success: true,
      data: { vente, dossier, progression },
    });
  } catch (err) {
    logger.error('Erreur suivi achat véhicule', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── MES ACHATS (tableau de bord Opérateur Économique) ──────────────────────────
const listerMesAchats = async (req, res) => {
  try {
    const acheteurId = req.query.acheteurId || req.user?.sub;

    const ventes = await prisma.venteVehicule.findMany({
      where: { acheteurId },
      include: { vehicule: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: { ventes } });
  } catch (err) {
    logger.error('Erreur liste des achats', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { acheter, getSuiviAchat, listerMesAchats };