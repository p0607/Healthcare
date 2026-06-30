import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import TextField from './TextField';
import { colors, fontSize, radius, spacing } from '../theme/theme';

export default function VisitOtpModal({
  visible,
  title,
  hint,
  value,
  onChangeValue,
  onConfirm,
  onCancel,
  busy = false,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>{hint}</Text>
          <TextField
            label="OTP from patient"
            value={value}
            onChangeText={onChangeValue}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="6-digit code"
            editable={!busy}
          />
          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onCancel} disabled={busy}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, busy && styles.disabled]}
              onPress={onConfirm}
              disabled={busy || !value.trim()}
            >
              {busy ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.confirmText}>Confirm</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  hint: { fontSize: fontSize.sm, color: colors.muted, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelText: { fontWeight: '700', color: colors.text },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmText: { fontWeight: '700', color: colors.white },
  disabled: { opacity: 0.6 },
});
