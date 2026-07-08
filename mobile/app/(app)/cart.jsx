import { useCallback, useEffect, useMemo, useState } from 'react';
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
  autoAssignCaregiversForGroups,
  autoAssignToastMessage,
  caregiverRecordId,
  caregiverServiceLabel,
  groupCartItemsByServiceType,
  resolveCheckoutAddress,
  resolveCheckoutPin,
  resolvePrimaryCaregiver,
} from '@nursecare/shared';
import { useAuth } from '../../src/context/AuthContext';
import { useAddress } from '../../src/context/AddressContext';
import { useBookingCart } from '../../src/context/BookingCartContext';
import AddressBar from '../../src/components/AddressBar';
import AppScreenHeader from '../../src/components/AppScreenHeader';
import CaregiverPickerModal from '../../src/components/CaregiverPickerModal';
import { api } from '../../src/api/client';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

export default function CartScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { locationConfirmed, setAddressModalOpen } = useAddress();
  const {
    items,
    removeItem,
    total,
    itemCount,
    caregiversByType,
    setCaregiverForType,
    checkoutMeta,
    setCheckoutMeta,
    setPaymentCheckout,
  } = useBookingCart();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerServiceType, setPickerServiceType] = useState(null);
  const [nurses, setNurses] = useState([]);
  const [loadingNurses, setLoadingNurses] = useState(false);

  const groupedItems = useMemo(() => groupCartItemsByServiceType(items), [items]);
  const pickerItems = useMemo(() => {
    if (!pickerServiceType) return items;
    return items.filter((i) => (i.serviceType || 'nurse_visit') === pickerServiceType);
  }, [items, pickerServiceType]);

  const loadNurses = useCallback(async () => {
    setLoadingNurses(true);
    try {
      const pin = resolveCheckoutPin(checkoutMeta, user);
      const { data } = await api.get('/nurses', {
        params: { lng: pin[0], lat: pin[1], maxKm: 25 },
      });
      const list = data.nurses ?? [];
      setNurses(list);
      return list;
    } catch {
      setNurses([]);
      return [];
    } finally {
      setLoadingNurses(false);
    }
  }, [user, checkoutMeta]);

  useEffect(() => {
    loadNurses();
  }, [loadNurses]);

  useEffect(() => {
    const resolvedAddress = resolveCheckoutAddress(checkoutMeta, user);
    const pin = resolveCheckoutPin(checkoutMeta, user);
    if (!resolvedAddress) return;
    setCheckoutMeta((prev) => {
      const next = { ...(prev || {}) };
      let changed = false;
      if (!prev?.address?.trim()) {
        next.address = resolvedAddress;
        changed = true;
      }
      if (!Array.isArray(prev?.pin) || prev.pin.length !== 2) {
        next.pin = pin;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [user?.id, user?.location?.address, setCheckoutMeta]);

  const openPickerFor = (serviceType) => {
    setPickerServiceType(serviceType);
    setPickerOpen(true);
    loadNurses();
  };

  const handleSelectCaregiver = (person) => {
    if (!pickerServiceType) return;
    setCaregiverForType(pickerServiceType, person);
    setPickerOpen(false);
    Alert.alert('Caregiver selected', `${caregiverServiceLabel(pickerServiceType)}: ${person.name}`);
  };

  const buildCheckoutState = useCallback(
    (caregiversOverride = null) => {
      const groups = groupCartItemsByServiceType(items);
      const caregivers = caregiversOverride ?? caregiversByType;
      const { caregiver: primaryCaregiver, serviceType: primaryType } = resolvePrimaryCaregiver(
        groups,
        caregivers
      );
      const pin = resolveCheckoutPin(checkoutMeta, user);
      const resolvedAddress = resolveCheckoutAddress(checkoutMeta, user);
      return {
        nurse: primaryCaregiver,
        caregiversByType: caregivers,
        pin,
        address: resolvedAddress,
        visitNotes: items.map((i) => i.label).filter(Boolean).join('; '),
        serviceType: primaryType,
        selectedCareOptionIds: items.map((i) => i.id),
        selectedCareOptions: items.map((i) => ({
          id: i.id,
          label: i.label,
          rate: i.rate,
          serviceType: i.serviceType,
        })),
      };
    },
    [caregiversByType, checkoutMeta, user, items]
  );

  const continueToPayment = useCallback(async () => {
    if (items.length === 0) {
      Alert.alert('Empty cart', 'Add at least one service.');
      return;
    }
    const resolvedAddress = resolveCheckoutAddress(checkoutMeta, user);
    if (!resolvedAddress && !locationConfirmed) {
      Alert.alert('Address required', 'Add a delivery address before checkout.');
      setAddressModalOpen(true);
      return;
    }

    let nurseList = nurses;
    if (!nurseList.length) nurseList = await loadNurses();

    const { caregiversByType: merged, assigned, stillMissing } = autoAssignCaregiversForGroups(
      groupedItems,
      nurseList,
      caregiversByType
    );

    for (const row of assigned) {
      setCaregiverForType(row.serviceType, row.caregiver);
    }

    if (stillMissing.length > 0) {
      Alert.alert('No caregiver', `No ${stillMissing[0].label.toLowerCase()} available nearby.`);
      return;
    }

    const msg = autoAssignToastMessage(assigned);
    const checkout = buildCheckoutState(merged);
    if (!caregiverRecordId(checkout.nurse)) {
      Alert.alert('No caregiver', 'No caregiver available near your location.');
      return;
    }

    setPaymentCheckout(checkout);
    router.push('/(app)/payment');
    if (msg) setTimeout(() => Alert.alert('Assigned', msg), 400);
  }, [
    items.length,
    groupedItems,
    caregiversByType,
    checkoutMeta,
    user,
    locationConfirmed,
    nurses,
    loadNurses,
    setCaregiverForType,
    buildCheckoutState,
    router,
    setAddressModalOpen,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppScreenHeader title="Your cart" />

      {items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cart-outline" size={48} color={colors.muted} />
          <Text style={styles.heading}>Your cart is empty</Text>
          <Pressable style={styles.btn} onPress={() => router.push('/(app)/home')}>
            <Text style={styles.btnText}>Browse services</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.addressCard}>
            <Text style={styles.addrLabel}>Delivery address</Text>
            <AddressBar />
          </View>

          <Text style={styles.sectionLabel}>Your care plan</Text>

          {groupedItems.map((group) => {
            const assigned = caregiversByType[group.serviceType];
            return (
              <View key={group.serviceType} style={styles.group}>
                <View style={styles.groupHeader}>
                  <View style={styles.flex}>
                    <Text style={styles.groupType}>{group.label}</Text>
                    {assigned ? (
                      <>
                        <Text style={styles.cgName}>{assigned.name}</Text>
                        <Text style={styles.cgSpec} numberOfLines={1}>
                          {assigned.specialization || 'Home care professional'}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.noCg}>No {group.label.toLowerCase()} selected</Text>
                    )}
                  </View>
                  <Pressable onPress={() => openPickerFor(group.serviceType)}>
                    <Text style={styles.change}>{assigned ? 'Change' : 'Select'}</Text>
                  </Pressable>
                </View>
                {group.items.map((item) => (
                  <View key={item.id} style={styles.line}>
                    <Text style={styles.lineLabel} numberOfLines={2}>
                      {item.label}
                    </Text>
                    <Text style={styles.lineRate}>{fmtInr(item.rate)}</Text>
                    <Pressable onPress={() => removeItem(item.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                ))}
              </View>
            );
          })}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{fmtInr(total)}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.payBtn, pressed && styles.pressed]}
            onPress={continueToPayment}
          >
            <Ionicons name="card-outline" size={18} color={colors.white} />
            <Text style={styles.payText}>Continue to payment</Text>
          </Pressable>
        </ScrollView>
      )}

      <CaregiverPickerModal
        visible={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPickerServiceType(null);
        }}
        nurses={nurses}
        loading={loadingNurses}
        serviceType={pickerServiceType || 'nurse_visit'}
        cartItems={pickerItems}
        selectedId={pickerServiceType ? caregiversByType[pickerServiceType]?._id : undefined}
        onSelect={handleSelectCaregiver}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  heading: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  btn: {
    marginTop: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  btnText: { color: colors.white, fontWeight: '700' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  addressCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  addrLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.muted, marginBottom: spacing.sm },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, textTransform: 'uppercase' },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.brandSoft,
    gap: spacing.sm,
  },
  groupType: { fontSize: 11, fontWeight: '800', color: colors.brand, textTransform: 'uppercase' },
  cgName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginTop: 2 },
  cgSpec: { fontSize: fontSize.xs, color: colors.muted },
  noCg: { fontSize: fontSize.sm, color: colors.muted, marginTop: 4 },
  change: { fontSize: fontSize.xs, fontWeight: '700', color: colors.brand },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  lineRate: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  totalLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.muted },
  totalValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  payText: { color: colors.white, fontWeight: '800', fontSize: fontSize.md },
  pressed: { opacity: 0.85 },
});
