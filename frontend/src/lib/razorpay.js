export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);

    const existing = document.querySelector('script[data-razorpay-checkout]');
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = '1';
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function openRazorpayCheckout({
  keyId,
  orderId,
  amount,
  currency = 'INR',
  user,
  description = 'Nurse Care home visit booking',
  onSuccess,
  onFailure,
}) {
  if (!window.Razorpay) {
    onFailure?.(new Error('Razorpay checkout failed to load'));
    return;
  }

  const rzp = new window.Razorpay({
    key: keyId,
    amount,
    currency,
    name: 'Nurse Care',
    description,
    order_id: orderId,
    prefill: {
      name: user?.name || '',
      email: user?.email || '',
      contact: user?.phone || '',
    },
    theme: { color: '#0a9bf0' },
    handler(response) {
      onSuccess?.(response);
    },
    modal: {
      ondismiss() {
        onFailure?.(new Error('Payment cancelled'));
      },
    },
  });

  rzp.on('payment.failed', (response) => {
    const message = response?.error?.description || 'Payment failed';
    onFailure?.(new Error(message));
  });

  rzp.open();
}
