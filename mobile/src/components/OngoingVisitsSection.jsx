import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { caregiverServiceLabel } from '@nursecare/shared';
import { api } from '../api/client';
import { connectSocket } from '../lib/socket';
import { colors, fontSize, radius, spacing } from '../theme/theme';

const ONGOING_STATUSES = ['pending', 'accepted', 'on_the_way', 'in_progress'];
const TRACKABLE = ['on_the_way', 'in_progress'];

const STATUS_META = {
  pending: { label: 'Pending', color: '#d97706', bg: '#fef3c7' },
  accepted: { label: 'Accepted', color: '#0784cf', bg: '#e6f4fd' },
  on_the_way: { label: 'On the way', color: '#7c3aed', bg: '#ede9fe' },
  in_progress: { label: 'In progress', color: '#0784cf', bg: '#e6f4fd' },
};

function isOngoing(req) {
  return req && ONGOING_STATUSES.includes(req.status);
}

/** Active visit summary for the patient home screen. */
export default function OngoingVisitsSection() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/requests/mine', { params: { _ts: Date.now() } });
      setRequests(data.requests || []);
    } catch {
      /* keep previous list if refresh fails */
    } finally {
      setLoading(false);
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
          if (idx === -1) {
            if (!isOngoing(req)) return rows;
            return [req, ...rows];
          }
          if (!isOngoing(req)) {
            return rows.filter((r) => r._id !== req._id);
          }
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
        .filter(isOngoing)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [requests]
  );

  if (loading && ongoing.length === 0) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator color={colors.brand} size="small" />
      </View>
    );
  }

  if (ongoing.length === 0) return null;

  const featured = ongoing[0];
  const meta = STATUS_META[featured.status] || STATUS_META.pending;
  const canTrack = TRACKABLE.includes(featured.status) && featured.nurse;

  const openFeatured = () => {
    if (canTrack) {
      router.push(`/(app)/track/${featured._id}`);
      return;
    }
    router.push('/(app)/bookings');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Ongoing visit{ongoing.length > 1 ? 's' : ''}</Text>
        {ongoing.length > 1 ? (
          <Pressable onPress={() => router.push('/(app)/ongoing')} hitSlop={8}>
            <Text style={styles.viewAll}>View all ({ongoing.length})</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable style={styles.card} onPress={openFeatured}>
        <View style={styles.cardTop}>
          <View style={styles.iconWrap}>
            <Ionicons name="medkit" size={18} color={colors.brand} />
          </View>
          <View style={styles.cardMain}>
            <Text style={styles.service}>{caregiverServiceLabel(featured.serviceType)}</Text>
            <Text style={styles.caregiver}>
              {featured.nurse?.name ? `With ${featured.nurse.name}` : 'Waiting for caregiver'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        {canTrack ? (
          <View style={styles.trackRow}>
            <Ionicons name="navigate" size={14} color={colors.brand} />
            <Text style={styles.trackText}>Tap to track on map</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg, gap: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  viewAll: { fontSize: fontSize.sm, fontWeight: '700', color: colors.brand },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMain: { flex: 1, gap: 2 },
  service: { fontSize: fontSize.sm, fontWeight: '800', color: colors.text },
  caregiver: { fontSize: fontSize.xs, color: colors.muted },
  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trackText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.brand },
});
