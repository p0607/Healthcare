import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { caregiverServiceLabel } from '@nursecare/shared';
import { api, apiErrorMessage } from '../../src/api/client';
import CaregiverScreenHeader from '../../src/components/CaregiverScreenHeader';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

const STATUS_META = {
  completed: { label: 'Completed', color: '#059669', bg: '#d1fae5' },
  cancelled: { label: 'Cancelled', color: '#64748b', bg: '#f1f5f9' },
};

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

const fmtWhen = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export default function CaregiverBookingsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/requests/assigned', { params: { _ts: Date.now() } });
      const rows = (data.requests || []).filter((r) => ['completed', 'cancelled'].includes(r.status));
      rows.sort(
        (a, b) =>
          new Date(b.completedAt || b.updatedAt || b.createdAt || 0) -
          new Date(a.completedAt || a.updatedAt || a.createdAt || 0)
      );
      setRequests(rows);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load bookings.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const completedCount = useMemo(
    () => requests.filter((r) => r.status === 'completed').length,
    [requests]
  );

  return (
    <View style={styles.screen}>
      <CaregiverScreenHeader
        title="All bookings"
        subtitle={`${completedCount} completed · ${requests.length} total`}
        left={
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
        }
      />

      {loading && requests.length === 0 ? (
        <ActivityIndicator color={colors.brand} style={styles.loader} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item._id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            error ? (
              <Text style={styles.error}>{error}</Text>
            ) : (
              <Text style={styles.empty}>No past bookings yet.</Text>
            )
          }
          renderItem={({ item }) => {
            const meta = STATUS_META[item.status] || STATUS_META.completed;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.service}>{caregiverServiceLabel(item.serviceType)}</Text>
                  <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
                <Text style={styles.patient}>{item.user?.name || 'Patient'}</Text>
                {item.location?.address ? (
                  <Text style={styles.meta} numberOfLines={2}>
                    {item.location.address}
                  </Text>
                ) : null}
                <View style={styles.cardBottom}>
                  <Text style={styles.meta}>{fmtWhen(item.completedAt || item.createdAt)}</Text>
                  {item.feeAmount != null ? (
                    <Text style={styles.amount}>{fmtInr(item.feeAmount)}</Text>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  loader: { marginTop: spacing.xxl },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  service: { flex: 1, fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  patient: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  meta: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 16 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  amount: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  empty: { textAlign: 'center', color: colors.muted, paddingVertical: spacing.xxl },
  error: { textAlign: 'center', color: colors.danger, paddingVertical: spacing.xxl },
});
