import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import RequestStatusBadge from '../../src/components/RequestStatusBadge';
import AdminScreenHeader from '../../src/components/AdminScreenHeader';
import SelectField from '../../src/components/SelectField';
import { api, apiErrorMessage } from '../../src/api/client';
import { fmtDate, fmtInr, serviceLabel } from '../../src/lib/adminFormat';
import { connectSocket, getSocket } from '../../src/lib/socket';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All statuses' },
  { id: 'pending', label: 'Pending' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'on_the_way', label: 'On the way' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const LOG_TYPE_OPTIONS = [
  { id: 'bookings', label: 'All bookings' },
  { id: 'revenue', label: 'Paid / revenue' },
];

function sortNewest(rows, dateKey = 'createdAt') {
  return [...rows].sort((a, b) => new Date(b[dateKey] || 0) - new Date(a[dateKey] || 0));
}

function LogCard({ row, logType }) {
  const isRevenue = logType === 'revenue';
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardMain}>
          <Text style={styles.service}>{serviceLabel(row.serviceType)}</Text>
          <Text style={styles.line}>
            {row.user?.name || 'Patient'}
            {row.user?.phone ? ` · ${row.user.phone}` : ''}
          </Text>
          <Text style={styles.line}>
            Caregiver: {row.nurse?.name || 'unassigned'}
            {row.nurse?.phone ? ` · ${row.nurse.phone}` : ''}
          </Text>
          <Text style={styles.address}>{row.location?.address || 'No address saved'}</Text>
          {isRevenue ? (
            <Text style={styles.fee}>Paid {fmtInr(row.feeAmount)}</Text>
          ) : row.feeAmount ? (
            <Text style={styles.feeMuted}>Quoted {fmtInr(row.feeAmount)}</Text>
          ) : null}
        </View>
        <RequestStatusBadge status={row.status} />
      </View>
      <Text style={styles.when}>
        {isRevenue && row.paidAt ? `Paid ${fmtDate(row.paidAt)} · ` : ''}
        Created {fmtDate(row.createdAt)}
      </Text>
    </View>
  );
}

export default function AdminActivityScreen() {
  const [logType, setLogType] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [bookingsRes, revenueRes] = await Promise.all([
      api.get('/requests/admin/all'),
      api.get('/requests/admin/paid'),
    ]);
    setBookings(sortNewest(bookingsRes.data.requests || []));
    setRevenue(sortNewest(revenueRes.data.requests || [], 'paidAt'));
    setError('');
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load logs'));
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not load logs'));
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  useEffect(() => {
    connectSocket().catch(() => {});
    const socket = getSocket();
    if (!socket) return undefined;
    const onActivity = () => load().catch(() => {});
    socket.on('activity:new', onActivity);
    return () => socket.off('activity:new', onActivity);
  }, [load]);

  const sourceRows = logType === 'revenue' ? revenue : bookings;

  const filtered = useMemo(() => {
    let rows = sourceRows;
    if (logType === 'bookings' && filter !== 'all') {
      rows = rows.filter((r) => r.status === filter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = [
        r.user?.name,
        r.user?.email,
        r.user?.phone,
        r.nurse?.name,
        r.location?.address,
        serviceLabel(r.serviceType),
        r.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sourceRows, logType, filter, search]);

  const listHeader = (
    <View style={styles.headerBlock}>
      <SelectField label="Log type" value={logType} options={LOG_TYPE_OPTIONS} onChange={setLogType} />
      {logType === 'bookings' ? (
        <SelectField label="Status filter" value={filter} options={FILTER_OPTIONS} onChange={setFilter} />
      ) : null}
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search patient, caregiver, address…"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.count}>
        Showing {filtered.length} of {sourceRows.length} {logType === 'revenue' ? 'paid bookings' : 'bookings'}
      </Text>
    </View>
  );

  return (
    <View style={styles.safe}>
      <AdminScreenHeader
        title="Logs"
        subtitle="All booking activity and paid revenue records."
      />

      {loading ? (
        <ActivityIndicator color={colors.brand} style={styles.loader} />
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={refresh} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id || String(item.id)}
          renderItem={({ item }) => <LogCard row={item} logType={logType} />}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={<Text style={styles.empty}>No logs match your filters.</Text>}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          initialNumToRender={12}
          maxToRenderPerBatch={16}
          windowSize={8}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  headerBlock: { gap: spacing.md, marginBottom: spacing.sm },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  count: { fontSize: fontSize.xs, color: colors.muted, fontWeight: '600' },
  loader: { marginTop: spacing.xxl },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  error: { color: colors.danger, fontWeight: '600', textAlign: 'center' },
  retryBtn: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryText: { color: colors.brand, fontWeight: '800' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  cardMain: { flex: 1 },
  service: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, textTransform: 'capitalize' },
  line: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  address: { fontSize: fontSize.xs, color: colors.muted, marginTop: 6, lineHeight: 18 },
  fee: { fontSize: fontSize.sm, fontWeight: '800', color: '#7c3aed', marginTop: 6 },
  feeMuted: { fontSize: fontSize.xs, color: colors.muted, marginTop: 4 },
  when: { fontSize: fontSize.xs, color: colors.muted },
});
