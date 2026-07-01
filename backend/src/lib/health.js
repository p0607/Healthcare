const prisma = require('./prisma');
const { isSmtpConfigured } = require('./mail');

async function checkHealth() {
  let db = 'down';

  try {
    await prisma.$queryRaw`SELECT 1`;
    db = 'up';
  } catch {
    db = 'down';
  }

  const smtpReady = isSmtpConfigured();
  const ok = db === 'up';

  return {
    ok,
    ts: Date.now(),
    db,
    smtp: smtpReady ? 'configured' : 'missing',
    env: process.env.NODE_ENV || 'development',
  };
}

module.exports = { checkHealth };
