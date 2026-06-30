#!/usr/bin/env node
/**
 * Create or update a platform admin account (backend team only — not exposed in UI).
 *
 * Usage:
 *   node scripts/create-admin.js --email ops@company.com --name "Ops Admin" --password "ChangeMe123"
 *   node scripts/create-admin.js --email you@company.com --tier super_admin --password "ChangeMe123"
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');
const { validatePassword } = require('../src/lib/password');
const { ADMIN_TIERS } = require('../src/lib/adminPermissions');

function readArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx === process.argv.length - 1) return '';
  return String(process.argv[idx + 1] || '').trim();
}

async function main() {
  const email = readArg('--email').toLowerCase();
  const name = readArg('--name') || 'Platform Admin';
  const password = readArg('--password');
  const tierRaw = readArg('--tier') || ADMIN_TIERS.admin;
  const adminTier = tierRaw === ADMIN_TIERS.super_admin ? ADMIN_TIERS.super_admin : ADMIN_TIERS.admin;

  if (!email || !password) {
    console.error(
      'Usage: node scripts/create-admin.js --email EMAIL --password PASSWORD [--name "Name"] [--tier admin|super_admin]'
    );
    process.exit(1);
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    console.error(passwordError);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role !== 'admin') {
      console.error(`Account ${email} exists but is not an admin (role=${existing.role}).`);
      process.exit(1);
    }
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        password: hashed,
        adminTier,
        accountKinds: [],
        accountActive: true,
      },
    });
    console.log(`Updated admin ${user.email} (tier=${user.adminTier})`);
  } else {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: 'admin',
        adminTier,
        accountKinds: [],
      },
    });
    console.log(`Created admin ${user.email} (tier=${user.adminTier})`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
