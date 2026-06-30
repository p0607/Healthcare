import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, apiErrorMessage } from '../../src/api/client';
import Button from '../../src/components/Button';
import GuestOnly from '../../src/components/GuestOnly';
import Screen from '../../src/components/Screen';
import TextField from '../../src/components/TextField';
import { colors, fontSize, spacing } from '../../src/theme/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [devNote, setDevNote] = useState('');

  const sendOtp = async () => {
    setError('');
    setDevOtp('');
    setDevNote('');
    if (!email.trim()) {
      setError('Enter your account email.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      if (data.devOtp) {
        setDevOtp(String(data.devOtp));
        setOtp(String(data.devOtp));
        setDevNote(data.devNote || 'Email is not configured on the server. Use the code below.');
      }
      Alert.alert(
        data.devOtp ? 'Verification code (dev)' : 'Check your email',
        data.devOtp
          ? `Your code is ${data.devOtp}. It is also shown on this screen.`
          : data.message || 'If an account exists, a code was sent.'
      );
      setStep('reset');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send verification code.'));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setError('');
    if (!otp.trim() || !newPassword || !confirmPassword) {
      setError('Enter the code and your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      Alert.alert('Password updated', data.message || 'You can sign in now.', [
        { text: 'Sign in', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not reset password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <GuestOnly>
      <Screen padded={false}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable
            style={styles.backBtn}
            hitSlop={10}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Forgot password</Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? 'Enter your email and we will send a one-time verification code.'
                : 'Enter the code from your email and choose a new password.'}
            </Text>

            <View style={styles.form}>
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={step === 'email'}
              />

              {step === 'reset' ? (
                <>
                  <TextField
                    label="Verification code"
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="6-digit code"
                    keyboardType="number-pad"
                  />
                  <TextField
                    label="New password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  <TextField
                    label="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {devOtp ? (
                <View style={styles.devBanner}>
                  <Text style={styles.devTitle}>Your verification code</Text>
                  <Text style={styles.devCode}>{devOtp}</Text>
                  {devNote ? <Text style={styles.devNote}>{devNote}</Text> : null}
                </View>
              ) : null}

              {step === 'email' ? (
                <Button title={loading ? 'Sending…' : 'Send verification code'} onPress={sendOtp} disabled={loading} />
              ) : (
                <>
                  <Button title={loading ? 'Updating…' : 'Reset password'} onPress={resetPassword} disabled={loading} />
                  <Pressable onPress={sendOtp} disabled={loading}>
                    <Text style={styles.linkText}>Resend code</Text>
                  </Pressable>
                </>
              )}

              <Link href="/(auth)/login" style={styles.linkTextCenter}>
                Back to sign in
              </Link>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </GuestOnly>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  backText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.muted, lineHeight: 20 },
  form: { gap: spacing.lg },
  error: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '600' },
  linkText: { textAlign: 'center', color: colors.brand, fontSize: fontSize.sm, fontWeight: '700' },
  linkTextCenter: { textAlign: 'center', color: colors.brand, fontSize: fontSize.sm, fontWeight: '700' },
  devBanner: {
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.xs,
    alignItems: 'center',
  },
  devTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  devCode: { fontSize: 28, fontWeight: '800', color: colors.brand, letterSpacing: 4 },
  devNote: { fontSize: fontSize.xs, color: colors.muted, textAlign: 'center', lineHeight: 18 },
});
