/** Labeled dropdown-style picker (modal list). */
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing } from '../theme/theme';

export default function SelectField({ label, value, options, onChange, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.value, !selected && styles.placeholder]}>
          {selected?.label || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
            {options.map((opt) => {
              const active = opt.id === value;
              return (
                <Pressable
                  key={opt.id}
                  style={({ pressed }) => [
                    styles.option,
                    active && styles.optionActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt.label}</Text>
                  {active ? <Ionicons name="checkmark" size={18} color={colors.brand} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  field: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
  placeholder: { color: colors.muted, fontWeight: '400' },
  pressed: { opacity: 0.85 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xs,
  },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  optionActive: { backgroundColor: colors.brandSoft },
  optionText: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
  optionTextActive: { color: colors.brand, fontWeight: '800' },
});
