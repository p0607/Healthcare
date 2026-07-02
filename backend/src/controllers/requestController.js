const prisma = require('../lib/prisma');
const { toRequest } = require('../lib/format');
const { computeBookingFee } = require('../lib/bookingFee');
const {
  isRazorpayConfigured,
  verifyPaymentSignature,
  assertPaymentCaptured,
} = require('../lib/razorpay');
const { assertPaymentUnused } = require('./paymentController');
const {
  OTP_TTL_MS,
  randomOtp,
  saveOtp,
  verifyVisitOtp: verifyVisitOtpCode,
  getPendingOtpsForRequests,
} = require('../lib/visitOtp');
const { audit } = require('../lib/auditLog');
const { REQUEST_INCLUDE } = require('../lib/authUserSelect');

const getIO = (req) => req.app.get('io');

async function resolveBookingPayment(req, totalFee) {
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    paymentConfirmed,
  } = req.body;

  if (isRazorpayConfigured()) {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      const err = new Error('Complete Razorpay payment before booking');
      err.status = 402;
      throw err;
    }

    if (
      !verifyPaymentSignature({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
      })
    ) {
      const err = new Error('Invalid payment signature');
      err.status = 400;
      throw err;
    }

    await assertPaymentUnused(razorpayPaymentId);
    await assertPaymentCaptured(razorpayPaymentId, {
      orderId: razorpayOrderId,
      amountPaise: totalFee * 100,
    });

    return {
      razorpayOrderId,
      razorpayPaymentId,
    };
  }

  if (process.env.NODE_ENV === 'production') {
    const err = new Error('Payment gateway is not configured');
    err.status = 503;
    throw err;
  }

  if (!paymentConfirmed) {
    const err = new Error('Complete payment before booking');
    err.status = 402;
    throw err;
  }

  return {
    razorpayOrderId: null,
    razorpayPaymentId: null,
  };
}

// USER: server-calculated fee for checkout (visit-focus lines only, no basic visit fee)
exports.quoteFee = async (req, res) => {
  try {
    const { nurseId, serviceType, selectedCareOptionIds } = req.body;
    if (!nurseId) {
      return res.status(400).json({ message: 'nurseId is required' });
    }
    if (!Array.isArray(selectedCareOptionIds) || selectedCareOptionIds.length === 0) {
      return res.status(400).json({ message: 'selectedCareOptionIds is required' });
    }
    const { totalFee, lineItems } = await computeBookingFee(
      nurseId,
      serviceType,
      selectedCareOptionIds
    );
    return res.json({ totalFee, lineItems });
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }
};

// USER: create a new request after payment (Razorpay or dev demo)
exports.createRequest = async (req, res) => {
  try {
    const {
      serviceType,
      notes,
      location,
      nurseId,
      feeAmount,
      selectedCareOptionIds,
      scheduledAt,
    } = req.body;
    if (!serviceType || !location?.coordinates) {
      return res
        .status(400)
        .json({ message: 'serviceType and location.coordinates are required' });
    }
    if (!nurseId) {
      return res.status(400).json({ message: 'Select a caregiver before payment' });
    }
    const [lng, lat] = location.coordinates;
    const io = getIO(req);

    let totalFee;
    try {
      ({ totalFee } = await computeBookingFee(nurseId, serviceType, selectedCareOptionIds));
    } catch (err) {
      return res.status(err.status || 400).json({ message: err.message });
    }
    if (feeAmount != null && Number(feeAmount) !== totalFee) {
      return res.status(400).json({ message: 'Fee does not match quoted price' });
    }

    let paymentMeta;
    try {
      paymentMeta = await resolveBookingPayment(req, totalFee);
    } catch (err) {
      return res.status(err.status || 402).json({ message: err.message });
    }

    const nurse = await prisma.user.findFirst({
      where: { id: nurseId, role: 'nurse' },
    });
    if (!nurse) {
      return res.status(400).json({ message: 'That caregiver is not available' });
    }

    let parsedSchedule = null;
    if (scheduledAt) {
      parsedSchedule = new Date(scheduledAt);
      if (Number.isNaN(parsedSchedule.getTime())) {
        return res.status(400).json({ message: 'Invalid scheduledAt' });
      }
    }

    const created = await prisma.serviceRequest.create({
      data: {
        userId: req.user.id,
        nurseId: nurse.id,
        serviceType,
        notes,
        scheduledAt: parsedSchedule,
        lng,
        lat,
        address: location.address,
        status: 'pending',
        feeAmount: totalFee,
        paidAt: new Date(),
        razorpayOrderId: paymentMeta.razorpayOrderId,
        razorpayPaymentId: paymentMeta.razorpayPaymentId,
      },
      include: REQUEST_INCLUDE,
    });

    const request = toRequest(created);

    if (io) {
      io.to(`user:${req.user.id}`).emit('request:updated', request);
      io.to(`user:${nurse.id}`).emit('request:new', request);
      io.to('admins').emit('activity:new', { type: 'request_booked_direct', request });
    }

    audit(req, {
      action: 'request.created',
      entityType: 'ServiceRequest',
      entityId: created.id,
      metadata: {
        serviceType,
        nurseId: nurse.id,
        feeAmount: totalFee,
        paid: true,
        razorpayPaymentId: paymentMeta.razorpayPaymentId,
      },
    });

    return res.status(201).json({ request });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// USER: list my requests
exports.myRequests = async (req, res) => {
  try {
    const rows = await prisma.serviceRequest.findMany({
      where: { userId: req.user.id },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    const otpByRequest = await getPendingOtpsForRequests(rows.map((row) => row.id));
    const requests = rows.map((row) => ({
      ...toRequest(row),
      pendingOtp: otpByRequest.get(row.id) || null,
    }));
    return res.json({ requests });
  } catch (err) {
    console.error('myRequests failed:', err);
    const unavailable = err.code === 'P1001' || /Can't reach database server/i.test(err.message || '');
    return res.status(unavailable ? 503 : 500).json({
      message: unavailable
        ? 'Database is unavailable. Ensure PostgreSQL is running on port 5432, then restart the API.'
        : err.message || 'Could not load requests',
    });
  }
};

// USER: cancel
exports.cancelRequest = async (req, res) => {
  const existing = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: 'Request not found' });
  if (existing.userId !== req.user.id) {
    return res.status(403).json({ message: 'Not allowed' });
  }
  if (['completed', 'cancelled'].includes(existing.status)) {
    return res.status(400).json({ message: 'Cannot cancel a finished request' });
  }
  const updated = await prisma.serviceRequest.update({
    where: { id: req.params.id },
    data: { status: 'cancelled', cancelledAt: new Date() },
    include: REQUEST_INCLUDE,
  });
  const request = toRequest(updated);

  const io = getIO(req);
  if (io) {
    io.to(`request:${request._id}`).emit('request:updated', request);
    io.to('admins').emit('activity:new', { type: 'request_cancelled', request });
  }
  audit(req, {
    action: 'request.cancelled',
    entityType: 'ServiceRequest',
    entityId: existing.id,
    metadata: { previousStatus: existing.status },
  });
  return res.json({ request });
};

// USER: rate a completed request
exports.rateRequest = async (req, res) => {
  const { rating, feedback } = req.body;
  const existing = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: 'Request not found' });
  if (existing.userId !== req.user.id) {
    return res.status(403).json({ message: 'Not allowed' });
  }
  if (existing.status !== 'completed') {
    return res.status(400).json({ message: 'Only completed requests can be rated' });
  }
  const updated = await prisma.serviceRequest.update({
    where: { id: req.params.id },
    data: { rating, feedback },
    include: REQUEST_INCLUDE,
  });
  return res.json({ request: toRequest(updated) });
};

// NURSE: list pending (unassigned) requests
exports.pendingForNurses = async (req, res) => {
  const rows = await prisma.serviceRequest.findMany({
    where: {
      status: 'pending',
      OR: [{ nurseId: null }, { nurseId: req.user.id }],
    },
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ requests: rows.map(toRequest) });
};

// NURSE: requests assigned to me
exports.assignedToMe = async (req, res) => {
  const rows = await prisma.serviceRequest.findMany({
    where: { nurseId: req.user.id },
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ requests: rows.map(toRequest) });
};

// NURSE: accept a pending request and immediately start travel (race-safe via conditional update)
exports.acceptRequest = async (req, res) => {
  const result = await prisma.serviceRequest.updateMany({
    where: {
      id: req.params.id,
      status: 'pending',
      OR: [{ nurseId: null }, { nurseId: req.user.id }],
    },
    data: {
      status: 'on_the_way',
      nurseId: req.user.id,
      acceptedAt: new Date(),
    },
  });
  if (result.count === 0) {
    const existing = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (existing.status !== 'pending') {
      return res.status(400).json({ message: 'Request is no longer available' });
    }
    if (existing.nurseId && existing.nurseId !== req.user.id) {
      return res.status(403).json({ message: 'This request is assigned to another caregiver' });
    }
    return res.status(400).json({ message: 'Request is no longer available' });
  }
  const updated = await prisma.serviceRequest.findUnique({
    where: { id: req.params.id },
    include: REQUEST_INCLUDE,
  });
  const request = toRequest(updated);

  const io = getIO(req);
  if (io) {
    io.to(`user:${request.user._id}`).emit('request:updated', request);
    io.to('nurses').emit('request:taken', { id: request._id });
    io.to('admins').emit('activity:new', { type: 'request_on_the_way', request });
  }
  audit(req, {
    action: 'request.accepted',
    entityType: 'ServiceRequest',
    entityId: req.params.id,
    metadata: { status: 'on_the_way' },
  });
  return res.json({ request });
};

// NURSE: update status
exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['on_the_way'];
  if (!allowed.includes(status)) {
    return res.status(400).json({
      message:
        'Direct status update supports only on_the_way. Use OTP endpoints for start_visit and complete_visit.',
    });
  }

  const existing = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: 'Request not found' });
  if (existing.nurseId !== req.user.id) {
    return res.status(403).json({ message: 'Not your request' });
  }

  const updated = await prisma.serviceRequest.update({
    where: { id: req.params.id },
    data: {
      status,
      completedAt: status === 'completed' ? new Date() : existing.completedAt,
    },
    include: REQUEST_INCLUDE,
  });
  const request = toRequest(updated);

  const io = getIO(req);
  if (io) {
    io.to(`user:${request.user._id}`).emit('request:updated', request);
    io.to('admins').emit('activity:new', { type: `request_${status}`, request });
  }
  return res.json({ request });
};

const OTP_PURPOSES = {
  start_visit: {
    nextStatus: 'in_progress',
    allowedFrom: ['accepted', 'on_the_way'],
    event: 'otp:start',
  },
  complete_visit: {
    nextStatus: 'completed',
    allowedFrom: ['in_progress'],
    event: 'otp:complete',
  },
};

const purposeText = (purpose) => (purpose === 'start_visit' ? 'start visit' : 'complete visit');

const loadOwnedRequest = async (req) => {
  const existing = await prisma.serviceRequest.findUnique({
    where: { id: req.params.id },
    include: REQUEST_INCLUDE,
  });
  if (!existing) return { error: { status: 404, message: 'Request not found' } };
  if (existing.nurseId !== req.user.id) return { error: { status: 403, message: 'Not your request' } };
  return { existing };
};

// NURSE: send OTP for start/complete handshake
exports.sendVisitOtp = async (req, res) => {
  const { purpose } = req.body || {};
  const meta = OTP_PURPOSES[purpose];
  if (!meta) {
    return res.status(400).json({ message: 'purpose must be start_visit or complete_visit' });
  }

  const { existing, error } = await loadOwnedRequest(req);
  if (error) return res.status(error.status).json({ message: error.message });

  if (!meta.allowedFrom.includes(existing.status)) {
    return res.status(400).json({
      message: `Cannot ${purposeText(purpose)} when request is ${existing.status}`,
    });
  }

  if (!existing.user?.phone) {
    return res.status(400).json({ message: 'User phone number missing for OTP delivery' });
  }

  const otp = randomOtp();
  const { expiresAt, otp: issuedOtp } = await saveOtp({
    requestId: existing.id,
    purpose,
    otp,
    nurseId: req.user.id,
    userId: existing.user.id,
  });

  const io = getIO(req);
  if (io) {
    io.to(`user:${existing.user.id}`).emit('request:otp-generated', {
      requestId: existing.id,
      purpose,
      message: `OTP generated for ${purposeText(purpose)}.`,
      otpPreview: issuedOtp,
    });
    io.to(`user:${existing.user.id}`).emit('request:otp-sync', {
      requestId: existing.id,
      pendingOtp: {
        purpose,
        otp: issuedOtp,
        expiresAt,
      },
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `[OTP] request=${existing.id} purpose=${purpose} phone=${existing.user.phone} otp=${issuedOtp}`
    );
  }

  audit(req, {
    action: 'visit_otp.sent',
    entityType: 'ServiceRequest',
    entityId: existing.id,
    metadata: { purpose, patientId: existing.user.id },
  });

  return res.json({
    message: `OTP sent to user phone for ${purposeText(purpose)}`,
    expiresInSec: Math.floor(OTP_TTL_MS / 1000),
  });
};

// NURSE: verify OTP and transition status
exports.verifyVisitOtp = async (req, res) => {
  const { purpose, otp } = req.body || {};
  const meta = OTP_PURPOSES[purpose];
  if (!meta) {
    return res.status(400).json({ message: 'purpose must be start_visit or complete_visit' });
  }
  if (!otp || String(otp).trim().length < 4) {
    return res.status(400).json({ message: 'Valid OTP is required' });
  }

  const { existing, error } = await loadOwnedRequest(req);
  if (error) return res.status(error.status).json({ message: error.message });

  const verified = await verifyVisitOtpCode({
    requestId: existing.id,
    purpose,
    otp,
    nurseId: req.user.id,
  });
  if (!verified.ok) {
    if (verified.reason === 'forbidden') {
      return res.status(403).json({ message: 'OTP was issued for another nurse session' });
    }
    if (verified.reason === 'locked') {
      return res.status(429).json({ message: 'Too many invalid OTP attempts. Request a new code.' });
    }
    if (verified.reason === 'missing') {
      return res.status(400).json({ message: 'OTP expired, locked, or not requested' });
    }
    return res.status(400).json({
      message: `Invalid OTP. ${verified.attemptsLeft ?? 0} attempt(s) remaining.`,
    });
  }

  if (!meta.allowedFrom.includes(existing.status)) {
    return res.status(400).json({
      message: `Cannot ${purposeText(purpose)} when request is ${existing.status}`,
    });
  }

  const updated = await prisma.serviceRequest.update({
    where: { id: existing.id },
    data: {
      status: meta.nextStatus,
      startedAt: meta.nextStatus === 'in_progress' ? new Date() : existing.startedAt,
      completedAt: meta.nextStatus === 'completed' ? new Date() : existing.completedAt,
    },
    include: REQUEST_INCLUDE,
  });
  const request = toRequest(updated);

  const io = getIO(req);
  if (io) {
    io.to(`user:${request.user._id}`).emit('request:otp-sync', {
      requestId: request._id,
      pendingOtp: null,
    });
    io.to(`user:${request.user._id}`).emit('request:updated', { ...request, pendingOtp: null });
    io.to('admins').emit('activity:new', { type: `request_${meta.nextStatus}`, request });
  }

  audit(req, {
    action: 'visit_otp.verified',
    entityType: 'ServiceRequest',
    entityId: existing.id,
    metadata: { purpose, nextStatus: meta.nextStatus },
  });

  return res.json({ message: `${purposeText(purpose)} verified`, request });
};

// ADMIN: full activity feed
exports.adminAllRequests = async (req, res) => {
  const rows = await prisma.serviceRequest.findMany({
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  return res.json({ requests: rows.map(toRequest) });
};

// ADMIN: stats
exports.adminStats = async (req, res) => {
  const [users, nurses, admins, requests, pending, completed, active, revenueAgg] = await Promise.all([
    prisma.user.count({ where: { role: 'user' } }),
    prisma.user.count({ where: { role: 'nurse' } }),
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.serviceRequest.count(),
    prisma.serviceRequest.count({ where: { status: 'pending' } }),
    prisma.serviceRequest.count({ where: { status: 'completed' } }),
    prisma.serviceRequest.count({
      where: { status: { in: ['accepted', 'on_the_way', 'in_progress'] } },
    }),
    prisma.serviceRequest.aggregate({
      where: { paidAt: { not: null } },
      _sum: { feeAmount: true },
    }),
  ]);
  const revenueTotal = Number(revenueAgg._sum.feeAmount) || 0;
  return res.json({
    counts: { users, nurses, admins, requests, pending, completed, active, revenueTotal },
  });
};

// ADMIN: bookings that have been paid (direct book + checkout), with current status
exports.adminPaidRequests = async (req, res) => {
  const rows = await prisma.serviceRequest.findMany({
    where: { paidAt: { not: null } },
    include: REQUEST_INCLUDE,
    orderBy: { paidAt: 'desc' },
    take: 500,
  });
  const requests = rows.map(toRequest);
  const totalRevenue = requests.reduce((s, r) => s + (Number(r.feeAmount) || 0), 0);
  return res.json({ requests, totalRevenue });
};
