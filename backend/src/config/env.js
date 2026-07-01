const WEAK_JWT_MARKERS = [
  'change_me',
  'replace_this',
  'dev-change-me',
  'your-secret',
  'min-32-chars',
  'generate-a-long',
  'replace_with',
];

function validateEnv() {
  const errors = [];
  const isProd = process.env.NODE_ENV === 'production';
  const dbUrl = process.env.DATABASE_URL || '';

  if (!dbUrl) {
    errors.push('DATABASE_URL is required');
  } else if (isProd && /azure|postgres\.database\.amazonaws|neon\.tech|rds\.amazonaws/.test(dbUrl)) {
    const lower = dbUrl.toLowerCase();
    if (!lower.includes('sslmode=require') && !lower.includes('ssl=true')) {
      errors.push('DATABASE_URL must use SSL for managed PostgreSQL (add ?sslmode=require)');
    }
  }

  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  } else if (isProd) {
    if (process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production');
    }
    const lower = process.env.JWT_SECRET.toLowerCase();
    if (WEAK_JWT_MARKERS.some((m) => lower.includes(m))) {
      errors.push('JWT_SECRET looks like a placeholder — generate a strong random secret');
    }
  }

  if (isProd) {
    const origin = process.env.CLIENT_ORIGIN || '';
    if (!origin.trim()) {
      errors.push('CLIENT_ORIGIN is required in production (comma-separated HTTPS web URLs)');
    } else if (origin.includes('*')) {
      errors.push('CLIENT_ORIGIN must not contain wildcards in production');
    } else {
      const origins = origin.split(',').map((o) => o.trim()).filter(Boolean);
      const bad = origins.filter((o) => !o.startsWith('https://'));
      if (bad.length > 0) {
        errors.push(`CLIENT_ORIGIN must use HTTPS in production: ${bad.join(', ')}`);
      }
    }

    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
    if (!smtpHost || !smtpUser || !smtpPass) {
      // eslint-disable-next-line no-console
      console.warn(
        'WARNING: SMTP_HOST, SMTP_USER, and SMTP_PASS are not fully set — forgot-password email OTP will not work until configured.'
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n  - ${errors.join('\n  - ')}`);
  }
}

function getCorsOrigins() {
  const raw = process.env.CLIENT_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
  if (raw?.length) return raw;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CLIENT_ORIGIN must be set in production');
  }
  return ['http://localhost:5173', 'http://localhost:8080'];
}

module.exports = { validateEnv, getCorsOrigins };
