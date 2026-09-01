// src/utils/response.js

const success = (res, data, message = 'Succès', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const created = (res, data, message = 'Créé avec succès') => {
  return success(res, data, message, 201);
};

const error = (res, message = 'Erreur serveur', statusCode = 500, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

const notFound = (res, message = 'Ressource introuvable') => {
  return error(res, message, 404);
};

const unauthorized = (res, message = 'Non autorisé') => {
  return error(res, message, 401);
};

const forbidden = (res, message = 'Accès interdit') => {
  return error(res, message, 403);
};

const badRequest = (res, message = 'Requête invalide', errors = null) => {
  return error(res, message, 400, errors);
};

module.exports = { success, created, error, notFound, unauthorized, forbidden, badRequest };