import { StyleSheet, Text, View } from 'react-native';
import BrandLogo from './BrandLogo';
import { colors, fontSize, spacing } from '../theme/theme';

/** Compact brand + screen title for authenticated tab screens. */
export default function AppScreenHeader({ title, right }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <BrandLogo size="sm" />
        {title ? <Text style={styles.title}>{title}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  left: { flex: 1, minWidth: 0, gap: spacing.xs },
  right: { flexShrink: 0 },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
});
