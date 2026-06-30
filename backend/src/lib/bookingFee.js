const prisma = require('./prisma');
const { OFFERING_INCLUDE } = require('./nurseOfferings');

/**
 * Server-side booking total from selected visit-focus lines and caregiver offerings.
 * No separate "basic visit" fee — only catalog / nurse-quoted sub-service rates.
 */
async function computeBookingFee(nurseId, serviceType, selectedCareOptionIds) {
  const nurse = await prisma.user.findFirst({
    where: { id: nurseId, role: 'nurse', available: true },
    include: OFFERING_INCLUDE,
  });
  if (!nurse) {
    const err = new Error('That caregiver is not available');
    err.status = 400;
    throw err;
  }

  const ids = Array.isArray(selectedCareOptionIds)
    ? selectedCareOptionIds.map(String).filter(Boolean)
    : [];
  if (ids.length === 0) {
    const err = new Error('Select at least one visit focus');
    err.status = 400;
    throw err;
  }

  const offeringByOptId = new Map(
    (nurse.nurseCareOfferings || []).map((row) => [row.careServiceOptionId, row.rate])
  );
  const opts = await prisma.careServiceOption.findMany({
    where: {
      id: { in: ids },
      active: true,
    },
    select: { id: true, label: true, rate: true, serviceType: true },
  });
  if (opts.length !== ids.length) {
    const err = new Error('Invalid or inactive visit-focus selection');
    err.status = 400;
    throw err;
  }

  const lineItems = [];
  let totalFee = 0;
  for (const opt of opts) {
    const rate = offeringByOptId.has(opt.id)
      ? Number(offeringByOptId.get(opt.id)) || 0
      : Number(opt.rate) || 0;
    lineItems.push({ careServiceOptionId: opt.id, label: opt.label, rate });
    totalFee += rate;
  }

  return { totalFee, lineItems, nurseId: nurse.id };
}

module.exports = { computeBookingFee };
