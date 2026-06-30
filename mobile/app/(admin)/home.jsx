import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminHasPermission, isSuperAdminUser } from '@nursecare/shared/adminPermissions';
import AdminScreenHeader from '../../src/components/AdminScreenHeader';
import { useAuth } from '../../src/context/AuthContext';
import { api, apiErrorMessage } from '../../src/api/client';
import { fmtInr } from '../../src/lib/adminFormat';
import { connectSocket, getSocket } from '../../src/lib/socket';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

const MENU = [
  {
    id: 'activity',
    title: 'Logs',
    desc: 'All bookings & revenue',
    icon: 'pulse',
    href: '/(admin)/activity',
    permission: 'requests.read',
  },
  {
    id: 'users',
    title: 'Users',
    desc: 'Patients & caregivers',
    icon: 'people',
    href: '/(admin)/users',
    permission: 'users.read',
  },
  {
    id: 'services',
    title: 'Services catalog',
    desc: 'Sections & sub-services',
    icon: 'layers',
    href: '/(admin)/services',
    permission: 'catalog.read',
  },
  {
    id: 'visit-options',
    title: 'Visit options',
    desc: 'Patient booking list',
    icon: 'list',
    href: '/(admin)/visit-options',
    permission: 'catalog.read',
  },
  {
    id: 'team',
    title: 'Admin team',
    desc: 'Provision admins',
    icon: 'shield',
    href: '/(admin)/team',
    superAdminOnly: true,
  },
];

function StatCard({ label, value, color, onPress }) {
  return (
    <Pressable style={({ pressed }) => [styles.statCard, pressed && styles.pressed]} onPress={onPress}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </Pressable>
  );
}

export default function AdminHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const superAdmin = isSuperAdminUser(user);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const visibleMenu = useMemo(
    () =>
      MENU.filter((item) => {
        if (item.superAdminOnly) return superAdmin;
        if (!item.permission) return true;
        return adminHasPermission(user, item.permission);
      }),
    [user, superAdmin]
  );

  const loadStats = useCallback(async () => {
    if (!adminHasPermission(user, 'stats.read')) {
      setStats(null);
      return;
    }
    const { data } = await api.get('/requests/admin/stats');
    setStats(data.counts);
  }, [user]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadStats();
    } catch (err) {
      Alert.alert('Could not refresh', apiErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  }, [loadStats]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadStats();
      } catch (err) {
        if (!cancelled) Alert.alert('Dashboard error', apiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStats]);

  useEffect(() => {
    connectSocket().catch(() => {});
    const socket = getSocket();
    if (!socket) return undefined;
    const onActivity = () => loadStats().catch(() => {});
    socket.on('activity:new', onActivity);
    return () => socket.off('activity:new', onActivity);
  }, [loadStats]);

  const onLogout = () => {
    Alert.alert('Log out', 'Sign out of admin?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/landing');
        },
      },
    ]);
  };

  const logoutBtn = (
    <Pressable onPress={onLogout} style={styles.logoutBtn}>
      <Text style={styles.logoutText}>Logout</Text>
    </Pressable>
  );

  return (
    <View style={styles.safe}>
      <AdminScreenHeader
        title="Control center"
        subtitle="Manage bookings, users, and catalog from mobile."
        showBack={false}
        right={logoutBtn}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading ? (
          <ActivityIndicator color={colors.brand} style={styles.loader} />
        ) : stats ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
            <StatCard
              label="Patients"
              value={String(stats.users ?? 0)}
              color={colors.brand}
              onPress={() => router.push('/(admin)/users')}
            />
            <StatCard
              label="Caregivers"
              value={String(stats.nurses ?? 0)}
              color="#059669"
              onPress={() => router.push('/(admin)/users')}
            />
            <StatCard
              label="Active"
              value={String(stats.active ?? 0)}
              color="#d97706"
              onPress={() => router.push('/(admin)/activity')}
            />
            <StatCard
              label="Completed"
              value={String(stats.completed ?? 0)}
              color="#059669"
              onPress={() => router.push('/(admin)/activity')}
            />
            <StatCard
              label="Revenue"
              value={fmtInr(stats.revenueTotal ?? 0)}
              color="#7c3aed"
              onPress={() => router.push('/(admin)/activity')}
            />
          </ScrollView>
        ) : null}

        <Text style={styles.sectionTitle}>Admin tools</Text>
        <View style={styles.menuGrid}>
          {visibleMenu.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.menuCard, pressed && styles.pressed]}
              onPress={() => router.push(item.href)}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons name={item.icon} size={22} color={colors.brand} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDesc}>{item.desc}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} style={styles.menuChevron} />
            </Pressable>
          ))}
        </View>

        <View style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
          <Text style={styles.noteText}>
            Admin accounts are created from the backend only. Super admins can add team members from Admin team.
            Catalog images are optional — text, rates, and descriptions work without uploads.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  loader: { marginVertical: spacing.lg },
  statsRow: { gap: spacing.sm, paddingBottom: spacing.xs },
  statCard: {
    minWidth: 108,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  statLabel: { fontSize: fontSize.xs, color: colors.muted, fontWeight: '600' },
  statValue: { fontSize: fontSize.lg, fontWeight: '800', marginTop: 4 },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  menuGrid: { gap: spacing.sm },
  menuCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    position: 'relative',
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  menuTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  menuDesc: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  menuChevron: { position: 'absolute', right: spacing.lg, top: spacing.lg },
  noteCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  noteText: { flex: 1, fontSize: fontSize.sm, color: colors.muted, lineHeight: 20 },
  logoutBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  logoutText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  pressed: { opacity: 0.85 },
});
