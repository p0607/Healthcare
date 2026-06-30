/**
 * Demo payment checkout — same API as web PaymentCheckout.jsx.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { caregiverRecordId, initialsFromName, isValidPin } from '@nursecare/shared';
import { useBookingCart } from '../../src/context/BookingCartContext';
import TextField from '../../src/components/TextField';
import { api, apiErrorMessage } from '../../src/api/client';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

export default function PaymentScreen() {
  const router = useRouter();
  const { paymentCheckout, clearCart, setPaymentCheckout } = useBookingCart();
  const checkout = paymentCheckout;

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

  const nurse = checkout?.nurse;
  const nurseId = caregiverRecordId(nurse);
  const pin = checkout?.pin;
  const address = checkout?.address ?? '';
  const checkoutServiceType = checkout?.serviceType || 'nurse_visit';
  const selectedCareOptionIds = checkout?.selectedCareOptionIds ?? [];
  const selectedCareOptions = useMemo(() => checkout?.selectedCareOptions ?? [], [checkout?.selectedCareOptions]);

  const selectedLineItems = useMemo(
    () =>
      selectedCareOptions.map((item) => ({
        careServiceOptionId: item.id,
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
      Alert.alert('Incomplete checkout', 'Complete your cart before payment.', [
        { text: 'OK', onPress: () => router.replace('/(app)/cart') },
      ]);
    }
  }, [checkout, nurseId, pin, router]);

  useEffect(() => {
    if (!nurseId || selectedCareOptionIds.length === 0) return;
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
          Alert.alert('Error', apiErrorMessage(err, 'Could not load price'));
          router.replace('/(app)/cart');
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nurseId, checkoutServiceType, selectedCareOptionIds, selectedLineItems, selectedTotal, router]);

  const cardDigits = cardNumber.replace(/\D/g, '');
  const cardExpiryDigits = cardExpiry.replace(/\D/g, '');

  const payDisabled =
    submitting ||
    quoteLoading ||
    displayAmount <= 0 ||
    (method === 'card' &&
      (cardDigits.length < 12 ||
        cardExpiryDigits.length < 4 ||
        cardCvv.trim().length < 3 ||
        !cardName.trim())) ||
    (method === 'upi' && !/^[\w.-]+@[\w]+$/.test(upiId.trim()));

  const confirmPayment = async () => {
    if (!nurseId || !isValidPin(pin)) return;
    setSubmitting(true);
    try {
      await api.post('/requests', {
        serviceType: checkoutServiceType,
        notes: checkout?.visitNotes || '',
        location: { type: 'Point', coordinates: pin, address },
        nurseId,
        feeAmount: displayAmount,
        paymentConfirmed: true,
        selectedCareOptionIds,
      });
      await clearCart();
      setPaymentCheckout(null);
      Alert.alert(
        'Booking confirmed',
        `Paid ${fmtInr(displayAmount)} · Booked with ${nurse.name} (demo)`,
        [{ text: 'View bookings', onPress: () => router.replace('/(app)/bookings') }]
      );
    } catch (err) {
      Alert.alert('Payment failed', apiErrorMessage(err, 'Could not complete booking.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!checkout || !nurseId) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Secure checkout</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.demoBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#047857" />
          <Text style={styles.demoText}>PCI-ready demo · No real charge</Text>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Order summary</Text>
          <View style={styles.nurseRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFromName(nurse.name)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.nurseName}>{nurse.name}</Text>
              <Text style={styles.nurseSpec}>{nurse.specialization}</Text>
              <Text style={styles.address} numberOfLines={2}>
                {address}
              </Text>
            </View>
          </View>
          {quoteLoading ? (
            <Text style={styles.quoteHint}>Calculating price…</Text>
          ) : (
            summaryLineItems.map((row) => (
              <View key={row.careServiceOptionId} style={styles.lineRow}>
                <Text style={styles.lineLabel} numberOfLines={1}>
                  {row.label}
                </Text>
                <Text style={styles.lineRate}>{fmtInr(row.rate)}</Text>
              </View>
            ))
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{fmtInr(displayAmount)}</Text>
          </View>
        </View>

        <View style={styles.methodRow}>
          {['card', 'upi', 'netbanking'].map((id) => (
            <Pressable
              key={id}
              style={[styles.methodBtn, method === id && styles.methodActive]}
              onPress={() => setMethod(id)}
            >
              <Text style={[styles.methodText, method === id && styles.methodTextActive]}>
                {id === 'card' ? 'Card' : id === 'upi' ? 'UPI' : 'Netbanking'}
              </Text>
            </Pressable>
          ))}
        </View>

        {method === 'card' ? (
          <View style={styles.form}>
            <TextField
              label="Card number"
              value={cardNumber}
              onChangeText={(t) =>
                setCardNumber(
                  t
                    .replace(/\D/g, '')
                    .slice(0, 16)
                    .replace(/(\d{4})(?=\d)/g, '$1 ')
                    .trim()
                )
              }
              placeholder="4242 4242 4242 4242"
              keyboardType="number-pad"
            />
            <View style={styles.row}>
              <View style={styles.half}>
                <TextField
                  label="Expiry"
                  value={cardExpiry}
                  onChangeText={setCardExpiry}
                  placeholder="MM/YY"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.half}>
                <TextField
                  label="CVV"
                  value={cardCvv}
                  onChangeText={(t) => setCardCvv(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="•••"
                  secureTextEntry
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <TextField label="Name on card" value={cardName} onChangeText={setCardName} />
          </View>
        ) : null}

        {method === 'upi' ? (
          <View style={styles.form}>
            <TextField
              label="UPI ID"
              value={upiId}
              onChangeText={setUpiId}
              placeholder="you@paytm"
              autoCapitalize="none"
            />
          </View>
        ) : null}

        {method === 'netbanking' ? (
          <Text style={styles.netHint}>
            In production you would pick your bank and complete OTP on the bank page. Here you can
            still pay below to confirm this booking.
          </Text>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.payBtn, payDisabled && styles.payDisabled, pressed && styles.pressed]}
          onPress={confirmPayment}
          disabled={payDisabled}
        >
          <Ionicons name="lock-closed" size={16} color={colors.white} />
          <Text style={styles.payText}>{submitting ? 'Processing…' : `Pay ${fmtInr(displayAmount)}`}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  demoText: { fontSize: 11, fontWeight: '600', color: '#047857' },
  summary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nurseRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.sm, fontWeight: '800', color: colors.brand },
  nurseName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  nurseSpec: { fontSize: fontSize.xs, color: colors.muted },
  address: { fontSize: fontSize.xs, color: colors.muted, marginTop: 4 },
  quoteHint: { fontSize: fontSize.sm, color: colors.muted },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  lineLabel: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  lineRate: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  totalLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  totalValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  methodRow: { flexDirection: 'row', gap: spacing.sm },
  methodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  methodActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  methodText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.muted },
  methodTextActive: { color: colors.brand },
  form: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  netHint: { fontSize: fontSize.sm, color: colors.muted, lineHeight: 20 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#059669',
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  payDisabled: { opacity: 0.45 },
  payText: { color: colors.white, fontWeight: '800', fontSize: fontSize.md },
  pressed: { opacity: 0.9 },
});
