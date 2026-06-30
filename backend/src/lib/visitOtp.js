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
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await prisma.visitOtp.upsert({
    where: { requestId_purpose: { requestId, purpose } },
    create: { requestId, purpose, otp, nurseId, userId, expiresAt, attempts: 0 },
    update: { otp, nurseId, userId, expiresAt, attempts: 0 },
  });
  return { expiresAt: expiresAt.getTime() };
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

async function getPendingOtpForRequest(requestId) {
  try {
    const rows = await prisma.visitOtp.findMany({
      where: {
        requestId,
        expiresAt: { gt: new Date() },
        attempts: { lt: MAX_OTP_ATTEMPTS },
      },
    });
    if (rows.length === 0) return null;
    rows.sort((a, b) => purposeRank(b.purpose) - purposeRank(a.purpose));
    const current = rows[0];
    return {
      purpose: current.purpose,
      otp: current.otp,
      expiresAt: current.expiresAt.getTime(),
    };
  } catch (err) {
    console.warn('getPendingOtpForRequest failed:', err.message);
    return null;
  }
}

module.exports = {
  OTP_TTL_MS,
  MAX_OTP_ATTEMPTS,
  randomOtp,
  purgeExpiredOtps,
  saveOtp,
  readOtp,
  clearOtp,
  incrementOtpAttempts,
  getPendingOtpForRequest,
};
