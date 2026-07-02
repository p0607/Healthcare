/**
 * Staff login — patient, care provider (nurse/doctor/physio/emergency), or admin.
 */
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import TextField from '../../src/components/TextField';
import { useAuth } from '../../src/context/AuthContext';
import { apiErrorMessage } from '../../src/api/client';
import { LOGIN_KIND_LABELS, STAFF_LOGIN_ROLES, navigateForUser } from '../../src/lib/accountKinds';
import ConnectionDiagnostics from '../../src/components/ConnectionDiagnostics';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

export default function StaffLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const providerOnly = params.provider === '1' || params.provider === 'true';
  const adminOnly = params.admin === '1' || params.admin === 'true';

  const { login, completeLogin, loading } = useAuth();

  const [role, setRole] = useState(adminOnly ? 'admin' : providerOnly ? 'nurse' : 'user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginOptions, setLoginOptions] = useState(null);
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    if (adminOnly) setRole('admin');
    else if (providerOnly) setRole('nurse');
  }, [providerOnly, adminOnly]);

  const roles = adminOnly
    ? STAFF_LOGIN_ROLES.filter((r) => r.id === 'admin')
    : providerOnly
      ? STAFF_LOGIN_ROLES.filter((r) => r.id === 'nurse')
      : STAFF_LOGIN_ROLES;

  const finishLogin = (user) => {
    navigateForUser(user, router);
  };

  const onSubmit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    try {
      const result = await login(email.trim(), password, { role });
      if (result?.needsRolePick) {
        setLoginOptions(result.loginOptions);
        setPendingEmail(result.email || email.trim());
        return;
      }
      finishLogin(result);
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed.'));
    }
  };

  const onPickRole = async (activeKind) => {
    setError('');
    try {
      const user = await completeLogin(pendingEmail || email.trim(), password, activeKind);
      if (user?.needsRolePick) return;
      setLoginOptions(null);
      finishLogin(user);
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed.'));
    }
  };

  if (loginOptions?.length) {
    return (
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>How are you signing in?</Text>
          {loginOptions.map((opt) => (
            <Pressable key={opt.kind} style={styles.roleCard} onPress={() => onPickRole(opt.kind)}>
              <Text style={styles.roleTitle}>{opt.label || LOGIN_KIND_LABELS[opt.kind]}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setLoginOptions(null)}>
            <Text style={styles.backLink}>← Back</Text>
          </Pressable>
        </ScrollView>
      </Screen>
    );
  }

  const title = adminOnly ? 'Admin login' : providerOnly ? 'Care provider login' : 'Staff login';
  const subtitle = adminOnly
    ? 'Sign in with your Alchemy admin credentials. Admin accounts are provisioned by your super admin.'
    : providerOnly
      ? 'Sign in as nurse, doctor, physio, or emergency responder.'
      : 'Choose your role, then sign in with your credentials.';

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {!providerOnly && !adminOnly ? (
            <View style={styles.roleGrid}>
              {roles.map((r) => {
                const active = role === r.id;
                return (
                  <Pressable
                    key={r.id}
                    style={[styles.rolePick, active && styles.rolePickActive]}
                    onPress={() => setRole(r.id)}
                  >
                    <Text style={[styles.rolePickLabel, active && styles.rolePickLabelActive]}>{r.label}</Text>
                    <Text style={styles.rolePickDesc}>{r.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
            Forgot password?
          </Link>

          <Button
            label={
              adminOnly
                ? 'Sign in to admin dashboard'
                : providerOnly
                  ? 'Sign in to service dashboard'
                  : `Sign in as ${roles.find((r) => r.id === role)?.label || 'Staff'}`
            }
            onPress={onSubmit}
            loading={loading}
          />

          <View style={styles.footer}>
            <Link href="/(auth)/login" style={styles.linkText}>Patient sign in</Link>
            {!providerOnly && !adminOnly ? (
              <>
                <Text style={styles.dot}> · </Text>
                <Link href="/(auth)/staff-login?provider=1" style={styles.linkText}>Care provider only</Link>
                <Text style={styles.dot}> · </Text>
                <Link href="/(auth)/staff-login?admin=1" style={styles.linkText}>Admin only</Link>
              </>
            ) : null}
            {adminOnly ? (
              <>
                <Text style={styles.dot}> · </Text>
                <Link href="/(auth)/staff-login" style={styles.linkText}>All staff roles</Link>
              </>
            ) : null}
          </View>

          <Text style={styles.demoHint}>
            Demo: admin@alchemy.com / admin123 · priya@nurse.com / nurse123
          </Text>
          <ConnectionDiagnostics />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  backBtn: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.muted, lineHeight: 20 },
  roleGrid: { gap: spacing.sm },
  rolePick: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  rolePickActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  rolePickLabel: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  rolePickLabelActive: { color: colors.brand },
  rolePickDesc: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  error: { color: colors.danger, fontWeight: '600', fontSize: fontSize.sm },
  forgotLink: { alignSelf: 'flex-end', color: colors.brand, fontWeight: '700', fontSize: fontSize.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  linkText: { color: colors.brand, fontWeight: '700', fontSize: fontSize.sm },
  dot: { color: colors.muted },
  demoHint: { fontSize: fontSize.xs, color: colors.muted, textAlign: 'center', lineHeight: 18 },
  roleCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  roleTitle: { fontWeight: '800', color: colors.text },
  backLink: { textAlign: 'center', color: colors.muted, marginTop: spacing.sm },
});
