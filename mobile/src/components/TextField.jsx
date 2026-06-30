/** Labeled text input used across auth screens. */
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme/theme';

export default function TextField({ label, style, ...inputProps }) {
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});
