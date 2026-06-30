const prisma = require('../lib/prisma');

const connectDB = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Copy backend/.env.example to backend/.env and set your Postgres URL.'
    );
  }
  // Lightweight ping to fail fast if Postgres is unreachable.
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('PostgreSQL connected');
  } catch (err) {
    throw new Error(
      `Cannot connect to PostgreSQL with DATABASE_URL.\n  Reason: ${err.message}\n  Check that the database is running and the URL/credentials are correct.`
    );
  }
};

module.exports = connectDB;
