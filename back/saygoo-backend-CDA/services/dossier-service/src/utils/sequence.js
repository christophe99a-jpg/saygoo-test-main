const prisma = require('../config/prisma');

/**
 * Numérotation atomique par séquence PostgreSQL.
 *
 * Remplace le motif `count() + 1`, qui n'est pas sûr en concurrence :
 * deux requêtes simultanées lisent le même comptage et produisent le même
 * numéro ; la seconde échoue sur la contrainte d'unicité, ou pire, crée un
 * doublon si la contrainte n'existe pas.
 *
 * Une séquence PostgreSQL ne rend jamais deux fois la même valeur, même
 * sous forte charge et même si la transaction appelante est annulée.
 */

/**
 * Renvoie le prochain numéro d'une séquence, en l'amorçant si besoin.
 *
 * L'amorçage est le point délicat : les bases contiennent déjà des
 * références créées par l'ancienne méthode. Une séquence neuve repartirait
 * de 1 et produirait des collisions. À sa première utilisation seulement,
 * on la cale donc sur le plus grand numéro déjà présent.
 *
 * @param {string}   sequence  Nom de la séquence (lettres, chiffres, _)
 * @param {Function} amorce    Fonction async renvoyant le plus grand numéro existant
 * @param {object}   [client]  Client Prisma ou transaction en cours
 * @returns {Promise<number>}
 */
const prochainNumero = async (sequence, amorce, client = prisma) => {
  if (!/^[a-z0-9_]+$/.test(sequence)) {
    throw new Error(`Nom de séquence invalide : ${sequence}`);
  }

  await client.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS ${sequence}`);

  // is_called vaut false tant que nextval n'a jamais été appelé.
  // C'est le signal fiable d'une séquence fraîchement créée.
  const [etat] = await client.$queryRawUnsafe(`SELECT is_called FROM ${sequence}`);

  if (etat && etat.is_called === false && typeof amorce === 'function') {
    const depart = await amorce();
    if (depart > 0) {
      await client.$executeRawUnsafe(`SELECT setval('${sequence}', ${Number(depart)})`);
    }
  }

  const [resultat] = await client.$queryRawUnsafe(`SELECT nextval('${sequence}') AS valeur`);
  return Number(resultat.valeur);
};

/**
 * Extrait le plus grand numéro parmi des références partageant un préfixe.
 *
 * Exemple : sur ['DD-2026-000001', 'DD-2026-000009'] avec le préfixe
 * 'DD-2026-', renvoie 9.
 *
 * @param {object} modele  Délégué Prisma (prisma.dossier, prisma.venteVehicule...)
 * @param {string} prefixe Préfixe des références à examiner
 * @param {string} [champ] Nom du champ portant la référence
 */
const maxExistant = async (modele, prefixe, champ = 'reference') => {
  const lignes = await modele.findMany({
    where: { [champ]: { startsWith: prefixe } },
    select: { [champ]: true }
  });

  return lignes.reduce((max, ligne) => {
    const suffixe = String(ligne[champ]).slice(prefixe.length);
    const numero = parseInt(suffixe, 10);
    return Number.isFinite(numero) && numero > max ? numero : max;
  }, 0);
};

module.exports = { prochainNumero, maxExistant };
