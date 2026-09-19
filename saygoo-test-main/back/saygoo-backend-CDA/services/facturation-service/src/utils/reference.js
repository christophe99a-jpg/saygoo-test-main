const prisma = require('../config/prisma');

/**
 * Génère une référence unique pour une facture CDA
 * Format : FACCDA-2026-000123
 */
const generateFactureReference = async () => {
  const year = new Date().getFullYear();
  const prefix = `FACCDA-${year}-`;

  const count = await prisma.factureCDA.count({
    where: { reference: { startsWith: prefix } }
  });

  const numero = String(count + 1).padStart(6, '0');
  return `${prefix}${numero}`;
};

module.exports = { generateFactureReference };