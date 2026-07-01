const prisma = require('./prisma');

function requestMeta(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  const ip =
    req?.ip ||
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) ||
    null;
  const userAgent = req?.headers?.['user-agent'];
  return {
    ipAddress: ip,
    userAgent: userAgent ? String(userAgent).slice(0, 512) : null,
  };
}

/**
 * Persist an audit row. Never include passwords, OTP codes, or payment secrets in metadata.
 */
async function recordAudit(req, { action, entityType, entityId, metadata = {} }) {
  const actor = req?.user;
  const { ipAddress, userAgent } = requestMeta(req);
  await prisma.auditLog.create({
    data: {
      actorId: actor?.id ?? null,
      actorRole: actor?.role ?? 'system',
      actorEmail: actor?.email ?? null,
      action: String(action),
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      metadata,
      ipAddress,
      userAgent,
    },
  });
}

/** Fire-and-forget wrapper — audit failures must not break user flows. */
function audit(req, payload) {
  recordAudit(req, payload).catch((err) => {
    console.error('auditLog failed:', err.message);
  });
}

module.exports = { recordAudit, audit };
