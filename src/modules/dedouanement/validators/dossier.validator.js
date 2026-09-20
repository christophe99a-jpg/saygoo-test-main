// src/modules/dedouanement/validators/dossier.validator.js
const Joi = require('joi');

const creerDossierSchema = Joi.object({
  typeOperation: Joi.string().valid('IMPORTATION', 'EXPORTATION').required(),
  regimeDouanier: Joi.string()
    .valid('MISE_A_CONSOMMATION', 'TRANSIT', 'ADMISSION_TEMPORAIRE', 'AUTRE')
    .required(),

  descriptionMarchandises: Joi.string().min(5).required(),
  categorieProduit: Joi.string()
    .valid('ALIMENTAIRE', 'ELECTRONIQUE', 'TEXTILE', 'INDUSTRIEL', 'AUTRE')
    .required(),
  quantite: Joi.string().required(),
  poidsTotalKg: Joi.number().positive().required(),
  volumeM3: Joi.number().positive().optional(),
  valeurFOB: Joi.number().positive().required(),
  valeurCIF: Joi.number().positive().optional(),

  modeTransport: Joi.string().valid('MARITIME', 'AERIEN', 'TERRESTRE').required(),
  portEmbarquement: Joi.string().optional(),
  portDestination: Joi.string().required(),
  nomNavire: Joi.string().optional(),
  eta: Joi.date().optional(),
  numeroConteneur: Joi.string().optional(),
  typeConteneur: Joi.string()
    .valid('VINGT_PIEDS', 'QUARANTE_PIEDS', 'GROUPAGE')
    .optional(),

  nomFournisseur: Joi.string().required(),
  paysFournisseur: Joi.string().required(),
  adresseFournisseur: Joi.string().optional(),
  contactFournisseur: Joi.string().optional(),

  consignes: Joi.string().optional(),
  priorite: Joi.string().valid('STANDARD', 'URGENT').optional(),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Données invalides', errors: messages });
  }
  next();
};

module.exports = {
  validerCreerDossier: validate(creerDossierSchema),
};