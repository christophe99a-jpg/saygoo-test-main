// src/modules/paiement/services/escrow.service.js
const Paiement = require('../../../database/models/Paiement');
const logger = require('../../../utils/logger');
const { Op } = require('sequelize');

// Vérifier et expirer les paiements dépassés
const expirерPaiementsExpires = async () => {
  const expires = await Paiement.findAll({
    where: {
      statut: { [Op.in]: ['EN_ATTENTE', 'EN_COURS'] },
      dateExpiration: { [Op.lt]: new Date() },
    },
  });

  for (const paiement of expires) {
    await paiement.update({ statut: 'ECHEC' });
    logger.info(`Paiement expiré : ${paiement.reference}`);
  }

  return expires.length;
};

// Statistiques escrow (admin)
const statsEscrow = async () => {
  const enEscrow = await Paiement.findAll({
    where: { statut: 'ESCROW' },
    attributes: ['id', 'reference', 'montantTotal', 'createdAt'],
  });

  const totalBloque = enEscrow.reduce((sum, p) => sum + Number(p.montantTotal), 0);

  return {
    nombrePaiementsEscrow: enEscrow.length,
    totalBloqueFCFA: totalBloque,
    paiements: enEscrow,
  };
};

module.exports = { expirерPaiementsExpires, statsEscrow };