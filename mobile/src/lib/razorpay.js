import { api } from '../api/client';

export async function fetchRazorpayConfig() {
  const { data } = await api.get('/payments/razorpay/config');
  return data;
}

export async function createRazorpayOrder(payload) {
  const { data } = await api.post('/payments/razorpay/order', payload);
  return data;
}

let RazorpayCheckout;

try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch {
  RazorpayCheckout = null;
}

export function isNativeRazorpayAvailable() {
  return Boolean(RazorpayCheckout);
}

export function openNativeRazorpayCheckout({ keyId, orderId, amount, currency, user, description }) {
  if (!RazorpayCheckout) {
    return Promise.reject(new Error('Razorpay requires a production/dev build (not Expo Go)'));
  }

  return RazorpayCheckout.open({
    key: keyId,
    order_id: orderId,
    amount,
    currency: currency || 'INR',
    name: 'Vytal',
    description: description || 'Home care booking',
    prefill: {
      name: user?.name || '',
      email: user?.email || '',
      contact: user?.phone || '',
    },
    theme: { color: '#0a9bf0' },
  });
}
