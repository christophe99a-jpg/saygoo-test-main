const prisma = require('../config/prisma');

/**
 * Génère la référence d'une livraison : LIV-2026-000001
 *
 * Utilise une séquence PostgreSQL et non un `count() + 1`.
 * Avec un comptage, deux livraisons créées simultanément lisent la même
 * valeur et produisent la même référence : la seconde échoue sur la
 * contrainte d'unicité. Une séquence est atomique, elle ne rend jamais
 * deux fois le même numéro.
 *
 * @param {object} [client] Client Prisma ou transaction. Passer la
 *                          transaction en cours garantit que le numéro
 *                          est attribué dans le même contexte.
 */
const generateReference = async (client = prisma) => {
  const annee = new Date().getFullYear();
  const sequence = `seq_livraison_${annee}`;

  await client.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS ${sequence}`);
  const [{ nextval }] = await client.$queryRawUnsafe(`SELECT nextval('${sequence}')`);

  return `LIV-${annee}-${String(nextval).padStart(6, '0')}`;
};

module.exports = { generateReference };
