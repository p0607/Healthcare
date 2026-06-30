const bcrypt = require('bcryptjs');
const prisma = require('./prisma');

const OTP_TTL_MS = Number(process.env.PASSWORD_RESET_OTP_TTL_MS || 10 * 60 * 1000);
const MAX_OTP_ATTEMPTS = Number(process.env.PASSWORD_RESET_OTP_MAX_ATTEMPTS || 5);

const randomOtp = () => String(Math.floor(100000 + Math.random() * 900000));

async function purgeExpiredPasswordResetOtps() {
  await prisma.passwordResetOtp.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
}

async function createPasswordResetOtp(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const otp = randomOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await purgeExpiredPasswordResetOtps();
  await prisma.passwordResetOtp.upsert({
    where: { email: normalized },
    create: { email: normalized, otpHash, expiresAt, attempts: 0 },
    update: { otpHash, expiresAt, attempts: 0 },
  });

  return { otp, expiresAt };
}

async function verifyPasswordResetOtp(email, otp) {
  const normalized = String(email || '').trim().toLowerCase();
  const code = String(otp || '').trim();
  if (!normalized || code.length < 4) {
    return { ok: false, reason: 'invalid' };
  }

  const row = await prisma.passwordResetOtp.findUnique({ where: { email: normalized } });
  if (!row) return { ok: false, reason: 'missing' };
  if (row.expiresAt.getTime() <= Date.now()) {
    await prisma.passwordResetOtp.delete({ where: { id: row.id } });
    return { ok: false, reason: 'expired' };
  }
  if (row.attempts >= MAX_OTP_ATTEMPTS) {
    await prisma.passwordResetOtp.delete({ where: { id: row.id } });
    return { ok: false, reason: 'locked' };
  }

  const match = await bcrypt.compare(code, row.otpHash);
  if (!match) {
    const attempts = row.attempts + 1;
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.passwordResetOtp.delete({ where: { id: row.id } });
    } else {
      await prisma.passwordResetOtp.update({
        where: { id: row.id },
        data: { attempts },
      });
    }
    return { ok: false, reason: 'mismatch' };
  }

  await prisma.passwordResetOtp.delete({ where: { id: row.id } });
  return { ok: true };
}

module.exports = {
  createPasswordResetOtp,
  verifyPasswordResetOtp,
  OTP_TTL_MS,
};
