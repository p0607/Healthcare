import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

const ONGOING_STATUSES = ['pending', 'accepted', 'on_the_way', 'in_progress'];
const TRACKABLE = ['on_the_way', 'in_progress'];

const STATUS_META = {
  pending: { label: 'Pending', color: '#d97706', bg: '#fef3c7' },
  accepted: { label: 'Accepted', color: '#0784cf', bg: '#e6f4fd' },
  on_the_way: { label: 'On the way', color: '#7c3aed', bg: '#ede9fe' },
  in_progress: { label: 'In progress', color: '#0784cf', bg: '#e6f4fd' },
};

const fmtWhen = (value) => {
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

export default function OngoingVisitsScreen() {
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
      setError(apiErrorMessage(err, 'Could not load ongoing visits.'));
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
          if (idx === -1) return [req, ...rows];
          const next = [...rows];
          next[idx] = { ...next[idx], ...req };
          return next;
        });
      };
      socket.on('request:updated', onUpdate);
      detach = () => socket.off('request:updated', onUpdate);
    })();
    return () => detach();
  }, []);

  const ongoing = useMemo(
    () =>
      requests
        .filter((r) => ONGOING_STATUSES.includes(r.status))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [requests]
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Ongoing visits</Text>
          <Text style={styles.subtitle}>{ongoing.length} active</Text>
        </View>
      </View>

      {loading && ongoing.length === 0 ? (
        <ActivityIndicator color={colors.brand} style={styles.loader} />
      ) : (
        <FlatList
          data={ongoing}
          keyExtractor={(item) => String(item._id)}
          contentContainerStyle={styles.list}
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
          ListEmptyComponent={
            error ? (
              <Text style={styles.error}>{error}</Text>
            ) : (
              <Text style={styles.empty}>No ongoing visits right now.</Text>
            )
          }
          renderItem={({ item }) => {
            const meta = STATUS_META[item.status] || STATUS_META.pending;
            const canTrack = TRACKABLE.includes(item.status) && item.nurse;
            return (
              <Pressable
                style={styles.card}
                onPress={() => {
                  if (canTrack) router.push(`/(app)/track/${item._id}`);
                }}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.service}>{caregiverServiceLabel(item.serviceType)}</Text>
                  <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
                <Text style={styles.caregiver}>
                  {item.nurse?.name ? `Caregiver: ${item.nurse.name}` : 'Waiting for caregiver assignment'}
                </Text>
                <Text style={styles.meta}>{fmtWhen(item.scheduledAt || item.createdAt)}</Text>
                {canTrack ? (
                  <View style={styles.trackRow}>
                    <Ionicons name="navigate" size={14} color={colors.brand} />
                    <Text style={styles.trackText}>Track on map</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs },
  headerText: { flex: 1 },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  loader: { marginTop: spacing.xxl },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  service: { flex: 1, fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  caregiver: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  meta: { fontSize: fontSize.xs, color: colors.muted },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  trackText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.brand },
  empty: { textAlign: 'center', color: colors.muted, paddingVertical: spacing.xxl },
  error: { textAlign: 'center', color: colors.danger, paddingVertical: spacing.xxl },
});
