/**
 * Drop all Prisma-managed tables and re-apply schema + seed.
 * DEV ONLY — never run against production without a backup.
 *
 * Usage: npm run db:reset
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { spawnSync } = require('child_process');
const path = require('path');
const readline = require('readline');

const backendRoot = path.join(__dirname, '..');

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: backendRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

const ask = (q) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (a) => {
      rl.close();
      resolve(a.trim().toLowerCase());
    });
  });

(async () => {
  const url = process.env.DATABASE_URL || '';
  const masked = url.replace(/:([^:@]+)@/, ':****@');
  console.log('\n⚠  This will DROP ALL TABLES in:', masked || '(DATABASE_URL missing)');
  const answer = await ask('Type "yes" to continue: ');
  if (answer !== 'yes') {
    console.log('Aborted.');
    process.exit(0);
  }

  run('npx', ['prisma', 'db', 'push', '--force-reset', '--accept-data-loss']);
  run('node', ['src/seed.js']);
  console.log('\n✔ Database reset and seeded.\n');
})();
