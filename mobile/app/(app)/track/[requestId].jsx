/**
 * Live visit tracking — Zomato-style map after caregiver is on the way.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { caregiverServiceLabel } from '@nursecare/shared';
import LiveTrackingMap from '../../../src/components/LiveTrackingMap';
import { api, apiErrorMessage } from '../../../src/api/client';
import { formatEta, getRoute, haversineKm } from '../../../src/lib/route';
import { connectSocket, getSocket } from '../../../src/lib/socket';
import { colors, fontSize, radius, spacing } from '../../../src/theme/theme';

const TRACKING_STATUSES = ['on_the_way', 'in_progress'];

const STATUS_LABEL = {
  on_the_way: 'On the way to you',
  in_progress: 'Visit in progress',
};

export default function TrackVisitScreen() {
  const router = useRouter();
  const { requestId } = useLocalSearchParams();
  const id = String(requestId || '');

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nurseCoords, setNurseCoords] = useState(null);
  const [route, setRoute] = useState(null);

  const loadRequest = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/requests/mine', { params: { _ts: Date.now() } });
      const found = (data.requests || []).find((r) => String(r._id) === id);
      if (!found) {
        setError('Booking not found.');
        setRequest(null);
        return;
      }
      setRequest(found);
      const initial =
        found.nurse?.location?.coordinates ||
        (Number.isFinite(found.nurse?.lng) ? [found.nurse.lng, found.nurse.lat] : null);
      if (initial) setNurseCoords(initial);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load booking.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  useEffect(() => {
    if (!request || !TRACKING_STATUSES.includes(request.status)) return undefined;

    let mounted = true;
    let detach = () => {};

    (async () => {
      const socket = await connectSocket();
      if (!socket || !mounted) return;
      socket.emit('request:join', request._id);

      const onNurseLoc = ({ coordinates }) => {
        if (Array.isArray(coordinates) && coordinates.length === 2) {
          setNurseCoords(coordinates);
        }
      };
      const onUpdate = (req) => {
        if (req?._id !== request._id) return;
        setRequest(req);
      };

      socket.on('nurse:location', onNurseLoc);
      socket.on('request:updated', onUpdate);
      detach = () => {
        socket.off('nurse:location', onNurseLoc);
        socket.off('request:updated', onUpdate);
      };
    })();

    return () => {
      mounted = false;
      detach();
    };
  }, [request?._id, request?.status]);

  const patientCoords = request?.location?.coordinates;

  useEffect(() => {
    if (!nurseCoords || !patientCoords) {
      setRoute(null);
      return;
    }
    let cancelled = false;
    getRoute(nurseCoords, patientCoords).then((r) => {
      if (!cancelled) setRoute(r);
    });
    return () => {
      cancelled = true;
    };
  }, [nurseCoords, patientCoords]);

  const distanceKm = useMemo(() => {
    if (route?.distanceKm != null) return route.distanceKm;
    if (nurseCoords && patientCoords) return haversineKm(nurseCoords, patientCoords);
    return null;
  }, [route, nurseCoords, patientCoords]);

  const etaLabel = route?.durationMin != null ? formatEta(route.durationMin) : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !request) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Live tracking</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.error}>{error || 'Booking not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!TRACKING_STATUSES.includes(request.status)) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Live tracking</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.error}>
            Live map is available once your caregiver is on the way. Current status:{' '}
            {request.status.replace(/_/g, ' ')}.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Live tracking</Text>
        <Pressable onPress={loadRequest} hitSlop={10}>
          <Ionicons name="refresh" size={20} color={colors.brand} />
        </Pressable>
      </View>

      <View style={styles.mapArea}>
        <LiveTrackingMap
          patientCoords={patientCoords}
          nurseCoords={nurseCoords}
          routeCoords={route?.coords}
          status={request.status}
        />
      </View>

      <View style={styles.sheet}>
        <Text style={styles.sheetLabel}>Caregiver en route</Text>
        <Text style={styles.sheetTitle}>{request.nurse?.name || 'Your caregiver'}</Text>
        <Text style={styles.sheetService}>{caregiverServiceLabel(request.serviceType)}</Text>
        <Text style={styles.sheetStatus}>{STATUS_LABEL[request.status] || request.status}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {distanceKm != null ? `${distanceKm.toFixed(1)} km` : '—'}
            </Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{etaLabel || '—'}</Text>
            <Text style={styles.statLabel}>ETA</Text>
          </View>
        </View>

        {request.location?.address ? (
          <Text style={styles.address} numberOfLines={2}>
            Delivering to: {request.location.address}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  mapArea: { flex: 1, minHeight: 300 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand,
    textTransform: 'uppercase',
  },
  sheetTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  sheetService: { fontSize: fontSize.sm, color: colors.muted },
  sheetStatus: { fontSize: fontSize.md, fontWeight: '700', color: colors.success, marginTop: spacing.xs },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  address: { fontSize: fontSize.sm, color: colors.muted, marginTop: spacing.sm, lineHeight: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  error: { color: colors.danger, textAlign: 'center', lineHeight: 20 },
});
