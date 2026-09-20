const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' }
  ]
});

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug('DB Query', { query: e.query, duration: `${e.duration}ms` });
  });
}

prisma.$on('error', (e) => {
  logger.error('DB Error', { message: e.message });
});

module.exports = prisma;