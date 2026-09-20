// src/database/models/Commande.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const User = require('./User');
const Produit = require('./Produit');

const Commande = sequelize.define('Commande', {
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

  // Quantité et prix
  quantite: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  prixUnitaire: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  montantTotal: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },

  // Statut
  statut: {
    type: DataTypes.ENUM(
      'EN_ATTENTE',
      'CONFIRME',
      'PAYE',
      'EN_PREPARATION',
      'EXPEDIE',
      'LIVRE',
      'ANNULE',
      'REMBOURSE'
    ),
    defaultValue: 'EN_ATTENTE',
  },

  // Paiement escrow
  paiementEscrow: { type: DataTypes.BOOLEAN, defaultValue: true },
  statutPaiement: {
    type: DataTypes.ENUM('EN_ATTENTE', 'PAYE', 'ESCROW', 'LIBERE', 'REMBOURSE'),
    defaultValue: 'EN_ATTENTE',
  },

  // Livraison
  adresseLivraison: { type: DataTypes.TEXT, allowNull: true },
  villeLivraison: { type: DataTypes.STRING, allowNull: true },
  telephoneLivraison: { type: DataTypes.STRING, allowNull: true },
  modeLivraison: {
    type: DataTypes.ENUM('LIVRAISON_DOMICILE', 'RETRAIT_ENTREPOT', 'POINT_RELAIS'),
    defaultValue: 'LIVRAISON_DOMICILE',
  },

  // Dates
  datePaiement: { type: DataTypes.DATE, allowNull: true },
  dateLivraison: { type: DataTypes.DATE, allowNull: true },
  dateConfirmation: { type: DataTypes.DATE, allowNull: true },

  // Notes
  notes: { type: DataTypes.TEXT, allowNull: true },
  motifAnnulation: { type: DataTypes.TEXT, allowNull: true },

  // Commission SAYGOO (5%)
  commissionSaygoo: { type: DataTypes.BIGINT, allowNull: true },
  montantVendeur: { type: DataTypes.BIGINT, allowNull: true },

  // Relations
  acheteurId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  produitId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'produits', key: 'id' },
  },
  vendeurId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },

}, {
  tableName: 'commandes',
  timestamps: true,
  paranoid: true,
});

// Référence auto-générée
Commande.beforeValidate(async (commande) => {
  if (!commande.reference) {
    const date = new Date();
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 90000) + 10000;
    commande.reference = `CMD-${annee}${mois}-${random}`;
  }
  // Calcul commission SAYGOO 5%
  if (commande.montantTotal) {
    commande.commissionSaygoo = Math.round(Number(commande.montantTotal) * 0.05);
    commande.montantVendeur = Number(commande.montantTotal) - commande.commissionSaygoo;
  }
});

// Associations
Commande.belongsTo(User, { foreignKey: 'acheteurId', as: 'acheteur' });
Commande.belongsTo(User, { foreignKey: 'vendeurId', as: 'vendeur' });
Commande.belongsTo(Produit, { foreignKey: 'produitId', as: 'produit' });
Produit.hasMany(Commande, { foreignKey: 'produitId', as: 'commandes' });
User.hasMany(Commande, { foreignKey: 'acheteurId', as: 'commandesAcheteur' });
User.hasMany(Commande, { foreignKey: 'vendeurId', as: 'commandesVendeur' });

module.exports = Commande;