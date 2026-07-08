import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { caregiverServiceLabel } from '@nursecare/shared';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';
import { colors, fontSize, spacing } from '../theme/theme';

export default function CaregiverScreenHeader({ title, subtitle, left }) {
  const { user } = useAuth();
  const category = user?.caregiverCategory || 'nurse_visit';
  const metaLine =
    subtitle ||
    `${user?.name || 'Caregiver'} · ${caregiverServiceLabel(category)}`;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        {left ? <View style={styles.topRow}>{left}</View> : null}
        <BrandLogo size="sm" showTagline />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{metaLine}</Text>
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
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, marginTop: spacing.xs },
  meta: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
});
