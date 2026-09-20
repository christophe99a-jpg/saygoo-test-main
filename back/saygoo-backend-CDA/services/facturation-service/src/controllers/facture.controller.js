const prisma = require('../config/prisma');
const { generateFactureReference } = require('../utils/reference');
const logger = require('../utils/logger');

// ── BARÈME DE L'HONORAIRE TRANSITAIRE (calcul automatique) ─────────────────────
const BAREME = {
  CONTENEUR_20: 50000,
  CONTENEUR_40: 100000,
  VEHICULE_CATEGORIE_A: 25000, // Motos
  VEHICULE_CATEGORIE_B: 50000,
  VEHICULE_CATEGORIE_C: 100000,
  VRAC_EQUIVALENT_20: 50000,   // Vrac / MAD / Aéroport, poids équivalent 20 pieds
  VRAC_EQUIVALENT_40: 100000   // Vrac / MAD / Aéroport, poids équivalent 40 pieds
};

/**
 * Calcule le montant de l'honoraire transitaire selon le barème SAYGOO.
 * @param {string} typeMarchandise - CONTENEUR_20 | CONTENEUR_40 | VEHICULE | VRAC | COLIS | AUTRE
 * @param {string|null} typeVehicule - CATEGORIE_A | CATEGORIE_B | CATEGORIE_C (si VEHICULE)
 * @param {string|null} equivalentVrac - '20' | '40' (si VRAC, poids équivalent)
 * @param {number} quantite
 */
const calculerHonoraireTransitaire = (typeMarchandise, typeVehicule, equivalentVrac, quantite = 1) => {
  let tarifUnitaire = 0;

  if (typeMarchandise === 'CONTENEUR_20') tarifUnitaire = BAREME.CONTENEUR_20;
  else if (typeMarchandise === 'CONTENEUR_40') tarifUnitaire = BAREME.CONTENEUR_40;
  else if (typeMarchandise === 'VEHICULE') {
    if (typeVehicule === 'CATEGORIE_A') tarifUnitaire = BAREME.VEHICULE_CATEGORIE_A;
    else if (typeVehicule === 'CATEGORIE_B') tarifUnitaire = BAREME.VEHICULE_CATEGORIE_B;
    else if (typeVehicule === 'CATEGORIE_C') tarifUnitaire = BAREME.VEHICULE_CATEGORIE_C;
  } else if (typeMarchandise === 'VRAC') {
    tarifUnitaire = equivalentVrac === '40' ? BAREME.VRAC_EQUIVALENT_40 : BAREME.VRAC_EQUIVALENT_20;
  }

  return tarifUnitaire * quantite;
};

// ── CRÉATION D'UNE FACTURE CDA ───────────────────────────────────────────────────
const creerFacture = async (req, res) => {
  try {
    const { dossierId, dossierRef, clientNom, devise } = req.body;

    if (!clientNom) {
      return res.status(400).json({ success: false, message: 'Le client est obligatoire.' });
    }

    const reference = await generateFactureReference();

    const facture = await prisma.factureCDA.create({
      data: {
        reference,
        dossierId,
        dossierRef,
        clientNom,
        devise: devise || 'XOF',
        statut: 'BROUILLON'
      }
    });

    logger.info('Facture CDA créée', { reference });

    return res.status(201).json({ success: true, message: `Facture ${reference} créée.`, data: { facture } });
  } catch (err) {
    logger.error('Erreur création facture CDA', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── AJOUT D'UNE LIGNE (manuelle ou calculée automatiquement) ───────────────────
const ajouterLigne = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, libelle, quantite, montant, calculAuto, typeMarchandise, typeVehicule, equivalentVrac } = req.body;

    const facture = await prisma.factureCDA.findUnique({ where: { id } });
    if (!facture) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée.' });
    }
    if (facture.statut !== 'BROUILLON') {
      return res.status(400).json({ success: false, message: 'Seule une facture en Brouillon peut être modifiée.' });
    }
    if (!type) {
      return res.status(400).json({ success: false, message: 'Le type de ligne est obligatoire.' });
    }

    let montantLigne;
    let estAuto = false;

    if (type === 'HONORAIRE_TRANSITAIRE' && calculAuto) {
      montantLigne = calculerHonoraireTransitaire(typeMarchandise, typeVehicule, equivalentVrac, parseFloat(quantite || 1));
      estAuto = true;
    } else {
      if (montant == null || montant < 0) {
        return res.status(400).json({ success: false, message: 'Le montant de la ligne est obligatoire.' });
      }
      montantLigne = parseFloat(montant);
    }

    const ligne = await prisma.ligneFacture.create({
      data: {
        factureId: id,
        type,
        libelle: libelle || type,
        quantite: parseFloat(quantite || 1),
        montant: montantLigne,
        calculAuto: estAuto
      }
    });

    await recalculerTotal(id);

    const updated = await prisma.factureCDA.findUnique({ where: { id }, include: { lignes: true } });

    return res.status(201).json({ success: true, message: 'Ligne ajoutée.', data: { ligne, facture: updated } });
  } catch (err) {
    logger.error('Erreur ajout ligne facture', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

const supprimerLigne = async (req, res) => {
  try {
    const { id, ligneId } = req.params;

    const facture = await prisma.factureCDA.findUnique({ where: { id } });
    if (!facture) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée.' });
    }
    if (facture.statut !== 'BROUILLON') {
      return res.status(400).json({ success: false, message: 'Seule une facture en Brouillon peut être modifiée.' });
    }

    await prisma.ligneFacture.delete({ where: { id: ligneId } });
    await recalculerTotal(id);

    const updated = await prisma.factureCDA.findUnique({ where: { id }, include: { lignes: true } });

    return res.json({ success: true, message: 'Ligne supprimée.', data: { facture: updated } });
  } catch (err) {
    logger.error('Erreur suppression ligne facture', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Helper : recalcule le montant total à partir des lignes ────────────────────
const recalculerTotal = async (factureId) => {
  const lignes = await prisma.ligneFacture.findMany({ where: { factureId } });
  const montantTotal = lignes.reduce((sum, l) => sum + l.montant, 0);
  await prisma.factureCDA.update({ where: { id: factureId }, data: { montantTotal } });
};

// ── LISTE / DÉTAIL ───────────────────────────────────────────────────────────────
const listerFactures = async (req, res) => {
  try {
    const { search, statut, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (statut) where.statut = statut;
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { clientNom: { contains: search, mode: 'insensitive' } },
        { dossierRef: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [factures, total] = await Promise.all([
      prisma.factureCDA.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { lignes: true }
      }),
      prisma.factureCDA.count({ where })
    ]);

    return res.json({
      success: true,
      data: { factures, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } }
    });
  } catch (err) {
    logger.error('Erreur liste factures CDA', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const facture = await prisma.factureCDA.findUnique({ where: { id }, include: { lignes: true } });

    if (!facture) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée.' });
    }

    return res.json({ success: true, data: { facture } });
  } catch (err) {
    logger.error('Erreur détail facture CDA', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── ÉMISSION (Brouillon -> Émise) ────────────────────────────────────────────────
const emettreFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const facture = await prisma.factureCDA.findUnique({ where: { id }, include: { lignes: true } });

    if (!facture) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée.' });
    }
    if (facture.statut !== 'BROUILLON') {
      return res.status(400).json({ success: false, message: 'Seule une facture en Brouillon peut être émise.' });
    }
    if (facture.lignes.length === 0) {
      return res.status(400).json({ success: false, message: 'Impossible d\'émettre une facture sans ligne.' });
    }

    const updated = await prisma.factureCDA.update({ where: { id }, data: { statut: 'EMISE' } });

    // NOTE : notification à envoyer au back office CDA, au client et à l'assistant SAYGOO
    logger.info('Facture CDA émise — notifications à envoyer', { reference: facture.reference });

    return res.json({ success: true, message: 'Facture émise.', data: { facture: updated } });
  } catch (err) {
    logger.error('Erreur émission facture CDA', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PAIEMENT (Émise -> Payée) ────────────────────────────────────────────────────
const marquerPayee = async (req, res) => {
  try {
    const { id } = req.params;
    const facture = await prisma.factureCDA.findUnique({ where: { id } });

    if (!facture) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée.' });
    }
    if (facture.statut !== 'EMISE') {
      return res.status(400).json({ success: false, message: 'Seule une facture Émise peut être marquée comme Payée.' });
    }

    const updated = await prisma.factureCDA.update({ where: { id }, data: { statut: 'PAYEE' } });

    return res.json({ success: true, message: 'Facture payée.', data: { facture: updated } });
  } catch (err) {
    logger.error('Erreur paiement facture CDA', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── SIMULATION DE L'HONORAIRE TRANSITAIRE (aperçu avant ajout de ligne) ────────
const simulerHonoraire = async (req, res) => {
  try {
    const { typeMarchandise, typeVehicule, equivalentVrac, quantite } = req.query;

    const montant = calculerHonoraireTransitaire(typeMarchandise, typeVehicule, equivalentVrac, parseFloat(quantite || 1));

    return res.json({ success: true, data: { montant } });
  } catch (err) {
    logger.error('Erreur simulation honoraire', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  creerFacture,
  ajouterLigne,
  supprimerLigne,
  listerFactures,
  getFacture,
  emettreFacture,
  marquerPayee,
  simulerHonoraire
};