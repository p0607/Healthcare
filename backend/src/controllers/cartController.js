const prisma = require('../lib/prisma');

function emptyCartPayload() {
  return { items: [], caregiversByType: {}, checkoutMeta: null };
}

function normalizePayload(raw) {
  if (!raw || typeof raw !== 'object') return emptyCartPayload();
  return {
    items: Array.isArray(raw.items) ? raw.items : [],
    caregiversByType:
      raw.caregiversByType && typeof raw.caregiversByType === 'object' ? raw.caregiversByType : {},
    checkoutMeta: raw.checkoutMeta ?? null,
  };
}

exports.getMyCart = async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Only patients have a booking cart' });
    }
    const row = await prisma.patientBookingCart.findUnique({
      where: { userId: req.user.id },
    });
    if (!row) {
      return res.json({ cart: emptyCartPayload(), updatedAt: null });
    }
    const payload = normalizePayload(row.payload);
    return res.json({ cart: payload, updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Could not load cart' });
  }
};

exports.saveMyCart = async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Only patients have a booking cart' });
    }
    const payload = normalizePayload(req.body);
    const row = await prisma.patientBookingCart.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, payload },
      update: { payload },
    });
    return res.json({
      cart: normalizePayload(row.payload),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Could not save cart' });
  }
};
