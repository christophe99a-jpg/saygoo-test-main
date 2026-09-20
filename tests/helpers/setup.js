// tests/helpers/setup.js
const { sequelize } = require('../../src/config/database');
const User = require('../../src/database/models/User');
const Dossier = require('../../src/database/models/Dossier');
const Cotation = require('../../src/database/models/Cotation');
const Paiement = require('../../src/database/models/Paiement');
const Tracking = require('../../src/database/models/Tracking');
const Notification = require('../../src/database/models/Notification');
const Commande = require('../../src/database/models/Commande');
const Produit = require('../../src/database/models/Produit');
const Stockage = require('../../src/database/models/Stockage');
const MouvementStock = require('../../src/database/models/MouvementStock');

beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
});

afterAll(async () => {
  // Suppression dans le bon ordre (respect des FK)
  await MouvementStock.destroy({ where: {}, force: true });
  await Commande.destroy({ where: {}, force: true });
  await Produit.destroy({ where: {}, force: true });
  await Stockage.destroy({ where: {}, force: true });
  await Notification.destroy({ where: {}, force: true });
  await Tracking.destroy({ where: {}, force: true });
  await Paiement.destroy({ where: {}, force: true });
  await Cotation.destroy({ where: {}, force: true });
  await Dossier.destroy({ where: {}, force: true });
  await User.destroy({ where: {}, force: true });
  await sequelize.close();
});