const bcrypt = require('bcryptjs');
const prisma = require('./prisma');

const OTP_TTL_MS = Number(process.env.VISIT_OTP_TTL_MS || 5 * 60 * 1000);
const MAX_OTP_ATTEMPTS = Number(process.env.VISIT_OTP_MAX_ATTEMPTS || 5);

const randomOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const purposeRank = (purpose) => (purpose === 'complete_visit' ? 2 : 1);

async function purgeExpiredOtps() {
  await prisma.visitOtp.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
}

async function saveOtp({ requestId, purpose, otp, nurseId, userId }) {
  const otpHash = await bcrypt.hash(String(otp), 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await prisma.visitOtp.upsert({
    where: { requestId_purpose: { requestId, purpose } },
    create: { requestId, purpose, otpHash, nurseId, userId, expiresAt, attempts: 0 },
    update: { otpHash, nurseId, userId, expiresAt, attempts: 0 },
  });
  return { expiresAt: expiresAt.getTime(), otp: String(otp) };
}

async function readOtp({ requestId, purpose }) {
  const row = await prisma.visitOtp.findUnique({
    where: { requestId_purpose: { requestId, purpose } },
  });
  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) {
    await prisma.visitOtp.delete({ where: { id: row.id } });
    return null;
  }
  if (row.attempts >= MAX_OTP_ATTEMPTS) {
    await prisma.visitOtp.delete({ where: { id: row.id } });
    return null;
  }
  return row;
}

async function verifyVisitOtp({ requestId, purpose, otp, nurseId }) {
  const code = String(otp || '').trim();
  if (code.length < 4) {
    return { ok: false, reason: 'invalid', attemptsLeft: 0 };
  }

  const row = await readOtp({ requestId, purpose });
  if (!row) return { ok: false, reason: 'missing', attemptsLeft: 0 };
  if (row.nurseId !== nurseId) {
    return { ok: false, reason: 'forbidden', attemptsLeft: 0 };
  }

  const match = await bcrypt.compare(code, row.otpHash);
  if (!match) {
    const attempt = await incrementOtpAttempts({ requestId, purpose });
    return {
      ok: false,
      reason: attempt?.locked ? 'locked' : 'mismatch',
      attemptsLeft: attempt?.attemptsLeft ?? 0,
    };
  }

  await clearOtp({ requestId, purpose });
  return { ok: true };
}

async function clearOtp({ requestId, purpose }) {
  await prisma.visitOtp.deleteMany({ where: { requestId, purpose } });
}

async function incrementOtpAttempts({ requestId, purpose }) {
  const row = await prisma.visitOtp.findUnique({
    where: { requestId_purpose: { requestId, purpose } },
  });
  if (!row) return null;
  const attempts = row.attempts + 1;
  if (attempts >= MAX_OTP_ATTEMPTS) {
    await prisma.visitOtp.delete({ where: { id: row.id } });
    return { locked: true, attemptsLeft: 0 };
  }
  await prisma.visitOtp.update({
    where: { id: row.id },
    data: { attempts },
  });
  return { locked: false, attemptsLeft: MAX_OTP_ATTEMPTS - attempts };
}

/** Pending OTP metadata for patient UI — never returns the code (hash-only storage). */
async function getPendingOtpForRequest(requestId) {
  const map = await getPendingOtpsForRequests([requestId]);
  return map.get(requestId) || null;
}

/** Batch pending OTP lookup for request lists (avoids N+1 queries). */
async function getPendingOtpsForRequests(requestIds) {
  const ids = [...new Set((requestIds || []).filter(Boolean))];
  const result = new Map();
  if (ids.length === 0) return result;

  try {
    const rows = await prisma.visitOtp.findMany({
      where: {
        requestId: { in: ids },
        expiresAt: { gt: new Date() },
        attempts: { lt: MAX_OTP_ATTEMPTS },
      },
    });

    for (const row of rows) {
      const meta = {
        purpose: row.purpose,
        expiresAt: row.expiresAt.getTime(),
        active: true,
      };
      const existing = result.get(row.requestId);
      if (!existing || purposeRank(row.purpose) > purposeRank(existing.purpose)) {
        result.set(row.requestId, meta);
      }
    }
  } catch (err) {
    console.warn('getPendingOtpsForRequests failed:', err.message);
  }

  return result;
}

module.exports = {
  OTP_TTL_MS,
  MAX_OTP_ATTEMPTS,
  randomOtp,
  purgeExpiredOtps,
  saveOtp,
  readOtp,
  verifyVisitOtp,
  clearOtp,
  incrementOtpAttempts,
  getPendingOtpForRequest,
  getPendingOtpsForRequests,
};
