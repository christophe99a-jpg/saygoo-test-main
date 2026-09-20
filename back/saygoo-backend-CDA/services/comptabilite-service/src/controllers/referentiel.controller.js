const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const { classeDuCompte } = require('../services/comptabilite.rules');

const listerComptes = async (req, res) => {
  try {
    const { classe, recherche, actif } = req.query;
    const where = {};
    if (classe) where.classe = classe;
    if (actif !== undefined) where.actif = actif === 'true';
    if (recherche) {
      where.OR = [
        { numero: { startsWith: recherche } },
        { intitule: { contains: recherche, mode: 'insensitive' } }
      ];
    }
    const comptes = await prisma.compteComptable.findMany({
      where, orderBy: { numero: 'asc' }
    });
    return res.json({ success: true, data: comptes });
  } catch (err) {
    logger.error('Erreur liste comptes', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

const creerCompte = async (req, res) => {
  try {
    const { numero, intitule, sens, collectif } = req.body;
    if (!numero || !intitule) {
      return res.status(400).json({ success: false, message: 'Numéro et intitulé obligatoires.' });
    }

    // La classe se déduit du premier chiffre : elle n'est pas saisie,
    // ce qui évite les incohérences entre numéro et classe.
    const classe = classeDuCompte(numero);
    if (!classe) {
      return res.status(400).json({
        success: false,
        message: 'Numéro hors plan SYSCOHADA : le premier chiffre doit aller de 1 à 8.'
      });
    }

    const existant = await prisma.compteComptable.findUnique({ where: { numero } });
    if (existant) {
      return res.status(409).json({ success: false, message: 'Ce compte existe déjà.' });
    }

    const compte = await prisma.compteComptable.create({
      data: { numero, intitule, classe, sens: sens || 'DEBIT', collectif: Boolean(collectif) }
    });
    return res.status(201).json({ success: true, data: compte });
  } catch (err) {
    logger.error('Erreur création compte', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

const desactiverCompte = async (req, res) => {
  try {
    const compte = await prisma.compteComptable.findUnique({
      where: { numero: req.params.numero },
      include: { _count: { select: { lignes: true } } }
    });
    if (!compte) return res.status(404).json({ success: false, message: 'Compte inconnu.' });

    // Un compte mouvementé ne se supprime jamais : il se désactive.
    // Sa suppression romprait le grand livre des exercices passés.
    const maj = await prisma.compteComptable.update({
      where: { numero: req.params.numero },
      data: { actif: false }
    });
    return res.json({
      success: true,
      data: maj,
      message: compte._count.lignes > 0
        ? `Compte désactivé (${compte._count.lignes} mouvements conservés).`
        : 'Compte désactivé.'
    });
  } catch (err) {
    logger.error('Erreur désactivation compte', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

const listerJournaux = async (req, res) => {
  try {
    const journaux = await prisma.journal.findMany({ orderBy: { code: 'asc' } });
    return res.json({ success: true, data: journaux });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

const listerExercices = async (req, res) => {
  try {
    const exercices = await prisma.exercice.findMany({ orderBy: { annee: 'desc' } });
    return res.json({ success: true, data: exercices });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

const ouvrirExercice = async (req, res) => {
  try {
    const { annee } = req.body;
    const an = Number(annee);
    if (!Number.isInteger(an) || an < 2000 || an > 2100) {
      return res.status(400).json({ success: false, message: 'Année invalide.' });
    }
    const existant = await prisma.exercice.findUnique({ where: { annee: an } });
    if (existant) {
      return res.status(409).json({ success: false, message: `Exercice ${an} déjà ouvert.` });
    }
    const exercice = await prisma.exercice.create({
      data: {
        annee: an,
        dateDebut: new Date(`${an}-01-01T00:00:00Z`),
        dateFin: new Date(`${an}-12-31T23:59:59Z`)
      }
    });
    return res.status(201).json({ success: true, data: exercice });
  } catch (err) {
    logger.error('Erreur ouverture exercice', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

const cloturerExercice = async (req, res) => {
  try {
    const an = Number(req.params.annee);
    const exercice = await prisma.exercice.findUnique({ where: { annee: an } });
    if (!exercice) return res.status(404).json({ success: false, message: 'Exercice inconnu.' });
    if (exercice.statut === 'CLOTURE') {
      return res.status(409).json({ success: false, message: 'Exercice déjà clôturé.' });
    }

    // Aucun brouillon ne doit subsister : il serait définitivement inexploitable.
    const brouillons = await prisma.ecriture.count({
      where: { exerciceId: exercice.id, statut: 'BROUILLON' }
    });
    if (brouillons > 0) {
      return res.status(409).json({
        success: false,
        message: `${brouillons} écriture(s) en brouillon. Validez-les ou supprimez-les avant clôture.`
      });
    }

    const cloture = await prisma.exercice.update({
      where: { annee: an },
      data: { statut: 'CLOTURE', clotureLe: new Date(), cloturePar: req.user?.sub }
    });
    logger.info('Exercice clôturé', { annee: an, par: req.user?.sub });
    return res.json({ success: true, data: cloture });
  } catch (err) {
    logger.error('Erreur clôture exercice', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

module.exports = {
  listerComptes, creerCompte, desactiverCompte,
  listerJournaux, listerExercices, ouvrirExercice, cloturerExercice
};
