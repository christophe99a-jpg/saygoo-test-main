const express = require('express');
const router = express.Router();

const ecriture = require('../controllers/ecriture.controller');
const etats = require('../controllers/etats.controller');
const referentiel = require('../controllers/referentiel.controller');
const ajustement = require('../controllers/ajustement.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// La gateway filtre déjà sur SUPER_ADMIN, ADMIN et COMPTABLE, mais le service
// revérifie : il doit rester sûr même s'il est appelé directement sur le port 3003.
router.use(authenticate);

const LECTURE = ['SUPER_ADMIN', 'ADMIN', 'COMPTABLE', 'CDA'];
const ECRITURE = ['SUPER_ADMIN', 'ADMIN', 'COMPTABLE'];
const CLOTURE = ['SUPER_ADMIN', 'COMPTABLE'];

// ── Référentiel ───────────────────────────────────────────────────────────────
router.get('/comptes', authorize(...LECTURE), referentiel.listerComptes);
router.post('/comptes', authorize(...ECRITURE), referentiel.creerCompte);
router.delete('/comptes/:numero', authorize(...ECRITURE), referentiel.desactiverCompte);

router.get('/journaux', authorize(...LECTURE), referentiel.listerJournaux);

router.get('/exercices', authorize(...LECTURE), referentiel.listerExercices);
router.post('/exercices', authorize(...CLOTURE), referentiel.ouvrirExercice);
router.post('/exercices/:annee/cloturer', authorize(...CLOTURE), referentiel.cloturerExercice);

// ── États comptables ──────────────────────────────────────────────────────────
// Déclarés avant /ecritures/:id pour éviter toute collision de routes.
router.get('/balance', authorize(...LECTURE), etats.balance);
router.get('/balance-agee', authorize(...LECTURE), etats.balanceAgee);
router.get('/grand-livre/:numero', authorize(...LECTURE), etats.grandLivre);
router.get('/journal/:code', authorize(...LECTURE), etats.journalPeriode);
router.get('/export/ecritures', authorize(...LECTURE), etats.exporterEcritures);

// ── Ajustements comptables ────────────────────────────────────────────────────
router.get('/ajustements', authorize(...LECTURE), ajustement.listerAjustements);
router.post('/ajustements', authorize(...LECTURE), ajustement.demanderAjustement);
router.post('/ajustements/:id/valider', authorize(...ECRITURE), ajustement.validerAjustement);
router.post('/ajustements/:id/rejeter', authorize(...ECRITURE), ajustement.rejeterAjustement);

// ── Écritures ─────────────────────────────────────────────────────────────────
router.get('/ecritures', authorize(...LECTURE), ecriture.listerEcritures);
router.post('/ecritures', authorize(...ECRITURE), ecriture.creerEcriture);
router.get('/ecritures/:id', authorize(...LECTURE), ecriture.getEcriture);
router.delete('/ecritures/:id', authorize(...ECRITURE), ecriture.supprimerEcriture);
router.post('/ecritures/:id/valider', authorize(...ECRITURE), ecriture.validerEcriture);
router.post('/ecritures/:id/extourner', authorize(...ECRITURE), ecriture.extournerEcriture);

module.exports = router;
