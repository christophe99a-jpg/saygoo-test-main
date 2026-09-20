// Variables d'environnement utilisées par les tests.
// Aucune connexion à PostgreSQL n'est nécessaire : Prisma est simulé.
process.env.NODE_ENV = 'test';
process.env.PAYGATE_WEBHOOK_SECRET = 'secret-de-test-paygate';
process.env.ECOBANK_WEBHOOK_SECRET = 'secret-de-test-ecobank';