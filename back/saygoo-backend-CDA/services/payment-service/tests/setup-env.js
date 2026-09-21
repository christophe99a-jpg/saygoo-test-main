// Variables d'environnement utilisées par les tests.
// Aucune connexion à PostgreSQL n'est nécessaire : Prisma est simulé.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'secret-de-test-payment';
process.env.PAYGATE_WEBHOOK_SECRET = 'secret-de-test-paygate';
process.env.ECOBANK_WEBHOOK_SECRET = 'secret-de-test-ecobank';
process.env.RECU_SECRET = 'secret-de-test-recu';
process.env.RECU_VERIFICATION_URL = 'https://saygoo.test/api/v1/recus/verifier';
