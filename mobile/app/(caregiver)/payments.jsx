import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { caregiverServiceLabel } from '@nursecare/shared';
import { api, apiErrorMessage } from '../../src/api/client';
import Button from '../../src/components/Button';
import CaregiverScreenHeader from '../../src/components/CaregiverScreenHeader';
import TextField from '../../src/components/TextField';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

const paymentStatusLabel = (status) => {
  if (status === 'paid_out') return { text: 'Paid to you', color: colors.success, bg: '#d1fae5' };
  if (status === 'cod_pending') return { text: 'COD · collect on visit', color: '#b45309', bg: '#fef3c7' };
  if (status === 'pending_settlement') return { text: 'Pending', color: '#d97706', bg: '#fef3c7' };
  if (status === 'refunded') return { text: 'Refunded', color: colors.muted, bg: '#f1f5f9' };
  return { text: status, color: colors.muted, bg: '#f1f5f9' };
};

export default function CaregiverPaymentsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState({
    totalReceived: 0,
    pendingSettlement: 0,
    paymentCount: 0,
    completedCount: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [payoutMethod, setPayoutMethod] = useState('bank');
  const [payout, setPayout] = useState({
    accountHolder: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    upiId: '',
    configured: false,
    accountNumberMasked: '',
  });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/nurses/me/payments');
      setSummary(data.summary || {});
      setTransactions(data.transactions || []);
      const p = data.payout || {};
      setPayoutMethod(p.method === 'upi' ? 'upi' : 'bank');
      setPayout({
        accountHolder: p.accountHolder || '',
        bankName: p.bankName || '',
        accountNumber: '',
        ifsc: p.ifsc || '',
        upiId: p.upiId || '',
        configured: Boolean(p.configured),
        accountNumberMasked: p.accountNumberMasked || '',
      });
    } catch (err) {
      setSummary({ totalReceived: 0, pendingSettlement: 0, paymentCount: 0, completedCount: 0 });
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const savePayout = async () => {
    setSaving(true);
    try {
      const payload =
        payoutMethod === 'bank'
          ? {
              payoutMethod: 'bank',
              payoutAccountHolder: payout.accountHolder,
              payoutBankName: payout.bankName,
              payoutAccountNumber: payout.accountNumber.replace(/\s/g, ''),
              payoutIfsc: payout.ifsc,
            }
          : {
              payoutMethod: 'upi',
              payoutUpiId: payout.upiId,
              payoutAccountHolder: payout.accountHolder,
            };
      const { data } = await api.patch('/nurses/me/payout', payload);
      setPayout((prev) => ({
        ...prev,
        configured: data.payout?.configured,
        accountNumberMasked: data.payout?.accountNumberMasked || prev.accountNumberMasked,
        accountNumber: '',
      }));
      Alert.alert('Saved', 'Payout details saved.');
    } catch (err) {
      Alert.alert('Error', apiErrorMessage(err, 'Could not save payout details.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <CaregiverScreenHeader title="Payments" subtitle="Earnings & payout" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.brand}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={colors.brand} style={styles.loader} />
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, styles.summaryGreen]}>
                <Text style={styles.summaryLabel}>Total received</Text>
                <Text style={styles.summaryValue}>{fmtInr(summary.totalReceived)}</Text>
                <Text style={styles.summaryHint}>{summary.completedCount} completed</Text>
              </View>
              <View style={[styles.summaryCard, styles.summaryAmber]}>
                <Text style={styles.summaryLabel}>Pending</Text>
                <Text style={styles.summaryValue}>{fmtInr(summary.pendingSettlement)}</Text>
                <Text style={styles.summaryHint}>Awaiting completion</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Payment history</Text>
              {transactions.length === 0 ? (
                <Text style={styles.empty}>No paid bookings yet.</Text>
              ) : (
                transactions.map((r) => {
                  const ps = paymentStatusLabel(r.paymentStatus);
                  return (
                    <View key={r._id} style={styles.txRow}>
                      <View style={styles.txTop}>
                        <Text style={styles.txPatient}>{r.user?.name || 'Patient'}</Text>
                        <Text style={styles.txAmount}>{fmtInr(r.feeAmount)}</Text>
                      </View>
                      <Text style={styles.txMeta}>
                        {caregiverServiceLabel(r.serviceType)}
                        {r.paidAt ? ` · ${new Date(r.paidAt).toLocaleDateString('en-IN')}` : ''}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: ps.bg }]}>
                        <Text style={[styles.badgeText, { color: ps.color }]}>{ps.text}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Payout account</Text>
              {payout.configured ? (
                <Text style={styles.configured}>
                  Active:{' '}
                  {payoutMethod === 'bank'
                    ? `${payout.bankName || 'Bank'} · ${payout.accountNumberMasked || 'on file'}`
                    : `UPI ${payout.upiId}`}
                </Text>
              ) : null}

              <View style={styles.methodRow}>
                <Pressable
                  style={[styles.methodBtn, payoutMethod === 'bank' && styles.methodBtnActive]}
                  onPress={() => setPayoutMethod('bank')}
                >
                  <Text style={[styles.methodText, payoutMethod === 'bank' && styles.methodTextActive]}>
                    Bank
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.methodBtn, payoutMethod === 'upi' && styles.methodBtnActive]}
                  onPress={() => setPayoutMethod('upi')}
                >
                  <Text style={[styles.methodText, payoutMethod === 'upi' && styles.methodTextActive]}>
                    UPI
                  </Text>
                </Pressable>
              </View>

              {payoutMethod === 'bank' ? (
                <>
                  <TextField
                    label="Account holder"
                    value={payout.accountHolder}
                    onChangeText={(v) => setPayout((p) => ({ ...p, accountHolder: v }))}
                  />
                  <TextField
                    label="Bank name"
                    value={payout.bankName}
                    onChangeText={(v) => setPayout((p) => ({ ...p, bankName: v }))}
                  />
                  <TextField
                    label="IFSC"
                    value={payout.ifsc}
                    onChangeText={(v) => setPayout((p) => ({ ...p, ifsc: v.toUpperCase() }))}
                    autoCapitalize="characters"
                  />
                  <TextField
                    label="Account number"
                    value={payout.accountNumber}
                    onChangeText={(v) => setPayout((p) => ({ ...p, accountNumber: v }))}
                    keyboardType="number-pad"
                    placeholder={payout.accountNumberMasked || 'Enter account number'}
                  />
                </>
              ) : (
                <>
                  <TextField
                    label="Account holder (optional)"
                    value={payout.accountHolder}
                    onChangeText={(v) => setPayout((p) => ({ ...p, accountHolder: v }))}
                  />
                  <TextField
                    label="UPI ID"
                    value={payout.upiId}
                    onChangeText={(v) => setPayout((p) => ({ ...p, upiId: v.toLowerCase() }))}
                    placeholder="name@oksbi"
                  />
                </>
              )}

              <Button label="Save payout details" onPress={savePayout} loading={saving} />
              <Text style={styles.demoNote}>Demo storage — no real money movement.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  loader: { marginTop: spacing.xl },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: 4,
  },
  summaryGreen: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  summaryAmber: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  summaryLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  summaryValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  summaryHint: { fontSize: fontSize.xs, color: colors.muted },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  empty: { fontSize: fontSize.sm, color: colors.muted },
  txRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: 4,
  },
  txTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txPatient: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, flex: 1 },
  txAmount: { fontSize: fontSize.sm, fontWeight: '800', color: colors.text },
  txMeta: { fontSize: fontSize.xs, color: colors.muted },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  configured: { fontSize: fontSize.sm, color: colors.success, fontWeight: '600' },
  methodRow: { flexDirection: 'row', gap: spacing.sm },
  methodBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  methodBtnActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  methodText: { fontWeight: '700', color: colors.muted, fontSize: fontSize.sm },
  methodTextActive: { color: colors.brand },
  demoNote: { fontSize: fontSize.xs, color: colors.muted, textAlign: 'center' },
});
