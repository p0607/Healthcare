import { Modal, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  caregiverKindBadge,
  caregiversForCartItems,
  caregiversForService,
  initialsFromName,
} from '@nursecare/shared';
import { colors, fontSize, radius, spacing } from '../theme/theme';

const BADGE_COLORS = {
  doctor: { bg: '#e0f2fe', text: '#0c4a6e' },
  physio: { bg: '#fef3c7', text: '#78350f' },
  ambulance: { bg: '#ffe4e6', text: '#881337' },
  nurse: { bg: '#d1fae5', text: '#065f46' },
};

export default function CaregiverPickerModal({
  visible,
  onClose,
  nurses = [],
  loading = false,
  serviceType,
  cartItems = null,
  selectedId,
  onSelect,
  emptyMessage = 'No caregivers available near your location.',
}) {
  const list =
    Array.isArray(cartItems) && cartItems.length > 0
      ? caregiversForCartItems(nurses, cartItems)
      : caregiversForService(nurses, serviceType);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose a caregiver</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.brand} />
                <Text style={styles.loadingText}>Loading nearby caregivers…</Text>
              </View>
            ) : list.length === 0 ? (
              <Text style={styles.empty}>{emptyMessage}</Text>
            ) : (
              list.map((n) => {
                const kb = caregiverKindBadge(n._kind);
                const badgeColors = BADGE_COLORS[n._kind] || BADGE_COLORS.nurse;
                const selected = selectedId === (n._id ?? n.id);
                return (
                  <Pressable
                    key={n._id ?? n.id}
                    style={({ pressed }) => [
                      styles.card,
                      selected && styles.cardSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      onSelect?.(n);
                      onClose?.();
                    }}
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
                      <Text style={styles.spec} numberOfLines={2}>
                        {n.specialization || 'Home care professional'}
                      </Text>
                      <View style={styles.metaRow}>
                        {n.distanceKm != null ? (
                          <Text style={styles.meta}>
                            <Ionicons name="navigate" size={11} color={colors.muted} />{' '}
                            {Number(n.distanceKm).toFixed(1)} km
                          </Text>
                        ) : null}
                        {n.rating != null ? (
                          <Text style={styles.rating}>
                            <Ionicons name="star" size={11} color="#f59e0b" />{' '}
                            {Number(n.rating).toFixed(1)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  list: { maxHeight: 480 },
  listContent: { padding: spacing.md, gap: spacing.sm },
  center: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  loadingText: { fontSize: fontSize.sm, color: colors.muted },
  empty: { textAlign: 'center', color: colors.muted, paddingVertical: spacing.xxl, lineHeight: 20 },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  cardSelected: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
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
  metaRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  meta: { fontSize: fontSize.xs, color: colors.muted },
  rating: { fontSize: fontSize.xs, color: '#b45309', fontWeight: '600', marginLeft: 'auto' },
  pressed: { opacity: 0.85 },
});
