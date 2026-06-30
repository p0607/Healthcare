import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { caregiverServiceLabel, resolveCaregiverGpsCoordinates } from '@nursecare/shared';
import { useAuth } from '../../src/context/AuthContext';
import { api, apiErrorMessage } from '../../src/api/client';
import CaregiverScreenHeader from '../../src/components/CaregiverScreenHeader';
import {
  coordsChangedEnough,
  getDeviceCoordinates,
  isDefaultSeedLocation,
} from '../../src/lib/deviceLocation';
import { areaLabelFromAddress } from '../../src/lib/areaLabel';
import { startCaregiverLocationBroadcast } from '../../src/lib/caregiverLocationBroadcast';
import { connectSocket } from '../../src/lib/socket';
import { sendVisitOtp, verifyVisitOtp, VISIT_OTP_COPY } from '../../src/lib/visitOtp';
import VisitOtpModal from '../../src/components/VisitOtpModal';
import { saveCachedUser } from '../../src/storage/session';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

const AUTO_SYNC_COOLDOWN_MS = 120_000;

const STATUS_META = {
  pending: { label: 'Pending', color: '#d97706', bg: '#fef3c7' },
  accepted: { label: 'Accepted', color: '#0784cf', bg: '#e6f4fd' },
  on_the_way: { label: 'On the way', color: '#7c3aed', bg: '#ede9fe' },
  in_progress: { label: 'In progress', color: '#0784cf', bg: '#e6f4fd' },
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
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export default function CaregiverHomeScreen() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;
  const lastAutoSyncRef = useRef(0);
  const syncingRef = useRef(false);

  const [syncingLocation, setSyncingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [assignedRequests, setAssignedRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [refreshingRequests, setRefreshingRequests] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const assignedRequestsRef = useRef([]);
  assignedRequestsRef.current = assignedRequests;
  const [otpModal, setOtpModal] = useState(null);
  const [otpValue, setOtpValue] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [earningsSummary, setEarningsSummary] = useState({
    completedCount: 0,
    totalReceived: 0,
  });
  const [recentServices, setRecentServices] = useState([]);

  const syncLocation = useCallback(
    async ({ notify = false, force = false } = {}) => {
      if (syncingRef.current) return false;
      syncingRef.current = true;
      setLocationError('');
      setSyncingLocation(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          const msg = 'Allow location access so patients near you can find you.';
          setLocationError(msg);
          if (notify) Alert.alert('Permission needed', msg);
          return false;
        }
        const pos = await getDeviceCoordinates({ demoFallback: true });
        let lng = pos.coords.longitude;
        let lat = pos.coords.latitude;

        const saved = userRef.current?.location?.coordinates;
        const stillOnSeed = isDefaultSeedLocation(userRef.current);
        const resolved = resolveCaregiverGpsCoordinates(saved, lng, lat);
        if (!resolved) {
          const msg = 'Location change is too large. Move closer or refresh from your current area.';
          setLocationError(msg);
          if (notify) Alert.alert('Location not updated', msg);
          return false;
        }
        lng = resolved.lng;
        lat = resolved.lat;
        const usedDemoFallback = resolved.usedDemoFallback;

        if (!force && !stillOnSeed && !usedDemoFallback && !coordsChangedEnough(saved, lng, lat)) {
          return true;
        }

        const { data } = await api.patch('/nurses/me/location', {
          location: { coordinates: [lng, lat] },
        });
        if (data?.user) {
          await saveCachedUser(data.user);
          setUser(data.user);
        }
        if (notify) {
          Alert.alert(
            usedDemoFallback ? 'Demo location applied' : 'Location updated',
            usedDemoFallback
              ? 'Emulator GPS was invalid, so we saved Bengaluru demo coordinates. Patients nearby can find you.'
              : 'Your coordinates are saved. Patients near you can now find you.'
          );
        }
        return true;
      } catch (err) {
        const msg = apiErrorMessage(err, 'Could not update location.');
        setLocationError(msg);
        if (notify || force) Alert.alert('Error', msg);
        return false;
      } finally {
        syncingRef.current = false;
        setSyncingLocation(false);
      }
    },
    [setUser]
  );

  const setAvailable = async (available) => {
    try {
      if (available) {
        const synced = await syncLocation({ notify: false, force: true });
        if (!synced) {
          Alert.alert(
            'Location required',
            'Allow location access so we can save your position. On emulators we use Bengaluru demo coordinates automatically.'
          );
          return;
        }
      }
      const { data } = await api.put('/nurses/me', { available });
      if (data?.user) {
        await saveCachedUser(data.user);
        setUser(data.user);
      }
      Alert.alert(
        available ? 'You are online' : 'You are offline',
        available
          ? 'Patients within 25 km of your GPS can now book you.'
          : 'You will not appear in nearby lists.'
      );
    } catch (err) {
      Alert.alert('Error', apiErrorMessage(err, 'Could not update availability.'));
    }
  };

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const stillOnSeed = isDefaultSeedLocation(userRef.current);
      if (!stillOnSeed && now - lastAutoSyncRef.current < AUTO_SYNC_COOLDOWN_MS) return;
      lastAutoSyncRef.current = now;
      syncLocation({ notify: false, force: stillOnSeed });
    }, [syncLocation])
  );

  const loadVisitRequests = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingRequests(true);
    try {
      const [{ data: pendingData }, { data: assignedData }, { data: paymentsData }] = await Promise.all([
        api.get('/requests/pending', { params: { _ts: Date.now() } }),
        api.get('/requests/assigned', { params: { _ts: Date.now() } }),
        api.get('/nurses/me/payments', { params: { _ts: Date.now() } }),
      ]);
      setPendingRequests(pendingData?.requests || []);
      setAssignedRequests(assignedData?.requests || []);
      setEarningsSummary({
        completedCount: paymentsData?.summary?.completedCount || 0,
        totalReceived: paymentsData?.summary?.totalReceived || 0,
      });
      const completed = (paymentsData?.transactions || [])
        .filter((r) => r.status === 'completed')
        .sort(
          (a, b) =>
            new Date(b.completedAt || b.paidAt || 0).getTime() -
            new Date(a.completedAt || a.paidAt || 0).getTime()
        )
        .slice(0, 3);
      setRecentServices(completed);
    } catch (err) {
      if (!silent) {
        Alert.alert('Error', apiErrorMessage(err, 'Could not load dashboard.'));
      }
    } finally {
      setLoadingRequests(false);
      setRefreshingRequests(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVisitRequests();
    }, [loadVisitRequests])
  );

  const visitRequests = useMemo(() => {
    const seen = new Set();
    const rows = [];
    for (const r of pendingRequests) {
      if (seen.has(r._id)) continue;
      seen.add(r._id);
      rows.push(r);
    }
    for (const r of assignedRequests) {
      if (['completed', 'cancelled'].includes(r.status)) continue;
      if (seen.has(r._id)) continue;
      seen.add(r._id);
      rows.push(r);
    }
    return rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [pendingRequests, assignedRequests]);

  const acceptRequest = async (id) => {
    setAcceptingId(id);
    try {
      await api.post(`/requests/${id}/accept`);
      const socket = await connectSocket();
      socket?.emit('request:join', id);
      Alert.alert('Request accepted', 'You are on the way to the patient. Live location is now shared.');
      await loadVisitRequests({ silent: true });
    } catch (err) {
      Alert.alert('Error', apiErrorMessage(err, 'Could not accept request.'));
    } finally {
      setAcceptingId(null);
    }
  };

  useEffect(() => {
    const hasActive = assignedRequests.some((r) => ['on_the_way', 'in_progress'].includes(r.status));
    if (!hasActive) return undefined;
    connectSocket().catch(() => {});
    return startCaregiverLocationBroadcast({
      enabled: true,
      getActiveRequests: () => assignedRequestsRef.current,
      getSavedCoordinates: () => userRef.current?.location?.coordinates,
    });
  }, [assignedRequests]);

  const beginVisitOtp = async (requestId, purpose) => {
    setOtpBusy(true);
    try {
      await sendVisitOtp(requestId, purpose);
      setOtpModal({ requestId, purpose });
      setOtpValue('');
    } catch (err) {
      Alert.alert('Error', apiErrorMessage(err, 'Could not send OTP.'));
    } finally {
      setOtpBusy(false);
    }
  };

  const submitVisitOtp = async () => {
    if (!otpModal?.requestId || !otpValue.trim()) return;
    setOtpBusy(true);
    try {
      await verifyVisitOtp(otpModal.requestId, otpModal.purpose, otpValue);
      const copy = VISIT_OTP_COPY[otpModal.purpose];
      setOtpModal(null);
      setOtpValue('');
      Alert.alert('Done', copy?.success || 'Visit updated.');
      await loadVisitRequests({ silent: true });
    } catch (err) {
      Alert.alert('Error', apiErrorMessage(err, 'OTP verification failed.'));
    } finally {
      setOtpBusy(false);
    }
  };

  const serviceAreaLabel = useMemo(
    () => areaLabelFromAddress(user?.location?.address),
    [user?.location?.address]
  );

  const closeOtpModal = () => {
    if (otpBusy) return;
    setOtpModal(null);
    setOtpValue('');
  };

  return (
    <View style={styles.safe}>
      <CaregiverScreenHeader title="Dashboard" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshingRequests}
            onRefresh={() => {
              setRefreshingRequests(true);
              loadVisitRequests({ silent: true });
            }}
            tintColor={colors.brand}
          />
        }
      >
        <View style={styles.card}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statGreen]}>
              <Text style={styles.statLabel}>Completed jobs</Text>
              <Text style={styles.statValue}>{earningsSummary.completedCount}</Text>
            </View>
            <View style={[styles.statCard, styles.statBrand]}>
              <Text style={styles.statLabel}>Amount earned</Text>
              <Text style={styles.statValue}>{fmtInr(earningsSummary.totalReceived)}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionBtn, styles.refreshBtn, syncingLocation && styles.actionBtnDisabled]}
              onPress={async () => {
                await syncLocation({ notify: true, force: true });
                loadVisitRequests({ silent: true });
              }}
              disabled={syncingLocation}
            >
              {syncingLocation ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color={colors.white} />
                  <Text style={styles.actionBtnText}>Refresh</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.onlineBtn, user?.available && styles.actionBtnActive]}
              onPress={() => setAvailable(true)}
            >
              <Text style={[styles.onlineText, user?.available && styles.actionBtnTextActive]}>Online</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.offlineBtn, user?.available === false && styles.offlineBtnActive]}
              onPress={() => setAvailable(false)}
            >
              <Text style={[styles.offlineText, user?.available === false && styles.offlineTextActive]}>Offline</Text>
            </Pressable>
          </View>

          <View style={styles.areaRow}>
            <Ionicons name="location" size={14} color={colors.brand} />
            <Text style={styles.areaText}>
              Service area: <Text style={styles.areaName}>{serviceAreaLabel}</Text>
            </Text>
          </View>

          {isDefaultSeedLocation(user) ? (
            <Text style={styles.seedWarn}>Default location — tap Refresh before going online.</Text>
          ) : null}
          {locationError ? <Text style={styles.locError}>{locationError}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Visit requests</Text>

          {loadingRequests && visitRequests.length === 0 ? (
            <ActivityIndicator color={colors.brand} style={styles.requestLoader} />
          ) : visitRequests.length === 0 ? (
            <Text style={styles.emptyRequests}>No active visit requests yet.</Text>
          ) : (
            visitRequests.map((req) => {
              const meta = STATUS_META[req.status] || STATUS_META.pending;
              const isPending = req.status === 'pending';
              const canStart = ['on_the_way', 'accepted'].includes(req.status);
              const canEnd = req.status === 'in_progress';
              return (
                <View key={req._id} style={styles.requestCard}>
                  <View style={styles.requestTop}>
                    <Text style={styles.requestService}>{caregiverServiceLabel(req.serviceType)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.requestPatient}>{req.user?.name || 'Patient'}</Text>
                  {req.location?.address ? (
                    <Text style={styles.requestMeta} numberOfLines={2}>
                      {req.location.address}
                    </Text>
                  ) : null}
                  <Text style={styles.requestMeta}>
                    {fmtWhen(req.createdAt)}
                    {req.feeAmount != null ? ` · ${fmtInr(req.feeAmount)}` : ''}
                  </Text>

                  <View style={styles.requestActions}>
                    {isPending ? (
                      <Pressable
                        style={[styles.acceptBtn, acceptingId === req._id && styles.gpsBtnDisabled]}
                        onPress={() => acceptRequest(req._id)}
                        disabled={acceptingId === req._id}
                      >
                        {acceptingId === req._id ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Text style={styles.acceptBtnText}>Accept & go</Text>
                        )}
                      </Pressable>
                    ) : null}
                    {canStart ? (
                      <Pressable
                        style={styles.startVisitBtn}
                        onPress={() => beginVisitOtp(req._id, 'start_visit')}
                        disabled={otpBusy}
                      >
                        <Ionicons name="play-circle" size={16} color={colors.white} />
                        <Text style={styles.startVisitText}>Start visit</Text>
                      </Pressable>
                    ) : null}
                    {canEnd ? (
                      <Pressable
                        style={styles.endVisitBtn}
                        onPress={() => beginVisitOtp(req._id, 'complete_visit')}
                        disabled={otpBusy}
                      >
                        <Ionicons name="checkmark-circle" size={16} color={colors.white} />
                        <Text style={styles.endVisitText}>End service</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Recent services</Text>
            <Pressable onPress={() => router.push('/(caregiver)/bookings')} hitSlop={8}>
              <Text style={styles.viewAll}>View all</Text>
            </Pressable>
          </View>

          {recentServices.length === 0 ? (
            <Text style={styles.emptyRequests}>No completed services yet.</Text>
          ) : (
            recentServices.map((req, index) => (
              <View
                key={req._id}
                style={[styles.recentRow, index === 0 && styles.recentRowFirst]}
              >
                <View style={styles.recentMain}>
                  <Text style={styles.recentService}>{caregiverServiceLabel(req.serviceType)}</Text>
                  <Text style={styles.recentMeta}>
                    {req.user?.name || 'Patient'}
                    {req.completedAt || req.paidAt
                      ? ` · ${fmtWhen(req.completedAt || req.paidAt)}`
                      : ''}
                  </Text>
                </View>
                <Text style={styles.recentAmount}>{fmtInr(req.feeAmount)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <VisitOtpModal
        visible={Boolean(otpModal)}
        title={otpModal ? VISIT_OTP_COPY[otpModal.purpose]?.title : ''}
        hint={otpModal ? VISIT_OTP_COPY[otpModal.purpose]?.hint : ''}
        value={otpValue}
        onChangeValue={setOtpValue}
        onConfirm={submitVisitOtp}
        onCancel={closeOtpModal}
        busy={otpBusy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  viewAll: { fontSize: fontSize.sm, fontWeight: '700', color: colors.brand },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    gap: 4,
  },
  statGreen: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  statBrand: { backgroundColor: '#e6f4fd', borderColor: '#bae6fd' },
  statLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
  },
  statValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  actionBtnDisabled: { opacity: 0.6 },
  refreshBtn: { backgroundColor: colors.brand },
  actionBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  onlineBtn: { backgroundColor: '#e6f4fd', borderWidth: 1.5, borderColor: colors.success },
  onlineText: { color: colors.success, fontWeight: '700', fontSize: fontSize.sm },
  actionBtnActive: { backgroundColor: colors.success, borderColor: colors.success },
  actionBtnTextActive: { color: colors.white },
  offlineBtn: { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border },
  offlineText: { color: colors.text, fontWeight: '700', fontSize: fontSize.sm },
  offlineBtnActive: { backgroundColor: colors.text, borderColor: colors.text },
  offlineTextActive: { color: colors.white },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  areaText: { fontSize: fontSize.xs, color: colors.muted, textAlign: 'center' },
  areaName: { fontWeight: '700', color: colors.text },
  locError: { fontSize: fontSize.xs, color: colors.danger, lineHeight: 18, textAlign: 'center' },
  seedWarn: { fontSize: fontSize.xs, color: colors.danger, lineHeight: 18, fontWeight: '600', textAlign: 'center' },
  gpsBtnDisabled: { opacity: 0.6 },
  requestLoader: { marginVertical: spacing.md },
  emptyRequests: { fontSize: fontSize.sm, color: colors.muted, marginTop: spacing.xs },
  requestCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.background,
  },
  requestTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  requestService: { flex: 1, fontSize: fontSize.sm, fontWeight: '800', color: colors.text },
  statusBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '800' },
  requestPatient: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  requestMeta: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 16 },
  requestActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  acceptBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minWidth: 110,
    alignItems: 'center',
  },
  acceptBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  startVisitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  startVisitText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  endVisitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7c3aed',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  endVisitText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  recentRowFirst: { borderTopWidth: 0, paddingTop: 0, marginTop: 0 },
  recentMain: { flex: 1, gap: 2 },
  recentService: { fontSize: fontSize.sm, fontWeight: '800', color: colors.text },
  recentMeta: { fontSize: fontSize.xs, color: colors.muted },
  recentAmount: { fontSize: fontSize.sm, fontWeight: '800', color: colors.text },
});
