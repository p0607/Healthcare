import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Lock,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { api } from '../lib/api';
import { caregiverRecordId, isValidPin } from '../lib/checkout';
import { getSocket } from '../lib/socket';
import { loadRazorpayScript, openRazorpayCheckout } from '../lib/razorpay';
import { useAuth } from '../context/AuthContext';

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

function initialsFromName(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

/** Checkout — Razorpay when configured, demo fallback in local dev */
const PaymentCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const checkout = location.state?.checkout;

  const [method, setMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [feeAmount, setFeeAmount] = useState(0);
  const [lineItems, setLineItems] = useState([]);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);

  const nurse = checkout?.nurse;
  const nurseId = caregiverRecordId(nurse);
  const pin = checkout?.pin;
  const careOptionIdsKey = (checkout?.selectedCareOptionIds ?? []).join(',');
  const address = checkout?.address ?? '';
  const visitNotes = checkout?.visitNotes ?? '';
  const checkoutServiceType = checkout?.serviceType || 'nurse_visit';
  const scheduledAt = checkout?.scheduledAt || null;
  const selectedCareOptionIds = checkout?.selectedCareOptionIds ?? [];
  const selectedCareOptions = useMemo(() => checkout?.selectedCareOptions ?? [], [checkout?.selectedCareOptions]);
  const selectedLineItems = useMemo(
    () =>
      selectedCareOptions.map((item) => ({
        careServiceOptionId: item.id || item.careServiceOptionId,
        label: item.label,
        rate: Number(item.rate) || 0,
      })),
    [selectedCareOptions]
  );
  const selectedTotal = useMemo(
    () => selectedLineItems.reduce((sum, item) => sum + (Number(item.rate) || 0), 0),
    [selectedLineItems]
  );
  const summaryLineItems = lineItems.length > 0 ? lineItems : selectedLineItems;
  const displayAmount = feeAmount > 0 ? feeAmount : selectedTotal;

  useEffect(() => {
    if (!checkout || !nurseId || !isValidPin(pin)) {
      toast.error('Complete your cart before payment');
      navigate('/dashboard/cart', { replace: true });
    }
  }, [checkout, nurseId, pin, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/payments/razorpay/config');
        if (!cancelled) setRazorpayEnabled(Boolean(data.enabled));
      } catch {
        if (!cancelled) setRazorpayEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!nurseId || !careOptionIdsKey) return;
    let cancelled = false;
    if (selectedTotal > 0) {
      setFeeAmount(selectedTotal);
      setLineItems(selectedLineItems);
    }
    setQuoteLoading(true);
    (async () => {
      try {
        const { data } = await api.post('/requests/quote', {
          nurseId,
          serviceType: checkoutServiceType,
          selectedCareOptionIds,
        });
        if (cancelled) return;
        setFeeAmount(Number(data.totalFee) || 0);
        setLineItems(data.lineItems || []);
      } catch (err) {
        if (!cancelled && selectedTotal <= 0) {
          toast.error(err?.response?.data?.message || 'Could not load price');
          navigate('/dashboard/cart', { replace: true });
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nurseId, checkoutServiceType, careOptionIdsKey, navigate, selectedLineItems, selectedTotal, selectedCareOptionIds]);

  const cardDigits = useMemo(() => cardNumber.replace(/\D/g, ''), [cardNumber]);
  const cardExpiryDigits = useMemo(() => cardExpiry.replace(/\D/g, ''), [cardExpiry]);

  const formatCardInput = (raw) => {
    const d = raw.replace(/\D/g, '').slice(0, 16);
    return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const formatCardExpiry = (raw, previous = '') => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 2) {
      const month = parseInt(digits.slice(0, 2), 10);
      if (month < 1 || month > 12) {
        toast.error('Enter correct month (01–12)');
        return previous;
      }
    }
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const payDisabled = useMemo(() => {
    if (submitting || quoteLoading || feeAmount <= 0) return true;
    if (razorpayEnabled) return false;
    if (method === 'card') {
      return (
        cardDigits.length < 12 ||
        cardExpiryDigits.length < 4 ||
        cardCvv.trim().length < 3 ||
        !cardName.trim()
      );
    }
    if (method === 'upi') {
      return !/^[\w.-]+@[\w]+$/.test(upiId.trim());
    }
    return false;
  }, [submitting, quoteLoading, feeAmount, razorpayEnabled, method, cardDigits, cardExpiryDigits, cardCvv, cardName, upiId]);

  const completeBooking = async (paymentPayload) => {
    const scheduleNote = scheduledAt
      ? `Scheduled for: ${new Date(scheduledAt).toLocaleString()}`
      : '';
    const combinedNotes = [visitNotes, scheduleNote].filter(Boolean).join(' | ');

    const { data } = await api.post('/requests', {
      serviceType: checkoutServiceType,
      notes: combinedNotes || visitNotes,
      location: { type: 'Point', coordinates: pin, address },
      nurseId,
      feeAmount,
      selectedCareOptionIds,
      scheduledAt: scheduledAt || undefined,
      ...paymentPayload,
    });

    const s = getSocket();
    if (s) s.emit('request:join', data.request._id);

    toast.success(`Paid ${fmtInr(feeAmount)} · Booked with ${nurse.name}`);
    navigate('/dashboard', {
      replace: true,
      state: {
        mainPanel: 'book',
        bookingComplete: true,
        postBookingRequestId: data.request._id,
      },
    });
  };

  const confirmPayment = async () => {
    if (!nurseId || !isValidPin(pin)) return;
    setSubmitting(true);

    try {
      if (razorpayEnabled) {
        const scriptReady = await loadRazorpayScript();
        if (!scriptReady) {
          toast.error('Could not load Razorpay checkout');
          return;
        }

        const order = await api.post('/payments/razorpay/order', {
          nurseId,
          serviceType: checkoutServiceType,
          selectedCareOptionIds,
        });

        const { orderId, amount, currency, keyId } = order.data;
        if (Number(order.data.totalFee) !== feeAmount) {
          setFeeAmount(Number(order.data.totalFee) || feeAmount);
        }

        openRazorpayCheckout({
          keyId,
          orderId,
          amount,
          currency,
          user,
          onSuccess: async (response) => {
            try {
              await completeBooking({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
            } catch (err) {
              toast.error(err?.response?.data?.message || 'Booking failed after payment');
            } finally {
              setSubmitting(false);
            }
          },
          onFailure: (err) => {
            if (err?.message !== 'Payment cancelled') {
              toast.error(err?.message || 'Payment failed');
            }
            setSubmitting(false);
          },
        });
        return;
      }

      await completeBooking({ paymentConfirmed: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Payment failed');
    } finally {
      if (!razorpayEnabled) setSubmitting(false);
    }
  };

  if (!checkout || !nurseId) {
    return (
      <div className="min-h-[50vh] grid place-items-center text-slate-500 text-sm px-4">Redirecting…</div>
    );
  }

  const tabBtn = (id, label, Icon) => (
    <button
      key={id}
      type="button"
      onClick={() => setMethod(id)}
      className={`flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all border ${
        method === id
          ? 'border-brand-500 bg-brand-50 text-brand-900 shadow-sm ring-1 ring-brand-500/20'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );

  const checkoutInputClass =
    'w-full h-9 rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs text-slate-950 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500/50';
  const checkoutLabelClass = 'block text-[11px] font-semibold text-slate-900 mb-1';

  return (
    <div className="app-page min-h-full py-4 px-4 sm:px-5">
      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 text-xs font-medium text-white/70 hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} aria-hidden />
          Back to booking
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-md">
              <Lock className="w-4 h-4" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/75">Secure checkout</div>
              <div className="text-base font-bold text-white">NurseCare Payments</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full px-2.5 py-1">
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} aria-hidden />
            {razorpayEnabled ? 'Secured by Razorpay' : 'Dev demo · No real charge'}
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-4 lg:gap-5 items-start">
          <aside className="lg:col-span-2 space-y-3">
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Order summary</p>
              <div className="mt-3 flex gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 text-brand-900 text-xs font-bold">
                  {initialsFromName(nurse.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{nurse.name}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{nurse.specialization}</div>
                  <div className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">{address}</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                {quoteLoading && (
                  <p className="text-xs text-slate-500">
                    {summaryLineItems.length > 0 ? 'Confirming selected service price…' : 'Calculating price…'}
                  </p>
                )}
                {summaryLineItems.length > 0 && (
                  <ul className="space-y-1 text-xs text-slate-600">
                    {summaryLineItems.map((row) => (
                      <li key={row.careServiceOptionId} className="flex justify-between gap-2">
                        <span className="truncate">{row.label}</span>
                        <span className="shrink-0 tabular-nums font-medium text-slate-900">
                          {fmtInr(row.rate)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {summaryLineItems.length === 0 && !quoteLoading && (
                  <p className="text-sm text-slate-500">No selected services found.</p>
                )}
                {summaryLineItems.length > 0 && (
                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                    <span className="text-sm font-medium text-slate-800">Total</span>
                    <span className="text-lg font-bold text-slate-900 tabular-nums">{fmtInr(displayAmount)}</span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed px-1">
              {razorpayEnabled
                ? 'Pay with UPI, cards, or netbanking via Razorpay. Your booking is confirmed only after successful payment.'
                : 'Local dev mode — payment is simulated. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env for real checkout.'}
            </p>
          </aside>

          <div className="lg:col-span-3 rounded-xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/40 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 flex flex-wrap justify-between items-center gap-2">
              <span className="text-white/90 text-xs font-medium">Pay amount</span>
              <span className="text-lg font-bold text-white tabular-nums">{fmtInr(displayAmount)}</span>
            </div>

            <div className="p-4 space-y-4">
              {!razorpayEnabled ? (
              <>
              <div className="flex flex-col sm:flex-row gap-2">
                {tabBtn('card', 'Card', CreditCard)}
                {tabBtn('upi', 'UPI', Smartphone)}
                {tabBtn('netbanking', 'Netbanking', Building2)}
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-3">
                {method === 'card' && (
                  <>
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Accepted cards</span>
                      <div className="flex flex-wrap gap-1.5">
                        {['Visa', 'Mastercard', 'RuPay', 'Amex'].map((b) => (
                          <span
                            key={b}
                            className="text-[10px] font-bold px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className={checkoutLabelClass}>Card number</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="4242 4242 4242 4242"
                        className={`${checkoutInputClass} font-mono tracking-wide`}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-1">
                        <label className={checkoutLabelClass}>Expiry</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          placeholder="MM/YY"
                          className={checkoutInputClass}
                          value={cardExpiry}
                          onChange={(e) =>
                            setCardExpiry((prev) => formatCardExpiry(e.target.value, prev))
                          }
                          maxLength={5}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className={checkoutLabelClass}>CVV</label>
                        <input
                          type="password"
                          inputMode="numeric"
                          placeholder="•••"
                          className={`${checkoutInputClass} font-mono`}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <label className={checkoutLabelClass}>Name on card</label>
                        <input
                          type="text"
                          placeholder="As printed on card"
                          className={checkoutInputClass}
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                {method === 'upi' && (
                  <>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pay with UPI</p>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: 'Google Pay', sub: 'GPay' },
                        { label: 'PhonePe', sub: 'PhonePe' },
                        { label: 'Paytm', sub: 'Paytm' },
                        { label: 'BHIM', sub: 'BHIM UPI' },
                      ].map(({ label, sub }) => (
                        <button
                          key={label}
                          type="button"
                          className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 min-w-[4.75rem] hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {sub.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="text-[11px] font-medium text-slate-700 text-center leading-tight">{label}</span>
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className={checkoutLabelClass}>UPI ID</label>
                      <input
                        type="text"
                        placeholder="you@paytm"
                        className={checkoutInputClass}
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value.toLowerCase())}
                      />
                      <p className="mt-1 text-[11px] text-slate-500">Enter your VPA (e.g. name@oksbi)</p>
                    </div>
                  </>
                )}

                {method === 'netbanking' && (
                  <>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Netbanking</p>
                    <div className="flex items-start gap-3 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3">
                      <Wallet className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
                      <div className="text-sm text-slate-600">
                        <p className="font-medium text-slate-800">Redirect flow (demo)</p>
                        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                          In production you would pick your bank and complete OTP on the bank page. Here you can still pay
                          with the button below to confirm this booking.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
              </>
              ) : (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm text-slate-600">
                  Razorpay checkout supports UPI, cards, wallets, and netbanking. Click Pay below to open the secure payment window.
                </div>
              )}

              <button
                type="button"
                disabled={payDisabled}
                onClick={confirmPayment}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-45 disabled:pointer-events-none transition-all"
              >
                <Lock className="w-[1.05rem] h-[1.05rem]" strokeWidth={2} aria-hidden />
                {submitting ? 'Processing…' : `Pay ${fmtInr(displayAmount)}`}
              </button>

              <div className="flex flex-wrap justify-center gap-3 text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                <span>256-bit encryption</span>
                <span>{razorpayEnabled ? 'Powered by Razorpay' : 'Demo checkout'}</span>
                <span>No card data stored on our servers</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCheckout;
