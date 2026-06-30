import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { otpPurposeLabel, useVisitOtp } from '../context/VisitOtpContext';
import { colors, fontSize, radius, spacing } from '../theme/theme';

/** Full-screen modal — appears on any patient screen when OTP is generated. */
export default function VisitOtpPopup() {
  const { activeOtp, popupVisible, dismissOtpPopup } = useVisitOtp();

  if (!popupVisible || !activeOtp?.otp) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={dismissOtpPopup}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.kicker}>OTP verification</Text>
              <Text style={styles.title}>{otpPurposeLabel(activeOtp.purpose)}</Text>
            </View>
            <Pressable
              onPress={dismissOtpPopup}
              hitSlop={8}
              accessibilityLabel="Close OTP popup"
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          <Text style={styles.hint}>
            Share this code with your caregiver so they can start or complete your visit.
          </Text>

          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>One-time password</Text>
            <Text style={styles.code}>{activeOtp.otp}</Text>
          </View>

          <Pressable style={styles.doneBtn} onPress={dismissOtpPopup}>
            <Text style={styles.doneText}>Got it</Text>
          </Pressable>
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
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerText: { flex: 1 },
  kicker: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, marginTop: 4 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontSize: fontSize.sm, color: colors.muted, lineHeight: 20 },
  codeBox: {
    backgroundColor: '#e6f4fd',
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  code: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    letterSpacing: 6,
    color: colors.text,
    marginTop: spacing.sm,
  },
  doneBtn: {
    alignSelf: 'flex-end',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  doneText: { fontWeight: '700', color: colors.text },
});
