const crypto = require('crypto');
const Razorpay = require('razorpay');

let client;

function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

function getPublicKeyId() {
  return process.env.RAZORPAY_KEY_ID?.trim() || null;
}

function getClient() {
  if (!isRazorpayConfigured()) return null;
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID.trim(),
      key_secret: process.env.RAZORPAY_KEY_SECRET.trim(),
    });
  }
  return client;
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature || !process.env.RAZORPAY_KEY_SECRET) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET.trim())
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

async function createOrder({ amountInr, receipt, notes = {} }) {
  const razorpay = getClient();
  if (!razorpay) {
    const err = new Error('Razorpay is not configured');
    err.status = 503;
    throw err;
  }

  const amountPaise = Math.round(Number(amountInr) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise < 100) {
    const err = new Error('Invalid payment amount');
    err.status = 400;
    throw err;
  }

  return razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: String(receipt).slice(0, 40),
    notes,
  });
}

async function assertPaymentCaptured(paymentId, { orderId, amountPaise }) {
  const razorpay = getClient();
  if (!razorpay) {
    const err = new Error('Razorpay is not configured');
    err.status = 503;
    throw err;
  }

  const payment = await razorpay.payments.fetch(paymentId);

  if (payment.status !== 'captured') {
    const err = new Error('Payment was not captured');
    err.status = 402;
    throw err;
  }
  if (payment.order_id !== orderId) {
    const err = new Error('Payment order mismatch');
    err.status = 400;
    throw err;
  }
  if (Number(payment.amount) !== Number(amountPaise)) {
    const err = new Error('Payment amount mismatch');
    err.status = 400;
    throw err;
  }

  return payment;
}

module.exports = {
  isRazorpayConfigured,
  getPublicKeyId,
  createOrder,
  verifyPaymentSignature,
  assertPaymentCaptured,
};
