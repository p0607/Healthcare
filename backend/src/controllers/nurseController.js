const prisma = require('../lib/prisma');
const { toSafeUser, toRequest } = require('../lib/format');
const { bbox, haversineKm } = require('../lib/geo');
const {
  OFFERING_INCLUDE,
  replaceNurseCareOfferings,
  loadUserWithOfferings,
} = require('../lib/nurseOfferings');
const { isCaregiverCategory } = require('../lib/caregiverCategories');
const { rejectCaregiverLocationUpdate, normalizeCaregiverCoords } = require('../lib/caregiverLocation');
const { ADMIN_TIERS, isSuperAdminUser } = require('../lib/adminPermissions');
const { audit } = require('../lib/auditLog');

// Public: list nurses (optionally near a point)
exports.listNurses = async (req, res) => {
  try {
  const { lng, lat, maxKm } = req.query;

  if (lng && lat) {
    const flng = parseFloat(lng);
    const flat = parseFloat(lat);
    const km = parseFloat(maxKm) || 25;

    const candidates = await prisma.user.findMany({
      where: {
        role: 'nurse',
        available: true,
        accountActive: true,
      },
      include: OFFERING_INCLUDE,
      take: 200,
    });

    const nurses = candidates
      .map((n) => ({ n, d: haversineKm(flng, flat, n.lng, n.lat) }))
      .filter((x) => x.d <= km)
      .sort((a, b) => a.d - b.d)
      .slice(0, 50)
      .map((x) => ({ ...toSafeUser(x.n), distanceKm: Number(x.d.toFixed(2)) }));

    return res.json({ nurses });
  }

  const nurses = await prisma.user.findMany({
    where: { role: 'nurse', available: true, accountActive: true },
    include: OFFERING_INCLUDE,
    take: 50,
  });
  return res.json({ nurses: nurses.map(toSafeUser) });
  } catch (err) {
    console.error('listNurses failed:', err);
    return res.status(500).json({ message: err.message || 'Could not load nurses' });
  }
};

const VISIT_SLOT_MS = 90 * 60 * 1000;

/** Public: caregivers available near a point at a scheduled time (excludes slot conflicts). */
exports.listAvailableAt = async (req, res) => {
  try {
    const { lng, lat, maxKm, scheduledAt } = req.query;
    if (!lng || !lat || !scheduledAt) {
      return res.status(400).json({ message: 'lng, lat, and scheduledAt are required' });
    }

    const flng = parseFloat(lng);
    const flat = parseFloat(lat);
    const km = parseFloat(maxKm) || 25;
    const slot = new Date(scheduledAt);
    if (Number.isNaN(slot.getTime())) {
      return res.status(400).json({ message: 'Invalid scheduledAt' });
    }

    const windowStart = new Date(slot.getTime() - VISIT_SLOT_MS);
    const windowEnd = new Date(slot.getTime() + VISIT_SLOT_MS);

    const busyRows = await prisma.serviceRequest.findMany({
      where: {
        nurseId: { not: null },
        status: { in: ['pending', 'accepted', 'on_the_way', 'in_progress'] },
        OR: [
          { scheduledAt: { gte: windowStart, lte: windowEnd } },
          { scheduledAt: null, status: { in: ['on_the_way', 'in_progress'] } },
        ],
      },
      select: { nurseId: true },
    });
    const busyIds = [...new Set(busyRows.map((r) => r.nurseId).filter(Boolean))];

    const where = {
      role: 'nurse',
      available: true,
      accountActive: true,
      ...(busyIds.length > 0 ? { id: { notIn: busyIds } } : {}),
    };

    const candidates = await prisma.user.findMany({
      where,
      include: OFFERING_INCLUDE,
      take: 200,
    });

    const nurses = candidates
      .map((n) => ({ n, d: haversineKm(flng, flat, n.lng, n.lat) }))
      .filter((x) => x.d <= km)
      .sort((a, b) => a.d - b.d)
      .slice(0, 50)
      .map((x) => ({ ...toSafeUser(x.n), distanceKm: Number(x.d.toFixed(2)) }));

    return res.json({ nurses, scheduledAt: slot.toISOString() });
  } catch (err) {
    console.error('listAvailableAt failed:', err);
    return res.status(500).json({ message: err.message || 'Could not load availability' });
  }
};

const MAX_PHOTO_CHARS = 600_000;

function normalizeCertifications(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => {
      if (typeof c === 'string') {
        const title = c.trim();
        return title ? { title, issuer: '', year: '' } : null;
      }
      if (c && typeof c === 'object') {
        const title = String(c.title || '').trim();
        if (!title) return null;
        return {
          title,
          issuer: String(c.issuer || '').trim(),
          year: String(c.year || '').trim(),
        };
      }
      return null;
    })
    .filter(Boolean);
}

/** Nurse: profile photo, about, certifications, notification prefs */
exports.updateSettings = async (req, res) => {
  try {
    const { profilePhotoUrl, about, certifications, notifyNewJobs, notifySms } = req.body;
    const data = {};

    if (profilePhotoUrl !== undefined) {
      const url = String(profilePhotoUrl || '').trim();
      if (url && url.length > MAX_PHOTO_CHARS) {
        return res.status(400).json({ message: 'Profile photo is too large. Use a smaller image.' });
      }
      data.profilePhotoUrl = url || null;
    }
    if (about !== undefined) data.about = String(about || '').trim() || null;
    if (certifications !== undefined) {
      data.certifications = normalizeCertifications(certifications);
    }
    if (notifyNewJobs !== undefined) data.notifyNewJobs = Boolean(notifyNewJobs);
    if (notifySms !== undefined) data.notifySms = Boolean(notifySms);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No settings to update' });
    }

    await prisma.user.update({ where: { id: req.user.id }, data });
    const full = await loadUserWithOfferings(req.user.id);
    return res.json({ user: toSafeUser(full) });
  } catch (err) {
    console.error('updateSettings failed:', err);
    return res.status(500).json({ message: err.message || 'Settings update failed' });
  }
};

function validateCaregiverCoords(existing, lng, lat) {
  return normalizeCaregiverCoords(existing?.lng, existing?.lat, lng, lat);
}

/** Nurse: update live device location (coordinates + optional address). */
exports.updateMyLocation = async (req, res) => {
  try {
    const loc = req.body.location || req.body;
    const coordinates = loc?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ message: 'location.coordinates [lng, lat] required' });
    }
    let lng = Number(coordinates[0]);
    let lat = Number(coordinates[1]);

    const existing = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { lng: true, lat: true },
    });
    const check = validateCaregiverCoords(existing, lng, lat);
    if (check.reject) {
      return res.status(400).json({ message: check.message });
    }
    lng = check.lng;
    lat = check.lat;

    const data = { lng, lat };
    if (loc.address !== undefined) {
      const trimmed = String(loc.address || '').trim();
      data.address = trimmed || null;
    }

    await prisma.user.update({ where: { id: req.user.id }, data });
    const full = await loadUserWithOfferings(req.user.id);
    return res.json({ user: toSafeUser(full) });
  } catch (err) {
    console.error('updateMyLocation failed:', err);
    return res.status(500).json({ message: err.message || 'Location update failed' });
  }
};

// Nurse: update my availability / location
exports.updateMe = async (req, res) => {
  try {
  const { available, location, specialization, name, phone, licenseNumber, visitRate, careOfferings } =
    req.body;
  const data = {};
  if (typeof available === 'boolean') data.available = available;
  if (typeof name === 'string' && name.trim()) data.name = name.trim();
  if (phone !== undefined) data.phone = String(phone || '').trim();
  if (location?.coordinates?.length === 2) {
    const lng = Number(location.coordinates[0]);
    const lat = Number(location.coordinates[1]);
    const existing = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { lng: true, lat: true },
    });
    const check = validateCaregiverCoords(existing, lng, lat);
    if (check.reject) {
      return res.status(400).json({ message: check.message });
    }
    data.lng = check.lng;
    data.lat = check.lat;
    if (location.address !== undefined) data.address = location.address;
  }
  if (location?.address !== undefined && !location?.coordinates?.length) {
    data.address = location.address;
  }
  if (specialization) data.specialization = specialization;
  if (licenseNumber !== undefined) data.licenseNumber = String(licenseNumber || '').trim();
  if (visitRate !== undefined && req.user.role === 'nurse') {
    const vr = Math.max(0, Math.round(Number(visitRate)) || 0);
    data.visitRate = vr;
  }

  if (careOfferings !== undefined && req.user.role === 'nurse') {
    if (!Array.isArray(careOfferings) || careOfferings.length === 0) {
      return res.status(400).json({ message: 'Select at least one sub-service with a rate' });
    }
    try {
      await prisma.$transaction(async (tx) => {
        if (Object.keys(data).length > 0) {
          await tx.user.update({ where: { id: req.user.id }, data });
        }
        await replaceNurseCareOfferings(tx, req.user.id, careOfferings);
      });
    } catch (err) {
      if (err.code === 'INVALID_OFFERINGS') {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }
    const full = await loadUserWithOfferings(req.user.id);
    return res.json({ user: toSafeUser(full) });
  }

  const updated = await prisma.user.update({ where: { id: req.user.id }, data });
  const full = await loadUserWithOfferings(req.user.id);
  const merged = { ...updated, nurseCareOfferings: full?.nurseCareOfferings ?? [] };
  return res.json({ user: toSafeUser(merged) });
  } catch (err) {
    console.error('updateMe failed:', err);
    return res.status(500).json({
      message:
        err.message ||
        'Profile update failed. Restart the API server if sub-services were recently added.',
    });
  }
};

// Admin: list users (optionally filter by role)
exports.adminListUsers = async (req, res) => {
  const { role } = req.query;
  const where = role ? { role } : {};
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: OFFERING_INCLUDE,
  });
  return res.json({ users: users.map(toSafeUser) });
};

const ALLOWED_ROLES = new Set(['user', 'nurse', 'admin']);

// Admin: update user profile (role, caregiver category, contact, specialization)
exports.adminUpdateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { caregiverCategory, name, phone, specialization, licenseNumber, available, role } =
      req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'User not found' });

    const data = {};
    if (name !== undefined) {
      const t = String(name).trim();
      if (!t) return res.status(400).json({ message: 'Name cannot be empty' });
      data.name = t;
    }
    if (phone !== undefined) data.phone = String(phone || '').trim() || null;

    if (role !== undefined) {
      const nextRole = String(role);
      if (!ALLOWED_ROLES.has(nextRole)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      if (nextRole === 'admin' && existing.role !== 'admin') {
        if (!isSuperAdminUser(req.user)) {
          return res.status(403).json({ message: 'Only super admins can assign the admin role' });
        }
        data.role = 'admin';
        data.adminTier = ADMIN_TIERS.admin;
        data.accountKinds = [];
      } else if (nextRole !== 'admin') {
        if (existing.role === 'admin' && !isSuperAdminUser(req.user)) {
          return res.status(403).json({ message: 'Only super admins can change an admin account role' });
        }
        if (existing.role === 'admin' && nextRole !== 'admin') {
          const superCount = await prisma.user.count({
            where: { role: 'admin', adminTier: ADMIN_TIERS.super_admin },
          });
          if (existing.adminTier === ADMIN_TIERS.super_admin && superCount <= 1) {
            return res.status(400).json({ message: 'Cannot demote the last super admin account' });
          }
        }
        data.role = nextRole;
        if (nextRole !== 'admin') {
          data.adminTier = null;
        }
      }
      if (nextRole === 'user') {
        data.caregiverCategory = null;
      }
    }

    const effectiveRole = data.role ?? existing.role;

    if (effectiveRole === 'nurse') {
      if (specialization !== undefined) {
        data.specialization = String(specialization || '').trim() || null;
      }
      if (licenseNumber !== undefined) {
        data.licenseNumber = String(licenseNumber || '').trim() || null;
      }
      if (available !== undefined) data.available = Boolean(available);
      if (caregiverCategory !== undefined) {
        if (!isCaregiverCategory(caregiverCategory)) {
          return res.status(400).json({ message: 'Invalid caregiver category' });
        }
        data.caregiverCategory = String(caregiverCategory);
      } else if (data.role === 'nurse' && !existing.caregiverCategory) {
        return res.status(400).json({
          message: 'Select a caregiver category (Nurse, Doctor, Physio, or Emergency)',
        });
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    await prisma.user.update({ where: { id }, data });
    const full =
      effectiveRole === 'nurse' ? await loadUserWithOfferings(id) : await prisma.user.findUnique({ where: { id } });
    audit(req, {
      action: 'user.admin_updated',
      entityType: 'User',
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });
    return res.json({ user: toSafeUser(full) });
  } catch (err) {
    console.error('adminUpdateUser failed:', err);
    return res.status(500).json({ message: err.message || 'Update failed' });
  }
};

function maskAccountNumber(num) {
  const digits = String(num || '').replace(/\s/g, '');
  if (digits.length <= 4) return digits ? `•••• ${digits}` : '';
  return `•••• •••• ${digits.slice(-4)}`;
}

function payoutPayload(user) {
  return {
    method: user.payoutMethod || null,
    accountHolder: user.payoutAccountHolder || '',
    bankName: user.payoutBankName || '',
    accountNumberMasked: maskAccountNumber(user.payoutAccountNumber),
    ifsc: user.payoutIfsc || '',
    upiId: user.payoutUpiId || '',
    configured: Boolean(
      (user.payoutMethod === 'bank' &&
        user.payoutAccountHolder &&
        user.payoutBankName &&
        user.payoutAccountNumber &&
        user.payoutIfsc) ||
        (user.payoutMethod === 'upi' && user.payoutUpiId)
    ),
  };
}

/** Caregiver: earnings summary + paid job history + payout destination */
exports.myPayments = async (req, res) => {
  try {
    const nurseId = req.user.id;
    const paidJobs = await prisma.serviceRequest.findMany({
      where: { nurseId, paidAt: { not: null } },
      orderBy: { paidAt: 'desc' },
      include: { user: true },
      take: 100,
    });

    let totalReceived = 0;
    let pendingSettlement = 0;
    let completedCount = 0;

    const transactions = paidJobs.map((r) => {
      const amount = Number(r.feeAmount) || 0;
      const settled = r.status === 'completed';
      if (settled) {
        totalReceived += amount;
        completedCount += 1;
      } else if (r.status !== 'cancelled') {
        pendingSettlement += amount;
      }
      return {
        ...toRequest(r),
        paymentStatus: settled ? 'paid_out' : r.status === 'cancelled' ? 'refunded' : 'pending_settlement',
      };
    });

    const me = await prisma.user.findUnique({ where: { id: nurseId } });

    return res.json({
      summary: {
        totalReceived,
        pendingSettlement,
        paymentCount: paidJobs.length,
        completedCount,
      },
      transactions,
      payout: payoutPayload(me),
    });
  } catch (err) {
    console.error('myPayments failed:', err);
    return res.status(500).json({ message: err.message || 'Could not load payments' });
  }
};

/** Caregiver: bank account or UPI where payouts are received */
exports.updatePayout = async (req, res) => {
  try {
    const {
      payoutMethod,
      payoutAccountHolder,
      payoutBankName,
      payoutAccountNumber,
      payoutIfsc,
      payoutUpiId,
    } = req.body;

    const method = String(payoutMethod || '').toLowerCase();
    if (!['bank', 'upi'].includes(method)) {
      return res.status(400).json({ message: 'Payout method must be bank or upi' });
    }

    const data = { payoutMethod: method };

    if (method === 'bank') {
      const holder = String(payoutAccountHolder || '').trim();
      const bank = String(payoutBankName || '').trim();
      const acct = String(payoutAccountNumber || '').replace(/\s/g, '');
      const ifsc = String(payoutIfsc || '').trim().toUpperCase();
      if (!holder || !bank || acct.length < 8 || ifsc.length < 8) {
        return res.status(400).json({
          message: 'Enter account holder name, bank name, account number, and IFSC',
        });
      }
      data.payoutAccountHolder = holder;
      data.payoutBankName = bank;
      data.payoutAccountNumber = acct;
      data.payoutIfsc = ifsc;
      data.payoutUpiId = null;
    } else {
      const upi = String(payoutUpiId || '').trim().toLowerCase();
      if (!/^[\w.-]+@[\w.-]+$/.test(upi)) {
        return res.status(400).json({ message: 'Enter a valid UPI ID (e.g. name@oksbi)' });
      }
      data.payoutUpiId = upi;
      data.payoutAccountHolder = String(payoutAccountHolder || '').trim() || req.user.name;
      data.payoutBankName = null;
      data.payoutAccountNumber = null;
      data.payoutIfsc = null;
    }

    const updated = await prisma.user.update({ where: { id: req.user.id }, data });
    return res.json({ payout: payoutPayload(updated), message: 'Payout details saved' });
  } catch (err) {
    console.error('updatePayout failed:', err);
    return res.status(500).json({ message: err.message || 'Could not save payout details' });
  }
};
