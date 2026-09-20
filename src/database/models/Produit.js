// src/database/models/Produit.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const User = require('./User');
const Stockage = require('./Stockage');

const Produit = sequelize.define('Produit', {
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

  // Informations produit
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  categorie: {
    type: DataTypes.ENUM('ALIMENTAIRE', 'ELECTRONIQUE', 'TEXTILE', 'INDUSTRIEL', 'AUTRE'),
    allowNull: false,
  },

  // Prix et quantité
  prixUnitaire: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  prixNegociable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  quantiteDisponible: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  unite: {
    type: DataTypes.STRING,
    defaultValue: 'unité',
  },

  // Type de vente
  typeVente: {
    type: DataTypes.ENUM('DETAIL', 'SEMI_GROS', 'GROS', 'MIXTE'),
    defaultValue: 'MIXTE',
  },

  // Localisation du stock
  localisation: {
    type: DataTypes.ENUM('ENTREPOT', 'MAD', 'EN_TRANSIT'),
    allowNull: false,
  },

  // Options
  venteUrgente: { type: DataTypes.BOOLEAN, defaultValue: false },
  promotion: { type: DataTypes.BOOLEAN, defaultValue: false },
  tauxPromotion: { type: DataTypes.FLOAT, allowNull: true },
  venteEnLot: { type: DataTypes.BOOLEAN, defaultValue: false },
  quantiteMinLot: { type: DataTypes.FLOAT, allowNull: true },

  // Prix dégressifs
  prixGros: { type: DataTypes.BIGINT, allowNull: true },
  quantiteMinGros: { type: DataTypes.FLOAT, allowNull: true },

  // Statut
  statut: {
    type: DataTypes.ENUM(
      'BROUILLON',
      'EN_ATTENTE_VALIDATION',
      'PUBLIE',
      'SUSPENDU',
      'EPUISE',
      'ARCHIVE'
    ),
    defaultValue: 'BROUILLON',
  },

  // Enchères
  modeEncheres: { type: DataTypes.BOOLEAN, defaultValue: false },
  prixDepart: { type: DataTypes.BIGINT, allowNull: true },
  prixMinimum: { type: DataTypes.BIGINT, allowNull: true },
  dateFinEncheres: { type: DataTypes.DATE, allowNull: true },
  typeEncheres: {
    type: DataTypes.ENUM('CLASSIQUE', 'INVERSEE'),
    allowNull: true,
  },

  // Stats
  nombreVues: { type: DataTypes.INTEGER, defaultValue: 0 },
  nombreCommandes: { type: DataTypes.INTEGER, defaultValue: 0 },
  noteMoyenne: { type: DataTypes.FLOAT, allowNull: true },

  // Images
  photos: {
    type: DataTypes.JSON,
    defaultValue: [],
  },

  // Relations
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  stockageId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'stockages', key: 'id' },
  },

}, {
  tableName: 'produits',
  timestamps: true,
  paranoid: true,
});

// Référence auto-générée
Produit.beforeValidate(async (produit) => {
  if (!produit.reference) {
    const date = new Date();
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 90000) + 10000;
    produit.reference = `PRD-${annee}${mois}-${random}`;
  }
});

// Associations
Produit.belongsTo(User, { foreignKey: 'userId', as: 'vendeur' });
Produit.belongsTo(Stockage, { foreignKey: 'stockageId', as: 'stockage' });
User.hasMany(Produit, { foreignKey: 'userId', as: 'produits' });

module.exports = Produit;