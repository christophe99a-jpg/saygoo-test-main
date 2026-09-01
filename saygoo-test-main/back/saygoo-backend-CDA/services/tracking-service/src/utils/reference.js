const prisma = require('../config/prisma');

/**
 * Génère une référence unique pour une livraison
 * Format : LIV-2025-000001
 */
const generateReference = async () => {
  const year = new Date().getFullYear();
  const prefix = `LIV-${year}-`;

  const count = await prisma.livraison.count({
    where: {
      reference: { startsWith: prefix }
    }
  });

  const numero = String(count + 1).padStart(6, '0');
  return `${prefix}${numero}`;
};

module.exports = { generateReference };