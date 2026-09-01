// src/modules/auth/validators/auth.validatorB.js
const Joi = require('joi');

const inscriptionSchema = Joi.object({
  raisonSociale: Joi.string().min(2).max(150).required(),
  nomCommercial: Joi.string().max(150).optional(),
  formeJuridique: Joi.string().valid('SARL', 'SA', 'EI', 'AUTRE').optional(),
  nomRepresentant: Joi.string().min(2).max(100).required(),
  prenomRepresentant: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  telephone: Joi.string().min(8).max(20).required(),
  motDePasse: Joi.string().min(8).max(64).required(),
  role: Joi.string()
    .valid('OPERATEUR', 'ADMIN', 'CDA', 'CONSIGNATEUR', 'TRANSPORTEUR', 'ENTREPOSEUR')
    .optional()
    .default('OPERATEUR'),
  typeActivite: Joi.string()
    .valid('IMPORTATEUR', 'EXPORTATEUR', 'DISTRIBUTEUR', 'TRADER', 'AUTRE')
    .optional(),
  canalCommunication: Joi.string().valid('SMS', 'WHATSAPP', 'EMAIL').optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  motDePasse: Joi.string().required(),
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
  validerInscription: validate(inscriptionSchema),
  validerLogin: validate(loginSchema),
};
