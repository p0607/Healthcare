/**
 * Non-interactive database bootstrap.
 *
 * 1. Parses DATABASE_URL from env / backend/.env
 * 2. Creates the database on local Postgres if missing (skipped for Azure / managed hosts)
 * 3. Runs `prisma db push`
 * 4. Optionally runs seed (`SEED=1` or `--seed`)
 *
 * Usage:
 *   npm run db:init
 *   npm run db:init -- --seed
 *   SEED=1 node scripts/init-db.js
 *
 * Env overrides (optional):
 *   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { spawnSync } = require('child_process');
const path = require('path');
const { Client } = require('pg');

const backendRoot = path.join(__dirname, '..');
const shouldSeed = process.env.SEED === '1' || process.argv.includes('--seed');
const skipCreate = process.argv.includes('--skip-create');

const MANAGED_HOST_PATTERNS = [
  /\.postgres\.database\.azure\.com$/i,
  /\.neon\.tech$/i,
  /\.supabase\.co$/i,
  /\.rds\.amazonaws\.com$/i,
  /\.elephantsql\.com$/i,
];

function parseDatabaseUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return {
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      host: u.hostname,
      port: u.port ? parseInt(u.port, 10) : 5432,
      database: u.pathname.replace(/^\//, '').split('?')[0],
      ssl: u.searchParams.get('sslmode') === 'require' || u.searchParams.get('ssl') === 'true',
      raw: url,
    };
  } catch {
    return null;
  }
}

function paramsFromEnv() {
  const fromUrl = parseDatabaseUrl(process.env.DATABASE_URL);
  if (!fromUrl) {
    console.error('✖ DATABASE_URL is missing. Set it in backend/.env or the environment.');
    process.exit(1);
  }
  return {
    user: process.env.PGUSER || fromUrl.user,
    password: process.env.PGPASSWORD || fromUrl.password,
    host: process.env.PGHOST || fromUrl.host,
    port: parseInt(process.env.PGPORT || String(fromUrl.port), 10),
    database: process.env.PGDATABASE || fromUrl.database,
    ssl: fromUrl.ssl,
  };
}

function isManagedHost(host) {
  return MANAGED_HOST_PATTERNS.some((re) => re.test(host));
}

async function tryConnect(params, database = params.database) {
  const client = new Client({
    user: params.user,
    password: params.password,
    host: params.host,
    port: params.port,
    database,
    ssl: params.ssl ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  await client.query('SELECT 1');
  await client.end();
}

async function ensureDatabase(params) {
  if (skipCreate || isManagedHost(params.host)) {
    console.log('→ Skipping CREATE DATABASE (managed host or --skip-create)');
    return;
  }

  const adminDb = params.host === '127.0.0.1' || params.host === 'localhost' ? 'postgres' : 'postgres';
  const client = new Client({
    user: params.user,
    password: params.password,
    host: params.host,
    port: params.port,
    database: adminDb,
    ssl: params.ssl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [params.database]);
    if (res.rowCount === 0) {
      const safeName = params.database.replace(/"/g, '""');
      await client.query(`CREATE DATABASE "${safeName}"`);
      console.log(`  ✔ Created database "${params.database}"`);
    } else {
      console.log(`  ✔ Database "${params.database}" already exists`);
    }
  } finally {
    await client.end();
  }
}

function run(cmd, args, opts = {}) {
  console.log(`→ ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, {
    cwd: backendRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...opts.env },
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

(async () => {
  console.log('\n=== Nurse Care — database init ===\n');

  const params = paramsFromEnv();
  const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
  console.log('DATABASE_URL:', maskedUrl);
  console.log('Host:', params.host, '| DB:', params.database, '\n');

  console.log('→ Checking connection…');
  try {
    await tryConnect(params);
    console.log('  ✔ Connected\n');
  } catch (err) {
    if (/database .* does not exist/i.test(err.message) || err.code === '3D000') {
      console.log('  • Database missing — creating…');
      try {
        await ensureDatabase(params);
        await tryConnect(params);
        console.log('  ✔ Connected\n');
      } catch (e2) {
        console.error('\n✖ Could not create or connect to database:\n  ', e2.message);
        console.error('\nFor Azure: create database "nurse_care" in the portal first, then re-run.\n');
        process.exit(1);
      }
    } else {
      console.error('\n✖ Connection failed:', err.message);
      if (err.code === 'ECONNREFUSED') {
        console.error('  Start PostgreSQL or check host/port in DATABASE_URL.\n');
      }
      process.exit(1);
    }
  }

  run('npx', ['prisma', 'generate']);
  run('npx', ['prisma', 'db', 'push']);

  if (shouldSeed) {
    run('node', ['src/seed.js']);
  } else {
    console.log('\nTip: run `npm run seed` to insert demo users and catalog data.');
  }

  console.log('\n✔ Database init complete.\n');
})();
