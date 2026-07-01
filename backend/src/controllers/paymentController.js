const prisma = require('../lib/prisma');
const { computeBookingFee } = require('../lib/bookingFee');
const {
  isRazorpayConfigured,
  getPublicKeyId,
  createOrder,
} = require('../lib/razorpay');

exports.getRazorpayConfig = (_req, res) => {
  res.json({
    enabled: isRazorpayConfigured(),
    keyId: isRazorpayConfigured() ? getPublicKeyId() : null,
    currency: 'INR',
  });
};

exports.createRazorpayOrder = async (req, res) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ message: 'Razorpay is not configured on this server' });
    }

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

    const receipt = `bk_${req.user.id.slice(-8)}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, '');
    const order = await createOrder({
      amountInr: totalFee,
      receipt,
      notes: {
        userId: req.user.id,
        nurseId,
        serviceType: serviceType || 'nurse_visit',
      },
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getPublicKeyId(),
      totalFee,
      lineItems,
    });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Could not create payment order' });
  }
};

exports.assertPaymentUnused = async (paymentId) => {
  if (!paymentId) return;
  const existing = await prisma.serviceRequest.findFirst({
    where: { razorpayPaymentId: paymentId },
    select: { id: true },
  });
  if (existing) {
    const err = new Error('This payment was already used for a booking');
    err.status = 409;
    throw err;
  }
};
