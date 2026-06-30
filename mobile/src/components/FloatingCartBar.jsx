import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing } from '../theme/theme';

export default function FloatingCartBar({ visible, count, onContinue }) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        onPress={onContinue}
      >
        <View style={styles.left}>
          <Ionicons name="cart" size={18} color={colors.white} />
          <Text style={styles.count}>{count} selected</Text>
        </View>
        <Text style={styles.label}>Continue to cart</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
    zIndex: 50,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  count: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  label: { color: colors.white, fontWeight: '800', fontSize: fontSize.md, flex: 1, textAlign: 'center' },
  pressed: { opacity: 0.9 },
});
