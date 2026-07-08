import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_TIER_LABELS, isSuperAdminUser } from '@nursecare/shared/adminPermissions';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';
import { colors, fontSize, radius, spacing } from '../theme/theme';

export default function AdminScreenHeader({ title, subtitle, showBack = true, right }) {
  const router = useRouter();
  const { user } = useAuth();
  const tierLabel = ADMIN_TIER_LABELS[user?.adminTier] || 'Admin';
  const superAdmin = isSuperAdminUser(user);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          {showBack ? (
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}
          {right || null}
        </View>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <BrandLogo size="sm" />
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <View style={[styles.tierBadge, superAdmin && styles.tierBadgeSuper]}>
            <Text style={[styles.tierText, superAdmin && styles.tierTextSuper]}>{tierLabel}</Text>
          </View>
        </View>
        {user?.name ? <Text style={styles.userName}>{user.name}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backSpacer: { width: 32 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  titleBlock: { flex: 1, gap: spacing.xs },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2, lineHeight: 20 },
  userName: { fontSize: fontSize.xs, color: colors.muted },
  tierBadge: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  tierBadgeSuper: { backgroundColor: '#ede9fe' },
  tierText: { fontSize: 10, fontWeight: '800', color: colors.brand, textTransform: 'uppercase' },
  tierTextSuper: { color: '#6d28d9' },
});
