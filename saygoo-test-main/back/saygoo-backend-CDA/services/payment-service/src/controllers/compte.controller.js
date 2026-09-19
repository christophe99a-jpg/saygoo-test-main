const prisma = require('../config/prisma');
const { generateInstructionReference } = require('../utils/reference');
const logger = require('../utils/logger');

// ── Helper : récupérer ou créer le compte d'une organisation ──────────────────
const getOrCreateCompte = async (organisationId) => {
  let compte = await prisma.compteLogistique.findUnique({ where: { organisationId } });
  if (!compte) {
    compte = await prisma.compteLogistique.create({ data: { organisationId } });
  }
  return compte;
};

// ── SOLDE ──────────────────────────────────────────────────────────────────────
// Solde actuel visible : solde disponible + solde réservé (escrow)
const getSolde = async (req, res) => {
  try {
    const organisationId = req.user?.orgId || req.params.organisationId;
    const compte = await getOrCreateCompte(organisationId);

    return res.json({
      success: true,
      data: {
        solde: compte.solde,
        soldeReserve: compte.soldeReserve,
        soldeDisponible: compte.solde,
        devise: compte.devise
      }
    });
  } catch (err) {
    logger.error('Erreur récupération solde CLN', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── 1. INSTRUCTION DE PAIEMENT (Banques / Fintechs partenaires) ────────────────

const creerInstruction = async (req, res) => {
  try {
    const organisationId = req.user?.orgId;
    const { montant, methode, partenaire, dossierId, dossierRef } = req.body;

    if (!montant || montant <= 0) {
      return res.status(400).json({ success: false, message: 'Le montant doit être supérieur à 0.' });
    }

    const compte = await getOrCreateCompte(organisationId);

    if (compte.solde < montant) {
      return res.status(400).json({ success: false, message: 'Solde disponible insuffisant.' });
    }

    const reference = await generateInstructionReference();

    const instruction = await prisma.instructionPaiement.create({
      data: {
        compteId: compte.id,
        reference,
        montant: parseFloat(montant),
        methode,
        partenaire,
        dossierId,
        dossierRef,
        statut: 'DEMANDE'
      }
    });

    logger.info('Instruction de paiement créée', { reference, organisationId });

    return res.status(201).json({
      success: true,
      message: `Instruction ${reference} créée (Demande de paiement).`,
      data: { instruction }
    });
  } catch (err) {
    logger.error('Erreur création instruction', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Transmission au partenaire financier
const transmettreInstruction = async (req, res) => {
  try {
    const { id } = req.params;
    const instruction = await prisma.instructionPaiement.findUnique({ where: { id } });

    if (!instruction) {
      return res.status(404).json({ success: false, message: 'Instruction non trouvée.' });
    }
    if (instruction.statut !== 'DEMANDE') {
      return res.status(400).json({ success: false, message: 'Seule une instruction en Demande peut être transmise.' });
    }

    const updated = await prisma.instructionPaiement.update({
      where: { id },
      data: { statut: 'TRANSMISE' }
    });

    return res.json({ success: true, message: 'Transmise au partenaire financier.', data: { instruction: updated } });
  } catch (err) {
    logger.error('Erreur transmission instruction', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// En cours de traitement bancaire
const traiterInstruction = async (req, res) => {
  try {
    const { id } = req.params;
    const instruction = await prisma.instructionPaiement.findUnique({ where: { id } });

    if (!instruction) {
      return res.status(404).json({ success: false, message: 'Instruction non trouvée.' });
    }
    if (instruction.statut !== 'TRANSMISE') {
      return res.status(400).json({ success: false, message: 'Seule une instruction Transmise peut passer En traitement.' });
    }

    const updated = await prisma.instructionPaiement.update({
      where: { id },
      data: { statut: 'EN_TRAITEMENT' }
    });

    return res.json({ success: true, message: 'En cours de traitement bancaire.', data: { instruction: updated } });
  } catch (err) {
    logger.error('Erreur traitement instruction', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Validation : Paiement exécuté -> débit du CLN
const validerInstruction = async (req, res) => {
  try {
    const { id } = req.params;
    const instruction = await prisma.instructionPaiement.findUnique({ where: { id } });

    if (!instruction) {
      return res.status(404).json({ success: false, message: 'Instruction non trouvée.' });
    }
    if (instruction.statut !== 'EN_TRAITEMENT') {
      return res.status(400).json({ success: false, message: 'Seule une instruction En traitement peut être validée.' });
    }

    const compte = await prisma.compteLogistique.findUnique({ where: { id: instruction.compteId } });
    if (compte.solde < instruction.montant) {
      return res.status(400).json({ success: false, message: 'Solde disponible insuffisant pour exécuter le paiement.' });
    }

    const soldeAvant = compte.solde;
    const soldeApres = soldeAvant - instruction.montant;

    const [updatedInstruction] = await prisma.$transaction([
      prisma.instructionPaiement.update({ where: { id }, data: { statut: 'EXECUTEE' } }),
      prisma.compteLogistique.update({ where: { id: compte.id }, data: { solde: soldeApres } }),
      prisma.operationCLN.create({
        data: {
          compteId: compte.id,
          type: 'INSTRUCTION_PAIEMENT',
          sousType: instruction.methode,
          montant: instruction.montant,
          soldeAvant,
          soldeApres,
          dossierId: instruction.dossierId,
          dossierRef: instruction.dossierRef,
          description: `Instruction ${instruction.reference} exécutée via ${instruction.methode}`
        }
      })
    ]);

    logger.info('Instruction de paiement exécutée', { reference: instruction.reference });

    return res.json({ success: true, message: 'Paiement exécuté.', data: { instruction: updatedInstruction } });
  } catch (err) {
    logger.error('Erreur validation instruction', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Refus : Paiement rejeté
const refuserInstruction = async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;

    const instruction = await prisma.instructionPaiement.findUnique({ where: { id } });
    if (!instruction) {
      return res.status(404).json({ success: false, message: 'Instruction non trouvée.' });
    }
    if (['EXECUTEE', 'REJETEE'].includes(instruction.statut)) {
      return res.status(400).json({ success: false, message: 'Cette instruction ne peut plus être refusée.' });
    }

    const updated = await prisma.instructionPaiement.update({
      where: { id },
      data: { statut: 'REJETEE', motifRejet: motif }
    });

    return res.json({ success: true, message: 'Paiement rejeté.', data: { instruction: updated } });
  } catch (err) {
    logger.error('Erreur refus instruction', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listerInstructions = async (req, res) => {
  try {
    const organisationId = req.user?.orgId;
    const compte = await getOrCreateCompte(organisationId);

    const instructions = await prisma.instructionPaiement.findMany({
      where: { compteId: compte.id },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: { instructions } });
  } catch (err) {
    logger.error('Erreur liste instructions', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── 2. CRÉDIT INTERNE DU COMPTE ────────────────────────────────────────────────

const crediterCompte = async (req, res) => {
  try {
    const organisationId = req.user?.orgId;
    const { type, montant, description, dossierId, dossierRef } = req.body;

    if (!montant || montant <= 0) {
      return res.status(400).json({ success: false, message: 'Le montant doit être supérieur à 0.' });
    }

    const compte = await getOrCreateCompte(organisationId);
    const soldeAvant = compte.solde;
    const soldeApres = soldeAvant + parseFloat(montant);

    const [, operation] = await prisma.$transaction([
      prisma.compteLogistique.update({ where: { id: compte.id }, data: { solde: soldeApres } }),
      prisma.operationCLN.create({
        data: {
          compteId: compte.id,
          type: 'CREDIT_INTERNE',
          sousType: type,
          montant: parseFloat(montant),
          soldeAvant,
          soldeApres,
          dossierId,
          dossierRef,
          description
        }
      })
    ]);

    logger.info('Crédit interne appliqué', { organisationId, type, montant });

    return res.status(201).json({ success: true, message: 'Compte crédité.', data: { operation } });
  } catch (err) {
    logger.error('Erreur crédit interne', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── 3. RÉSERVATION DE FONDS (Escrow interne) ───────────────────────────────────

const creerReservation = async (req, res) => {
  try {
    const organisationId = req.user?.orgId;
    const { montant, motif, dossierId, dossierRef } = req.body;

    if (!montant || montant <= 0) {
      return res.status(400).json({ success: false, message: 'Le montant doit être supérieur à 0.' });
    }

    const compte = await getOrCreateCompte(organisationId);
    if (compte.solde < montant) {
      return res.status(400).json({ success: false, message: 'Solde disponible insuffisant pour cette réservation.' });
    }

    const soldeAvant = compte.solde;
    const soldeApres = soldeAvant - parseFloat(montant);

    const [reservation] = await prisma.$transaction([
      prisma.reservationFonds.create({
        data: { compteId: compte.id, montant: parseFloat(montant), motif, dossierId, dossierRef, statut: 'ACTIVE' }
      }),
      prisma.compteLogistique.update({
        where: { id: compte.id },
        data: { solde: soldeApres, soldeReserve: compte.soldeReserve + parseFloat(montant) }
      }),
      prisma.operationCLN.create({
        data: {
          compteId: compte.id,
          type: 'RESERVATION_FONDS',
          montant: parseFloat(montant),
          soldeAvant,
          soldeApres,
          dossierId,
          dossierRef,
          description: motif
        }
      })
    ]);

    return res.status(201).json({ success: true, message: 'Fonds réservés.', data: { reservation } });
  } catch (err) {
    logger.error('Erreur création réservation', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Libération : les fonds réservés reviennent au solde disponible (prestation non réalisée)
const libererReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await prisma.reservationFonds.findUnique({ where: { id } });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation non trouvée.' });
    }
    if (reservation.statut !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Seule une réservation Active peut être libérée.' });
    }

    const compte = await prisma.compteLogistique.findUnique({ where: { id: reservation.compteId } });
    const soldeAvant = compte.solde;
    const soldeApres = soldeAvant + reservation.montant;

    const [updated] = await prisma.$transaction([
      prisma.reservationFonds.update({ where: { id }, data: { statut: 'LIBEREE' } }),
      prisma.compteLogistique.update({
        where: { id: compte.id },
        data: { solde: soldeApres, soldeReserve: compte.soldeReserve - reservation.montant }
      }),
      prisma.operationCLN.create({
        data: {
          compteId: compte.id,
          type: 'LIBERATION_FONDS',
          montant: reservation.montant,
          soldeAvant,
          soldeApres,
          dossierId: reservation.dossierId,
          dossierRef: reservation.dossierRef,
          description: `Libération de la réservation ${id}`
        }
      })
    ]);

    return res.json({ success: true, message: 'Fonds libérés.', data: { reservation: updated } });
  } catch (err) {
    logger.error('Erreur libération réservation', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Consommation : les fonds réservés sont définitivement utilisés (prestation réalisée)
const consommerReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await prisma.reservationFonds.findUnique({ where: { id } });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation non trouvée.' });
    }
    if (reservation.statut !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Seule une réservation Active peut être consommée.' });
    }

    const compte = await prisma.compteLogistique.findUnique({ where: { id: reservation.compteId } });

    const updated = await prisma.$transaction([
      prisma.reservationFonds.update({ where: { id }, data: { statut: 'CONSOMMEE' } }),
      prisma.compteLogistique.update({
        where: { id: compte.id },
        data: { soldeReserve: compte.soldeReserve - reservation.montant }
      })
    ]);

    return res.json({ success: true, message: 'Réservation consommée.', data: { reservation: updated[0] } });
  } catch (err) {
    logger.error('Erreur consommation réservation', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listerReservations = async (req, res) => {
  try {
    const organisationId = req.user?.orgId;
    const compte = await getOrCreateCompte(organisationId);
    const reservations = await prisma.reservationFonds.findMany({
      where: { compteId: compte.id },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: { reservations } });
  } catch (err) {
    logger.error('Erreur liste réservations', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── 4. PAIEMENT DE SERVICES DE L'ÉCOSYSTÈME SAYGOO ─────────────────────────────

const payerService = async (req, res) => {
  try {
    const organisationId = req.user?.orgId;
    const { service, montant, dossierId, dossierRef, description } = req.body;

    if (!montant || montant <= 0) {
      return res.status(400).json({ success: false, message: 'Le montant doit être supérieur à 0.' });
    }

    const compte = await getOrCreateCompte(organisationId);
    if (compte.solde < montant) {
      return res.status(400).json({ success: false, message: 'Solde disponible insuffisant.' });
    }

    const soldeAvant = compte.solde;
    const soldeApres = soldeAvant - parseFloat(montant);

    const [, operation] = await prisma.$transaction([
      prisma.compteLogistique.update({ where: { id: compte.id }, data: { solde: soldeApres } }),
      prisma.operationCLN.create({
        data: {
          compteId: compte.id,
          type: 'PAIEMENT_SERVICE',
          sousType: service,
          montant: parseFloat(montant),
          soldeAvant,
          soldeApres,
          dossierId,
          dossierRef,
          description
        }
      })
    ]);

    return res.status(201).json({ success: true, message: 'Service payé.', data: { operation } });
  } catch (err) {
    logger.error('Erreur paiement de service', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── 5. GESTION BUDGÉTAIRE ───────────────────────────────────────────────────────

const getHistorique = async (req, res) => {
  try {
    const organisationId = req.user?.orgId;
    const { dossierId, type, dateDebut, dateFin } = req.query;

    const compte = await getOrCreateCompte(organisationId);
    const where = { compteId: compte.id };

    if (dossierId) where.dossierId = dossierId;
    if (type) where.type = type;
    if (dateDebut || dateFin) {
      where.createdAt = {};
      if (dateDebut) where.createdAt.gte = new Date(dateDebut);
      if (dateFin) where.createdAt.lte = new Date(dateFin);
    }

    const operations = await prisma.operationCLN.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: { operations } });
  } catch (err) {
    logger.error('Erreur historique CLN', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Suivi des dépenses par dossier
const getDepensesParDossier = async (req, res) => {
  try {
    const organisationId = req.user?.orgId;
    const { dossierId } = req.params;

    const compte = await getOrCreateCompte(organisationId);

    const depenses = await prisma.operationCLN.aggregate({
      where: {
        compteId: compte.id,
        dossierId,
        type: { in: ['PAIEMENT_SERVICE', 'COMPENSATION'] }
      },
      _sum: { montant: true }
    });

    return res.json({
      success: true,
      data: { dossierId, totalDepense: depenses._sum.montant || 0 }
    });
  } catch (err) {
    logger.error('Erreur dépenses par dossier', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Génération d'un relevé sur une période
const getReleve = async (req, res) => {
  try {
    const organisationId = req.user?.orgId;
    const { dateDebut, dateFin } = req.query;

    const compte = await getOrCreateCompte(organisationId);
    const where = { compteId: compte.id };

    if (dateDebut || dateFin) {
      where.createdAt = {};
      if (dateDebut) where.createdAt.gte = new Date(dateDebut);
      if (dateFin) where.createdAt.lte = new Date(dateFin);
    }

    const operations = await prisma.operationCLN.findMany({ where, orderBy: { createdAt: 'asc' } });

    const totalCredits = operations
      .filter((o) => o.soldeApres > o.soldeAvant)
      .reduce((sum, o) => sum + o.montant, 0);
    const totalDebits = operations
      .filter((o) => o.soldeApres < o.soldeAvant)
      .reduce((sum, o) => sum + o.montant, 0);

    return res.json({
      success: true,
      data: {
        periode: { dateDebut, dateFin },
        soldeActuel: compte.solde,
        totalCredits,
        totalDebits,
        operations
      }
    });
  } catch (err) {
    logger.error('Erreur génération relevé', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── 6. COMPENSATION INTERNE ─────────────────────────────────────────────────────

// Déduction automatique des frais dus à SAYGOO
const compenser = async (req, res) => {
  try {
    const organisationId = req.user?.orgId;
    const { montant, dossierId, dossierRef, description } = req.body;

    if (!montant || montant <= 0) {
      return res.status(400).json({ success: false, message: 'Le montant doit être supérieur à 0.' });
    }

    const compte = await getOrCreateCompte(organisationId);
    if (compte.solde < montant) {
      return res.status(400).json({ success: false, message: 'Solde disponible insuffisant.' });
    }

    const soldeAvant = compte.solde;
    const soldeApres = soldeAvant - parseFloat(montant);

    const [, operation] = await prisma.$transaction([
      prisma.compteLogistique.update({ where: { id: compte.id }, data: { solde: soldeApres } }),
      prisma.operationCLN.create({
        data: {
          compteId: compte.id,
          type: 'COMPENSATION',
          montant: parseFloat(montant),
          soldeAvant,
          soldeApres,
          dossierId,
          dossierRef,
          description: description || 'Frais SAYGOO'
        }
      })
    ]);

    return res.status(201).json({ success: true, message: 'Compensation appliquée.', data: { operation } });
  } catch (err) {
    logger.error('Erreur compensation', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Répartition d'un montant entre plusieurs prestations d'un même dossier
const repartirMontant = async (req, res) => {
  try {
    const organisationId = req.user?.orgId;
    const { dossierId, dossierRef, repartitions } = req.body;

    if (!Array.isArray(repartitions) || repartitions.length === 0) {
      return res.status(400).json({ success: false, message: 'La liste des répartitions est obligatoire.' });
    }

    const montantTotal = repartitions.reduce((sum, r) => sum + parseFloat(r.montant || 0), 0);
    if (montantTotal <= 0) {
      return res.status(400).json({ success: false, message: 'Le montant total doit être supérieur à 0.' });
    }

    const compte = await getOrCreateCompte(organisationId);
    if (compte.solde < montantTotal) {
      return res.status(400).json({ success: false, message: 'Solde disponible insuffisant.' });
    }

    let soldeCourant = compte.solde;
    const operationsData = [];

    for (const r of repartitions) {
      const soldeAvant = soldeCourant;
      soldeCourant -= parseFloat(r.montant);
      operationsData.push({
        compteId: compte.id,
        type: 'COMPENSATION',
        sousType: r.prestation,
        montant: parseFloat(r.montant),
        soldeAvant,
        soldeApres: soldeCourant,
        dossierId,
        dossierRef,
        description: `Répartition : ${r.prestation}`
      });
    }

    await prisma.$transaction([
      prisma.compteLogistique.update({ where: { id: compte.id }, data: { solde: soldeCourant } }),
      ...operationsData.map((data) => prisma.operationCLN.create({ data }))
    ]);

    return res.status(201).json({
      success: true,
      message: 'Montant réparti entre les prestations.',
      data: { montantTotal, repartitions: operationsData }
    });
  } catch (err) {
    logger.error('Erreur répartition montant', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSolde,
  creerInstruction,
  transmettreInstruction,
  traiterInstruction,
  validerInstruction,
  refuserInstruction,
  listerInstructions,
  crediterCompte,
  creerReservation,
  libererReservation,
  consommerReservation,
  listerReservations,
  payerService,
  getHistorique,
  getDepensesParDossier,
  getReleve,
  compenser,
  repartirMontant
};
