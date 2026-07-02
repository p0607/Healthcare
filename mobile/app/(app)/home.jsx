/**
 * Patient dashboard Home — mobile mirror of the web UserDashboard.
 *
 * Layout (top → bottom), matching the web:
 *   1. Header: 911 logo, profile-completeness %, Logout
 *   2. Sub-header: Monitoring status, location, Cart
 *   3. Care tabs: Homecare / Wellness / Health monitor
 *   4. Tab content (Homecare = 4 service cards + full-width SOS slide)
 *
 * Tapping a service card starts the booking flow for that service type.
 */
import { useCallback, useMemo, useState } from 'react';
import {
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
import {
  SERVICE_CATEGORY_CARDS,
  SERVICE_PILLARS,
  patientProfileCompletion,
} from '@nursecare/shared';
import { useAuth } from '../../src/context/AuthContext';
import { useBookingCart } from '../../src/context/BookingCartContext';
import { api, apiErrorMessage } from '../../src/api/client';
import AddressBar from '../../src/components/AddressBar';
import OngoingVisitsSection from '../../src/components/OngoingVisitsSection';
import ProfileCompletionPie from '../../src/components/ProfileCompletionPie';
import SosSlideControl from '../../src/components/SosSlideControl';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

const CARE_TABS = [
  { id: 'homecare', label: 'Homecare' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'health_monitor', label: 'Monitor' },
];

const CATEGORY_ICONS = {
  nurse: 'medkit',
  doctor: 'medical',
  physio: 'fitness',
  emergency: 'alert-circle',
};

const CATEGORY_TINTS = {
  nurse_visit: '#10b981',
  doctor_consult: '#0a9bf0',
  physiotherapy: '#f59e0b',
  emergency: '#f43f5e',
};

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { itemCount } = useBookingCart();
  const [activeTab, setActiveTab] = useState('homecare');
  const [sendingSos, setSendingSos] = useState(false);

  const completion = useMemo(() => patientProfileCompletion(user), [user]);
  const wellnessPillar = useMemo(
    () => SERVICE_PILLARS.find((p) => p.id === 'thrive-well'),
    []
  );

  const onLogout = useCallback(() => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
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
  }, [logout, router]);

  const onEmergencyActivate = useCallback(async () => {
    if (sendingSos) return;
    setSendingSos(true);
    try {
      const { data } = await api.post('/auth/me/emergency-alert');
      const parts = [];
      if (data?.guardians?.length) parts.push(`${data.guardians.length} guardian(s)`);
      if (data?.admins?.length) parts.push(`${data.admins.length} admin(s)`);
      if (data?.registeredContacts?.length) {
        parts.push(`${data.registeredContacts.length} emergency contact(s)`);
      }
      const summary = parts.length ? parts.join(', ') : 'your care team';
      Alert.alert(
        'Alert sent',
        data?.notified
          ? `High-priority alert sent to ${summary}. Opening emergency booking.`
          : 'Emergency alert recorded. Opening emergency booking.'
      );
      router.push('/(app)/book/emergency');
    } catch (err) {
      Alert.alert('Error', apiErrorMessage(err, 'Could not send the alert.'));
    } finally {
      setSendingSos(false);
    }
  }, [router, sendingSos]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 1. Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>V</Text>
          </View>
          <Text style={styles.brandName}>Vytal</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.profileRingBtn} onPress={() => router.push('/(app)/profile')}>
            <ProfileCompletionPie completion={completion} size={44} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
            onPress={onLogout}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 2. Sub-header: monitoring / cart / address */}
        <View style={styles.subBar}>
          <View style={styles.subBarTop}>
            <View style={styles.monitoring}>
              <View style={styles.monitorDot} />
              <Text style={styles.monitorText}>Monitoring OFF</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.cartBtn, pressed && styles.pressed]}
              onPress={() => router.push('/(app)/cart')}
            >
              <Ionicons name="cart-outline" size={18} color={colors.text} />
              {itemCount > 0 ? (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{itemCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          <AddressBar />
        </View>

        <OngoingVisitsSection />

        {/* 3. Care tabs */}
        <View style={styles.tabRow}>
          {CARE_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* 4. Tab content */}
        {activeTab === 'homecare' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose a service</Text>
            <View style={styles.cardGrid}>
              {SERVICE_CATEGORY_CARDS.map((card) => {
                const tint = CATEGORY_TINTS[card.serviceType] || colors.brand;
                return (
                  <Pressable
                    key={card.id}
                    style={({ pressed }) => [styles.serviceCard, pressed && styles.pressed]}
                    onPress={() => router.push(`/(app)/book/${card.serviceType}`)}
                  >
                    <View style={[styles.serviceIconWrap, { backgroundColor: `${tint}1a` }]}>
                      <Ionicons name={CATEGORY_ICONS[card.id] || 'medkit'} size={22} color={tint} />
                    </View>
                    <Text style={styles.serviceLabel}>{card.label}</Text>
                    <Text style={styles.serviceSubtitle}>{card.subtitle}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.sosWrap}>
              <SosSlideControl onActivate={onEmergencyActivate} disabled={sendingSos} />
            </View>
          </View>
        ) : null}

        {activeTab === 'wellness' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Body, mind & lifestyle care</Text>
            {(wellnessPillar?.services || []).map((service) => (
              <Pressable
                key={service.id}
                style={({ pressed }) => [styles.wellnessRow, pressed && styles.pressed]}
                onPress={() => router.push('/(app)/service/thrive-well')}
              >
                <View style={styles.wellnessIcon}>
                  <Ionicons name="leaf" size={18} color={colors.success} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.wellnessName}>{service.name}</Text>
                  <Text style={styles.wellnessTagline} numberOfLines={1}>
                    {service.tagline}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {activeTab === 'health_monitor' ? (
          <View style={styles.section}>
            <View style={styles.monitorCard}>
              <View style={styles.monitorIconWrap}>
                <Ionicons name="shield-checkmark" size={22} color={colors.brand} />
              </View>
              <Text style={styles.monitorTitle}>Home safety monitoring</Text>
              <Text style={styles.monitorDesc}>
                Fall detection and wellness alerts from connected CareGuard devices keep your family
                informed. Monitoring is currently inactive on this device.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.monitorBtn, pressed && styles.pressed]}
                onPress={() =>
                  Alert.alert('Safety alerts', 'Live safety-alert monitoring will appear here once a CareGuard device is connected.')
                }
              >
                <Ionicons name="notifications-outline" size={16} color={colors.brand} />
                <Text style={styles.monitorBtnText}>View safety alerts</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.monitorBtnPrimary, pressed && styles.pressed]}
                onPress={() => setActiveTab('homecare')}
              >
                <Text style={styles.monitorBtnPrimaryText}>Book a home visit</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  brandName: { fontSize: fontSize.lg, fontWeight: '800', color: colors.brand },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileRingBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  logoutText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  pressed: { opacity: 0.85 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  subBar: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  subBarTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  monitoring: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  monitorDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted },
  monitorText: { fontSize: fontSize.xs, color: colors.muted, fontWeight: '600' },
  cartBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginTop: spacing.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  tabActive: { backgroundColor: colors.brand },
  tabText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.muted },
  tabTextActive: { color: colors.white },
  section: { marginTop: spacing.xl },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  serviceCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  serviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  serviceLabel: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  serviceSubtitle: { fontSize: fontSize.xs, color: colors.muted },
  sosWrap: { marginTop: spacing.lg, width: '100%' },
  wellnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  wellnessIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wellnessName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  wellnessTagline: { fontSize: fontSize.xs, color: colors.muted, marginTop: 1 },
  monitorCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  monitorIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  monitorTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  monitorDesc: { fontSize: fontSize.sm, color: colors.muted, lineHeight: 20 },
  monitorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  monitorBtnText: { color: colors.brand, fontWeight: '700', fontSize: fontSize.sm },
  monitorBtnPrimary: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  monitorBtnPrimaryText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
});
