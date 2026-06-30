const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { normalizeKinds } = require('./accountKinds');

function trim(v) {
  return String(v ?? '').trim();
}

/** Guardian row has enough data to create/link a login account. */
function guardianProvisionReady(g) {
  return Boolean(trim(g?.fullName) && trim(g?.email) && trim(g?.phone));
}

function generateTemporaryPassword() {
  return `Nc${crypto.randomBytes(6).toString('base64url')}`;
}

/**
 * Create or link guardian accounts for a patient when name + email + phone are provided.
 * New accounts receive a one-time temporary password (guardian should change it after login).
 */
async function provisionGuardiansForPatient(tx, patientId, guardians, patient) {
  const results = [];
  const ready = (Array.isArray(guardians) ? guardians : []).filter(guardianProvisionReady);

  for (const row of ready) {
    const email = trim(row.email).toLowerCase();
    const name = trim(row.fullName);
    const phone = trim(row.phone);

    if (email === trim(patient?.email).toLowerCase()) {
      results.push({ email, error: 'Guardian email cannot match the patient email' });
      continue;
    }

    let guardian = await tx.user.findUnique({ where: { email } });
    let created = false;
    let temporaryPassword = null;

    if (!guardian) {
      temporaryPassword = generateTemporaryPassword();
      const hashed = await bcrypt.hash(temporaryPassword, 10);
      guardian = await tx.user.create({
        data: {
          name,
          email,
          phone,
          password: hashed,
          role: 'user',
          accountKinds: ['guardian'],
          lng: patient?.lng ?? 77.5946,
          lat: patient?.lat ?? 12.9716,
          address: patient?.address || null,
        },
      });
      created = true;
    } else {
      if (guardian.role === 'nurse' || guardian.role === 'admin') {
        results.push({ email, error: 'This email belongs to a staff account' });
        continue;
      }
      const kinds = normalizeKinds(guardian.accountKinds);
      if (!kinds.includes('guardian')) {
        await tx.user.update({
          where: { id: guardian.id },
          data: { accountKinds: [...new Set([...kinds, 'guardian'])] },
        });
      }
      if (!trim(guardian.phone) && phone) {
        await tx.user.update({ where: { id: guardian.id }, data: { phone } });
        guardian.phone = phone;
      }
    }

    await tx.guardianPatientLink.upsert({
      where: {
        guardianId_patientId: { guardianId: guardian.id, patientId },
      },
      create: { guardianId: guardian.id, patientId },
      update: {},
    });

    results.push({
      guardianId: guardian.id,
      name: guardian.name,
      email: guardian.email,
      phone: guardian.phone,
      linked: true,
      created,
      ...(created && temporaryPassword ? { temporaryPassword } : {}),
    });
  }

  return results;
}

module.exports = {
  guardianProvisionReady,
  provisionGuardiansForPatient,
};
