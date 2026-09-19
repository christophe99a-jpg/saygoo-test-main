const prisma = require('../config/prisma');

/**
 * Génère une référence unique pour un dossier de dédouanement
 * Format : DD-2026-000245
 */
const generateDossierReference = async () => {
  const year = new Date().getFullYear();
  const prefix = `DD-${year}-`;

  const count = await prisma.dossier.count({
    where: { reference: { startsWith: prefix } }
  });

  const numero = String(count + 1).padStart(6, '0');
  return `${prefix}${numero}`;
};

module.exports = { generateDossierReference };