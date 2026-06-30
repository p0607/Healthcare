/**
 * Booking flow — sub-service selection, nearby caregivers, add to cart.
 * Mirrors web VisitBookingFlow + UserDashboard continue-to-cart logic.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  autoAssignCaregiversForGroups,
  autoAssignToastMessage,
  caregiverKindBadge,
  caregiverServiceLabel,
  caregiversForService,
  groupCartItemsByServiceType,
  initialsFromName,
  resolveCaregiverServiceType,
} from '@nursecare/shared';
import { useAddress } from '../../../src/context/AddressContext';
import { useBookingCart } from '../../../src/context/BookingCartContext';
import AddressBar from '../../../src/components/AddressBar';
import CaregiverPickerModal from '../../../src/components/CaregiverPickerModal';
import FloatingCartBar from '../../../src/components/FloatingCartBar';
import { api } from '../../../src/api/client';
import { colors, fontSize, radius, spacing } from '../../../src/theme/theme';

const BADGE_COLORS = {
  doctor: { bg: '#e0f2fe', text: '#0c4a6e' },
  physio: { bg: '#fef3c7', text: '#78350f' },
  ambulance: { bg: '#ffe4e6', text: '#881337' },
  nurse: { bg: '#d1fae5', text: '#065f46' },
};

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

export default function BookScreen() {
  const { serviceType: rawType } = useLocalSearchParams();
  const serviceType = String(rawType || 'nurse_visit');
  const router = useRouter();

  const { pin, address, locationConfirmed, setAddressModalOpen } = useAddress();
  const {
    items: cartItems,
    setItems,
    caregiversByType,
    setCaregiverForType,
    setCheckoutMeta,
    registerRemoveListener,
  } = useBookingCart();

  const [careOptions, setCareOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [nurses, setNurses] = useState([]);
  const [loadingNurses, setLoadingNurses] = useState(false);
  const [selectedCareIds, setSelectedCareIds] = useState(() => cartItems.map((i) => i.id));
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingOptions(true);
      try {
        const { data } = await api.get('/care-services', { params: { serviceType } });
        if (!cancelled) setCareOptions(data.options || []);
      } catch {
        if (!cancelled) setCareOptions([]);
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceType]);

  const loadNurses = useCallback(async (coords = pin) => {
    setLoadingNurses(true);
    try {
      const lng = coords?.[0] ?? 77.5946;
      const lat = coords?.[1] ?? 12.9716;
      const { data } = await api.get('/nurses', { params: { lng, lat, maxKm: 25 } });
      const list = data.nurses ?? data ?? [];
      setNurses(list);
      return list;
    } catch {
      setNurses([]);
      return [];
    } finally {
      setLoadingNurses(false);
    }
  }, [pin]);

  useEffect(() => {
    if (locationConfirmed) loadNurses(pin);
  }, [locationConfirmed, loadNurses, pin]);

  useEffect(() => {
    return registerRemoveListener((id) => {
      if (id == null) {
        setSelectedCareIds([]);
        return;
      }
      setSelectedCareIds((prev) => prev.filter((x) => x !== id));
    });
  }, [registerRemoveListener]);

  const resolveCareOption = useCallback(
    (id) => careOptions.find((o) => o.id === id),
    [careOptions]
  );

  useEffect(() => {
    if (selectedCareIds.length === 0) {
      setItems([]);
      return;
    }
    const items = selectedCareIds
      .map((id) => {
        const opt = resolveCareOption(id);
        if (!opt) return null;
        return {
          id,
          label: opt.label,
          rate: Number(opt.rate) || 0,
          serviceType: opt.serviceType || serviceType,
        };
      })
      .filter(Boolean);
    if (items.length === selectedCareIds.length) {
      setItems(items);
    }
  }, [selectedCareIds, resolveCareOption, serviceType, setItems]);

  const filteredCaregivers = useMemo(
    () => caregiversForService(nurses, serviceType),
    [nurses, serviceType]
  );

  const toggleService = (id) => {
    setSelectedCareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const applyCaregiverToCart = useCallback(
    (nurse) => {
      if (!locationConfirmed || !address.trim()) {
        Alert.alert('Address required', 'Add a delivery address before booking.');
        setAddressModalOpen(true);
        return false;
      }
      if (selectedCareIds.length === 0) {
        Alert.alert('Select services', 'Pick at least one sub-service.');
        return false;
      }
      const assignType =
        resolveCaregiverServiceType(
          nurse.careOfferings,
          nurse.specialization,
          nurse.caregiverCategory
        ) || serviceType;
      setCaregiverForType(assignType, nurse);
      setCheckoutMeta({
        pin: [...pin],
        address,
        serviceType,
      });
      return true;
    },
    [
      locationConfirmed,
      address,
      selectedCareIds.length,
      serviceType,
      pin,
      setCaregiverForType,
      setCheckoutMeta,
      setAddressModalOpen,
    ]
  );

  const continueToCart = useCallback(async () => {
    if (!locationConfirmed || !address.trim()) {
      Alert.alert('Address required', 'Add a delivery address before continuing.');
      setAddressModalOpen(true);
      return;
    }
    if (selectedCareIds.length === 0) {
      Alert.alert('Select services', 'Pick at least one sub-service.');
      return;
    }

    let list = nurses;
    if (!list.length) list = await loadNurses(pin);

    const grouped = groupCartItemsByServiceType(
      selectedCareIds.map((id) => ({
        id,
        serviceType: resolveCareOption(id)?.serviceType || serviceType,
      }))
    );

    const { caregiversByType: merged, assigned, stillMissing } = autoAssignCaregiversForGroups(
      grouped,
      list,
      caregiversByType
    );

    for (const row of assigned) {
      setCaregiverForType(row.serviceType, row.caregiver);
    }

    if (stillMissing.length > 0) {
      Alert.alert('No caregiver nearby', `No ${stillMissing[0].label.toLowerCase()} available near you.`);
      return;
    }

    const msg = autoAssignToastMessage(assigned);
    setCheckoutMeta({
      pin: [...pin],
      address,
      serviceType,
    });
    setPickerOpen(false);
    router.push('/(app)/cart');
    if (msg) {
      setTimeout(() => Alert.alert('Caregiver assigned', msg), 300);
    }
  }, [
    locationConfirmed,
    address,
    selectedCareIds,
    nurses,
    loadNurses,
    pin,
    caregiversByType,
    serviceType,
    resolveCareOption,
    setCaregiverForType,
    setCheckoutMeta,
    setAddressModalOpen,
    router,
  ]);

  const onPickCaregiver = (nurse) => {
    if (!applyCaregiverToCart(nurse)) return;
    router.push('/(app)/cart');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{caregiverServiceLabel(serviceType)}</Text>
        <Pressable onPress={() => router.push('/(app)/cart')} hitSlop={10}>
          <Ionicons name="cart-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.addressCard}>
          <AddressBar />
        </View>

        <Text style={styles.sectionLabel}>Suggestions</Text>
        <Text style={styles.hint}>Tap cards to add or remove services (multi-select).</Text>

        {loadingOptions ? (
          <ActivityIndicator size="large" color={colors.brand} style={styles.loader} />
        ) : careOptions.length === 0 ? (
          <Text style={styles.empty}>No services for this care type yet.</Text>
        ) : (
          <View style={styles.grid}>
            {careOptions.map((opt) => {
              const selected = selectedCareIds.includes(opt.id);
              return (
                <Pressable
                  key={opt.id}
                  style={({ pressed }) => [
                    styles.suggestionCard,
                    selected && styles.suggestionSelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => toggleService(opt.id)}
                >
                  {selected ? (
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={12} color={colors.white} />
                    </View>
                  ) : null}
                  <Text style={styles.suggestionLabel} numberOfLines={2}>
                    {opt.label}
                  </Text>
                  {opt.rate != null ? (
                    <Text style={styles.suggestionRate}>{fmtInr(opt.rate)}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

        {selectedCareIds.length > 0 ? (
          <>
            <View style={styles.nurseHeader}>
              <Text style={styles.sectionLabel}>Nearby caregivers</Text>
              <Pressable onPress={() => setPickerOpen(true)}>
                <Text style={styles.changeLink}>View all</Text>
              </Pressable>
            </View>

            {loadingNurses ? (
              <ActivityIndicator color={colors.brand} />
            ) : !locationConfirmed ? (
              <Text style={styles.empty}>Confirm your delivery address to see caregivers.</Text>
            ) : nurses.length === 0 ? (
              <Text style={styles.empty}>
                No caregivers within 25 km of your delivery address ({pin[1]?.toFixed?.(4)},{' '}
                {pin[0]?.toFixed?.(4)}). Ask your provider to set their GPS nearby and tap Go online.
              </Text>
            ) : filteredCaregivers.length === 0 ? (
              <Text style={styles.empty}>
                Caregivers are nearby but none match this service type. Try another category or ask your
                provider to register the right sub-services.
              </Text>
            ) : (
              filteredCaregivers.slice(0, 5).map((n) => {
                const kb = caregiverKindBadge(n._kind);
                const badgeColors = BADGE_COLORS[n._kind] || BADGE_COLORS.nurse;
                return (
                  <Pressable
                    key={n._id ?? n.id}
                    style={({ pressed }) => [styles.nurseCard, pressed && styles.pressed]}
                    onPress={() => onPickCaregiver(n)}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initialsFromName(n.name)}</Text>
                    </View>
                    <View style={styles.flex}>
                      <View style={styles.nameRow}>
                        <Text style={styles.name}>{n.name}</Text>
                        <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
                          <Text style={[styles.badgeText, { color: badgeColors.text }]}>{kb.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.spec} numberOfLines={1}>
                        {n.specialization || 'Home care professional'}
                      </Text>
                      <View style={styles.metaRow}>
                        {n.distanceKm != null ? (
                          <Text style={styles.meta}>{Number(n.distanceKm).toFixed(1)} km</Text>
                        ) : null}
                        {n.rating != null ? (
                          <Text style={styles.rating}>{Number(n.rating).toFixed(1)} ★</Text>
                        ) : null}
                        <Text style={styles.tapHint}>Tap to add to cart</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      <FloatingCartBar
        visible={selectedCareIds.length > 0}
        count={selectedCareIds.length}
        onContinue={continueToCart}
      />

      <CaregiverPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        nurses={nurses}
        loading={loadingNurses}
        serviceType={serviceType}
        cartItems={cartItems}
        selectedId={caregiversByType[serviceType]?._id}
        onSelect={onPickCaregiver}
      />
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  content: { padding: spacing.lg, gap: spacing.sm },
  addressCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
  },
  hint: { fontSize: fontSize.xs, color: colors.muted, marginBottom: spacing.sm },
  loader: { marginVertical: spacing.xl },
  empty: { fontSize: fontSize.sm, color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  suggestionCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 88,
  },
  suggestionSelected: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  check: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, paddingRight: spacing.lg },
  suggestionRate: { fontSize: fontSize.xs, color: colors.brand, fontWeight: '700', marginTop: spacing.xs },
  nurseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  changeLink: { fontSize: fontSize.xs, fontWeight: '700', color: colors.brand },
  nurseCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.sm, fontWeight: '800', color: colors.brand },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  name: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  spec: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  meta: { fontSize: fontSize.xs, color: colors.muted },
  rating: { fontSize: fontSize.xs, color: '#b45309', fontWeight: '600' },
  tapHint: { fontSize: fontSize.xs, color: colors.brand, marginLeft: 'auto', fontWeight: '600' },
  pressed: { opacity: 0.85 },
});
