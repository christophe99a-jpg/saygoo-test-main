// src/database/models/Stockage.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const User = require('./User');
const Dossier = require('./Dossier');

const Stockage = sequelize.define('Stockage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  reference: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },

  // Type de transfert
  typeTransfert: {
    type: DataTypes.ENUM('ENTREPOT', 'MAD'),
    allowNull: false,
  },

  // Motif
  motif: {
    type: DataTypes.ENUM(
      'STOCKAGE_TEMPORAIRE',
      'VENTE_ULTERIEURE',
      'OPTIMISATION_LOGISTIQUE',
      'AUTRE'
    ),
    allowNull: false,
  },

  // Informations marchandise
  descriptionMarchandises: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  categorie: {
    type: DataTypes.ENUM('ALIMENTAIRE', 'ELECTRONIQUE', 'TEXTILE', 'INDUSTRIEL', 'AUTRE'),
    allowNull: false,
  },
  quantiteTotale: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  poidsTonnes: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  volumeM3: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  nombreColis: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

  // Localisation
  lieuActuel: {
    type: DataTypes.ENUM('PORT', 'ZONE_DOUANIERE', 'AUTRE'),
    allowNull: false,
  },
  entrepotDestination: {
    type: DataTypes.ENUM('ENTREPOT_SAYGOO', 'ENTREPOT_PARTENAIRE', 'AUTRE'),
    allowNull: false,
  },
  villeLocalisation: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Durée et type de stockage
  dureeEstimee: {
    type: DataTypes.ENUM('MOINS_7J', '7_30J', '1_3M', 'PLUS_3M'),
    allowNull: false,
  },
  typeStockage: {
    type: DataTypes.ENUM('STANDARD', 'SECURISE', 'TEMPERATURE_CONTROLEE', 'PRODUITS_SENSIBLES'),
    defaultValue: 'STANDARD',
  },

  // Statut
  statut: {
    type: DataTypes.ENUM(
      'EN_ATTENTE',
      'VALIDE',
      'EN_COURS_TRANSFERT',
      'STOCKE',
      'PARTIELLEMENT_SORTI',
      'SORTI',
      'LIVRE',
      'ANNULE'
    ),
    defaultValue: 'EN_ATTENTE',
  },

  // Dates clés
  dateTransfertSouhaitee: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  dateEntree: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  dateSortie: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  datesortiePrevue: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },

  // Priorité
  priorite: {
    type: DataTypes.ENUM('STANDARD', 'URGENT'),
    defaultValue: 'STANDARD',
  },

  // Instructions
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Options Pack GOLD
  alerteStockFaible: { type: DataTypes.BOOLEAN, defaultValue: false },
  gestionMultiEntrepots: { type: DataTypes.BOOLEAN, defaultValue: false },
  optimisationIA: { type: DataTypes.BOOLEAN, defaultValue: false },

  // Mode de paiement
  modePaiement: {
    type: DataTypes.ENUM('MOBILE_MONEY', 'CARTE_BANCAIRE', 'CREDIT_SAYGOO'),
    allowNull: true,
  },

  // Coûts
  coutTransfert: { type: DataTypes.BIGINT, allowNull: true },
  coutStockageJournalier: { type: DataTypes.BIGINT, allowNull: true },
  coutStockageTotal: { type: DataTypes.BIGINT, allowNull: true },

  // Stock actuel (en unités ou kg)
  stockInitial: { type: DataTypes.FLOAT, allowNull: true },
  stockActuel: { type: DataTypes.FLOAT, allowNull: true },
  seuilAlerte: { type: DataTypes.FLOAT, allowNull: true },

  // Relations
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  dossierId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'dossiers', key: 'id' },
  },

}, {
  tableName: 'stockages',
  timestamps: true,
  paranoid: true,
});

// Référence auto-générée
Stockage.beforeValidate(async (stockage) => {
  if (!stockage.reference) {
    const date = new Date();
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 90000) + 10000;
    stockage.reference = `STK-${annee}${mois}-${random}`;
  }
});

// Associations
Stockage.belongsTo(User, { foreignKey: 'userId', as: 'operateur' });
Stockage.belongsTo(Dossier, { foreignKey: 'dossierId', as: 'dossier' });
User.hasMany(Stockage, { foreignKey: 'userId', as: 'stockages' });
Dossier.hasMany(Stockage, { foreignKey: 'dossierId', as: 'stockages' });

module.exports = Stockage;