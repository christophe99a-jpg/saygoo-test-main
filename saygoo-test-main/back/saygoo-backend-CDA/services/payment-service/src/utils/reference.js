const prisma = require('../config/prisma');

/**
 * Génère une référence unique pour un paiement
 * Format : PAY-2025-000001
 */
const generateReference = async () => {
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}-`;

  const count = await prisma.paiement.count({
    where: {
      reference: { startsWith: prefix }
    }
  });

  const numero = String(count + 1).padStart(6, '0');
  return `${prefix}${numero}`;
};

module.exports = { generateReference };