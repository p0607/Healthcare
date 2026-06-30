/**
 * Interactive Postgres connection helper.
 *
 * Prompts for host/port/user/password/db, tries to connect, auto-creates the
 * database if missing, and writes a working DATABASE_URL into backend/.env.
 *
 * Run:  npm run db:setup
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Client } = require('pg');

const ENV_PATH = path.join(__dirname, '..', '.env');

const ask = (rl, q, def) =>
  new Promise((resolve) => {
    const prompt = def ? `${q} [${def}]: ` : `${q}: `;
    rl.question(prompt, (a) => resolve((a && a.trim()) || def || ''));
  });

const askHidden = (rl, q) =>
  new Promise((resolve) => {
    process.stdout.write(`${q}: `);
    const stdin = process.openStdin();
    let input = '';
    const onData = (chunk) => {
      const ch = chunk.toString();
      if (ch === '\n' || ch === '\r' || ch === '\r\n') {
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input);
      } else if (ch === '\u0003') {
        process.exit(1);
      } else if (ch === '\u0008' || ch === '\u007f') {
        input = input.slice(0, -1);
      } else {
        input += ch;
        process.stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });

const enc = (s) => encodeURIComponent(s);

const buildUrl = ({ user, password, host, port, db }) =>
  `postgresql://${enc(user)}:${enc(password)}@${host}:${port}/${enc(db)}`;

const tryConnect = async ({ user, password, host, port, db }) => {
  const client = new Client({ user, password, host, port, database: db });
  await client.connect();
  await client.query('SELECT 1');
  await client.end();
};

const ensureDatabase = async ({ user, password, host, port, db }) => {
  // Connect to the default 'postgres' DB and create our DB if missing.
  const client = new Client({ user, password, host, port, database: 'postgres' });
  await client.connect();
  const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [db]);
  if (res.rowCount === 0) {
    await client.query(`CREATE DATABASE "${db.replace(/"/g, '""')}"`);
    console.log(`  ✔ Created database "${db}"`);
  } else {
    console.log(`  ✔ Database "${db}" already exists`);
  }
  await client.end();
};

const writeEnv = (databaseUrl) => {
  let body = '';
  if (fs.existsSync(ENV_PATH)) body = fs.readFileSync(ENV_PATH, 'utf8');
  if (body.match(/^DATABASE_URL\s*=.*$/m)) {
    body = body.replace(/^DATABASE_URL\s*=.*$/m, `DATABASE_URL=${databaseUrl}`);
  } else {
    body += (body.endsWith('\n') ? '' : '\n') + `DATABASE_URL=${databaseUrl}\n`;
  }
  // Make sure the other keys exist with sane defaults.
  const ensure = (key, val) => {
    if (!body.match(new RegExp(`^${key}\\s*=`, 'm'))) {
      body += `${key}=${val}\n`;
    }
  };
  ensure('PORT', '5000');
  ensure('JWT_SECRET', 'change_me_to_a_long_random_string_for_dev');
  ensure('JWT_EXPIRES_IN', '7d');
  ensure('CLIENT_ORIGIN', 'http://localhost:5173');
  fs.writeFileSync(ENV_PATH, body);
};

(async () => {
  console.log('\n=== NurseCare Postgres setup ===\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const host = await ask(rl, 'Postgres host', '127.0.0.1');
  const port = await ask(rl, 'Postgres port', '5432');
  const user = await ask(rl, 'Postgres user', 'postgres');
  rl.pause(); // pause readline so we can read raw stdin for password
  const password = await askHidden(rl, 'Postgres password (typing hidden as *)');
  rl.resume();
  const db = await ask(rl, 'Database name', 'nurse_care');
  rl.close();
  process.stdin.pause();

  const params = { host, port: parseInt(port, 10), user, password, db };

  console.log('\n→ Trying to connect…');
  try {
    await tryConnect(params);
    console.log('  ✔ Connection OK and database exists\n');
  } catch (err) {
    if (/database .* does not exist/i.test(err.message) || err.code === '3D000') {
      console.log('  • Database missing, will create it…');
      try {
        await ensureDatabase(params);
        await tryConnect(params);
        console.log('  ✔ Connection OK\n');
      } catch (e2) {
        console.error('\n✖ Could not create the database:\n  ', e2.message, '\n');
        console.error('Hints:');
        console.error('  • Check the password is correct.');
        console.error('  • Make sure the user has CREATE DATABASE rights.');
        process.exit(1);
      }
    } else if (/password authentication failed/i.test(err.message) || err.code === '28P01') {
      console.error('\n✖ Wrong password for user', user);
      console.error(
        '  Reset it: see the README "Path B" instructions, or use Docker / Neon.\n'
      );
      process.exit(1);
    } else if (err.code === 'ECONNREFUSED') {
      console.error('\n✖ No Postgres server is listening on', `${host}:${port}`);
      console.error('  Start your local Postgres service or change host/port.\n');
      process.exit(1);
    } else {
      console.error('\n✖ Connection error:', err.message, '\n');
      process.exit(1);
    }
  }

  const url = buildUrl(params);
  writeEnv(url);
  console.log('→ Wrote DATABASE_URL to backend/.env');
  console.log('  Value:', url.replace(/:[^:@]+@/, ':****@'));

  console.log('\nNext steps:');
  console.log('  npm run db:push    # create tables');
  console.log('  npm run seed       # insert demo users');
  console.log('  npm run dev        # start the API\n');
  process.exit(0);
})();
