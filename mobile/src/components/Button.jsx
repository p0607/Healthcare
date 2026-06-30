/** Primary / outline button with a built-in loading spinner. */
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme/theme';

export default function Button({
  label,
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}) {
  const isOutline = variant === 'outline';
  const isDisabled = disabled || loading;
  const text = label ?? title ?? '';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isOutline ? styles.outline : styles.primary,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.brand : colors.white} />
      ) : (
        <Text style={[styles.label, isOutline ? styles.labelOutline : styles.labelPrimary]}>
          {text}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.brand,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  labelPrimary: {
    color: colors.white,
  },
  labelOutline: {
    color: colors.brand,
  },
});
