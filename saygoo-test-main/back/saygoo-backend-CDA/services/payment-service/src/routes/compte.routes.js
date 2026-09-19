const express = require('express');
const router = express.Router();

const compteController = require('../controllers/compte.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

// ── Solde ──────────────────────────────────────────────────────────────────────
router.get('/solde', compteController.getSolde);

// ── 1. Instruction de paiement (Banques / Fintechs partenaires) ───────────────
router.get('/instructions', compteController.listerInstructions);
router.post(
  '/instructions',
  authorize('SUPER_ADMIN', 'CDA', 'COMPTABLE'),
  compteController.creerInstruction
);
router.patch(
  '/instructions/:id/transmettre',
  authorize('SUPER_ADMIN', 'CDA', 'COMPTABLE'),
  compteController.transmettreInstruction
);
router.patch(
  '/instructions/:id/traiter',
  authorize('SUPER_ADMIN', 'COMPTABLE'),
  compteController.traiterInstruction
);
router.patch(
  '/instructions/:id/valider',
  authorize('SUPER_ADMIN', 'COMPTABLE'),
  compteController.validerInstruction
);
router.patch(
  '/instructions/:id/refuser',
  authorize('SUPER_ADMIN', 'COMPTABLE'),
  compteController.refuserInstruction
);

// ── 2. Crédit interne du compte ────────────────────────────────────────────────
router.post(
  '/credits',
  authorize('SUPER_ADMIN', 'COMPTABLE'),
  compteController.crediterCompte
);

// ── 3. Réservation de fonds (Escrow interne) ───────────────────────────────────
router.get('/reservations', compteController.listerReservations);
router.post(
  '/reservations',
  authorize('SUPER_ADMIN', 'CDA', 'COMPTABLE'),
  compteController.creerReservation
);
router.patch(
  '/reservations/:id/liberer',
  authorize('SUPER_ADMIN', 'CDA', 'COMPTABLE'),
  compteController.libererReservation
);
router.patch(
  '/reservations/:id/consommer',
  authorize('SUPER_ADMIN', 'CDA', 'COMPTABLE'),
  compteController.consommerReservation
);

// ── 4. Paiement de services de l'écosystème SAYGOO ─────────────────────────────
router.post(
  '/services/payer',
  authorize('SUPER_ADMIN', 'CDA', 'COMPTABLE'),
  compteController.payerService
);

// ── 5. Gestion budgétaire ───────────────────────────────────────────────────────
router.get('/historique', compteController.getHistorique);
router.get('/dossiers/:dossierId/depenses', compteController.getDepensesParDossier);
router.get('/releve', compteController.getReleve);

// ── 6. Compensation interne ─────────────────────────────────────────────────────
router.post(
  '/compensation',
  authorize('SUPER_ADMIN', 'COMPTABLE'),
  compteController.compenser
);
router.post(
  '/compensation/repartir',
  authorize('SUPER_ADMIN', 'COMPTABLE'),
  compteController.repartirMontant
);

module.exports = router;