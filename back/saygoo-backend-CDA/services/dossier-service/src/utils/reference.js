const prisma = require('../config/prisma');
const { prochainNumero, maxExistant } = require('./sequence');

/**
 * Reference d'un dossier : DD-2026-000001
 * Numerotation par sequence PostgreSQL (voir utils/sequence.js).
 */
const generateDossierReference = async () => {
  const annee = new Date().getFullYear();
  const prefixe = `DD-${annee}-`;

  const numero = await prochainNumero(
    `seq_dossier_${annee}`,
    () => maxExistant(prisma.dossier, prefixe)
  );

  return `${prefixe}${String(numero).padStart(6, '0')}`;
};

module.exports = { generateDossierReference };
