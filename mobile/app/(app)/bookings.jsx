/**
 * Bookings — the patient's request history (web: UserDashboard "requests" panel).
 * GET /requests/mine, pull-to-refresh, and cancel for in-flight requests.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { caregiverServiceLabel } from '@nursecare/shared';
import { api, apiErrorMessage } from '../../src/api/client';
import { connectSocket } from '../../src/lib/socket';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

const STATUS_META = {
  pending: { label: 'Pending', color: '#d97706', bg: '#fef3c7' },
  accepted: { label: 'Accepted', color: '#0784cf', bg: '#e6f4fd' },
  on_the_way: { label: 'On the way', color: '#7c3aed', bg: '#ede9fe' },
  in_progress: { label: 'In progress', color: '#0784cf', bg: '#e6f4fd' },
  completed: { label: 'Completed', color: '#059669', bg: '#d1fae5' },
  cancelled: { label: 'Cancelled', color: '#64748b', bg: '#f1f5f9' },
};

const CANCELABLE = ['pending', 'accepted', 'on_the_way', 'in_progress'];
const TRACKABLE = ['on_the_way', 'in_progress'];

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const formatMoney = (amount) =>
  amount == null
    ? null
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(Number(amount));

export default function BookingsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/requests/mine', { params: { _ts: Date.now() } });
      setRequests(data.requests || []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load your bookings.'));
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

  useEffect(() => {
    let detach = () => {};
    (async () => {
      const socket = await connectSocket();
      if (!socket) return;
      const onUpdate = (req) => {
        if (!req?._id) return;
        setRequests((rows) => {
          const idx = rows.findIndex((r) => r._id === req._id);
          if (idx === -1) return rows;
          const next = [...rows];
          next[idx] = { ...next[idx], ...req };
          return next;
        });
      };
      socket.on('request:updated', onUpdate);
      detach = () => {
        socket.off('request:updated', onUpdate);
      };
    })();
    return () => detach();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const cancelRequest = useCallback(
    (id) => {
      Alert.alert('Cancel booking', 'Are you sure you want to cancel this request?', [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/requests/${id}/cancel`);
              load();
            } catch (err) {
              Alert.alert('Error', apiErrorMessage(err, 'Could not cancel.'));
            }
          },
        },
      ]);
    },
    [load]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>My bookings</Text>
      <FlatList
        data={requests}
        keyExtractor={(item) => String(item._id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        ListEmptyComponent={
          error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="calendar-outline" size={40} color={colors.muted} />
              <Text style={styles.empty}>No bookings yet.</Text>
              <Text style={styles.emptySub}>Book a service from the Home tab to get started.</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status] || STATUS_META.pending;
          const fee = formatMoney(item.feeAmount);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.service}>{caregiverServiceLabel(item.serviceType)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>

              {item.nurse?.name ? (
                <Text style={styles.row}>
                  <Ionicons name="person" size={12} color={colors.muted} /> {item.nurse.name}
                </Text>
              ) : null}
              {item.location?.address ? (
                <Text style={styles.row} numberOfLines={1}>
                  <Ionicons name="location" size={12} color={colors.muted} /> {item.location.address}
                </Text>
              ) : null}
              <Text style={styles.row}>
                <Ionicons name="time" size={12} color={colors.muted} />{' '}
                {formatDate(item.scheduledAt || item.createdAt)}
              </Text>

              <View style={styles.cardBottom}>
                {fee ? <Text style={styles.fee}>{fee}</Text> : <View />}
                <View style={styles.actions}>
                  {TRACKABLE.includes(item.status) && item.nurse ? (
                    <Pressable
                      onPress={() => router.push(`/(app)/track/${item._id}`)}
                      style={styles.trackBtn}
                    >
                      <Ionicons name="navigate" size={14} color={colors.white} />
                      <Text style={styles.trackBtnText}>Track on map</Text>
                    </Pressable>
                  ) : null}
                  {CANCELABLE.includes(item.status) ? (
                    <Pressable onPress={() => cancelRequest(item._id)} hitSlop={6}>
                      <Text style={styles.cancel}>Cancel</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  service: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  row: { fontSize: fontSize.sm, color: colors.muted },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  fee: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  trackBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.xs },
  cancel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.danger },
  error: { color: colors.danger, textAlign: 'center', paddingVertical: spacing.xxl },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  empty: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: fontSize.sm, color: colors.muted, textAlign: 'center' },
});
