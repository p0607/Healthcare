const prisma = require('./prisma');

const OFFERING_INCLUDE = {
  nurseCareOfferings: {
    include: {
      careServiceOption: {
        select: { id: true, label: true, rate: true, serviceType: true, active: true },
      },
    },
  },
};

/**
 * Replace all caregiver sub-service rows. `raw` is [{ careServiceOptionId, rate }, ...].
 * Unknown option ids are skipped. Empty array removes all offerings.
 */
async function replaceNurseCareOfferings(tx, userId, raw) {
  if (!Array.isArray(raw)) {
    return { saved: 0, requested: 0 };
  }
  const cleaned = [];
  for (const row of raw) {
    const id = String(row.careServiceOptionId || row.id || '').trim();
    if (!id) continue;
    const rate = Math.max(0, Math.round(Number(row.rate)) || 0);
    cleaned.push({ careServiceOptionId: id, rate });
  }
  await tx.nurseCareOffering.deleteMany({ where: { userId } });
  if (cleaned.length === 0) {
    return { saved: 0, requested: 0 };
  }
  const optIds = [...new Set(cleaned.map((c) => c.careServiceOptionId))];
  const opts = await tx.careServiceOption.findMany({
    where: { id: { in: optIds }, active: true },
    select: { id: true },
  });
  const valid = new Set(opts.map((o) => o.id));
  const rows = cleaned.filter((c) => valid.has(c.careServiceOptionId));
  if (rows.length === 0) {
    const err = new Error(
      'No valid sub-services found — options may be inactive or removed from the catalog'
    );
    err.code = 'INVALID_OFFERINGS';
    throw err;
  }
  await tx.nurseCareOffering.createMany({
    data: rows.map((r) => ({
      userId,
      careServiceOptionId: r.careServiceOptionId,
      rate: r.rate,
    })),
  });
  return { saved: rows.length, requested: cleaned.length };
}

async function loadUserWithOfferings(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: OFFERING_INCLUDE,
  });
}

module.exports = {
  OFFERING_INCLUDE,
  replaceNurseCareOfferings,
  loadUserWithOfferings,
};
