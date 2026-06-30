/**

 * Sign-in — patient, caregiver, or guardian via login-as dropdown.

 */

import { useState } from 'react';

import {

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

import Screen from '../../src/components/Screen';

import Button from '../../src/components/Button';

import TextField from '../../src/components/TextField';

import SelectField from '../../src/components/SelectField';

import { useAuth } from '../../src/context/AuthContext';

import { apiErrorMessage } from '../../src/api/client';

import { LOGIN_AS_OPTIONS, LOGIN_KIND_LABELS, navigateForUser } from '../../src/lib/accountKinds';

import { colors, fontSize, spacing } from '../../src/theme/theme';



export default function LoginScreen() {

  const router = useRouter();

  const { login, completeLogin, loading } = useAuth();



  const [loginAs, setLoginAs] = useState('patient');

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [error, setError] = useState('');

  const [loginOptions, setLoginOptions] = useState(null);

  const [pendingEmail, setPendingEmail] = useState('');



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

      const result = await login(email.trim(), password, { activeKind: loginAs });

      if (result?.needsRolePick) {

        setLoginOptions(result.loginOptions);

        setPendingEmail(result.email || email.trim());

        return;

      }

      finishLogin(result);

    } catch (err) {

      setError(apiErrorMessage(err, 'Login failed. Check your credentials.'));

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

            <Pressable

              key={opt.kind}

              style={({ pressed }) => [styles.roleCard, pressed && styles.pressed]}

              onPress={() => onPickRole(opt.kind)}

              disabled={loading}

            >

              <Text style={styles.roleTitle}>{opt.label || LOGIN_KIND_LABELS[opt.kind] || opt.kind}</Text>

            </Pressable>

          ))}

          <Pressable onPress={() => setLoginOptions(null)}>

            <Text style={styles.backLink}>← Back to sign in</Text>

          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

        </ScrollView>

      </Screen>

    );

  }



  return (

    <Screen padded={false}>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <Pressable

          style={styles.backBtn}

          hitSlop={10}

          onPress={() => (router.canGoBack() ? router.back() : router.replace('/landing'))}

        >

          <Ionicons name="chevron-back" size={22} color={colors.text} />

          <Text style={styles.backText}>Home</Text>

        </Pressable>



        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>

            <Text style={styles.title}>Welcome back</Text>

            <SelectField

              label="Login as"

              value={loginAs}

              options={LOGIN_AS_OPTIONS}

              onChange={setLoginAs}

            />

          </View>



          <View style={styles.form}>

            <TextField

              label="Email"

              value={email}

              onChangeText={setEmail}

              placeholder="you@example.com"

              keyboardType="email-address"

              autoComplete="email"

            />

            <TextField

              label="Password"

              value={password}

              onChangeText={setPassword}

              placeholder="••••••••"

              secureTextEntry

            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
              Forgot password?
            </Link>

            <Button label="Sign in" onPress={onSubmit} loading={loading} />



            <View style={styles.footer}>

              <Link href="/(auth)/register" style={styles.linkText}>

                Create an account

              </Link>

            </View>

          </View>

        </ScrollView>

      </KeyboardAvoidingView>

    </Screen>

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

  header: { gap: spacing.lg },

  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },

  form: { gap: spacing.lg },

  error: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '600' },

  forgotLink: { alignSelf: 'flex-end', color: colors.brand, fontSize: fontSize.sm, fontWeight: '700' },

  footer: { flexDirection: 'row', justifyContent: 'center' },

  linkText: { color: colors.brand, fontSize: fontSize.sm, fontWeight: '700' },

  roleCard: {

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: 12,

    padding: spacing.lg,

    backgroundColor: colors.surface,

  },

  roleTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },

  backLink: { textAlign: 'center', color: colors.muted, fontWeight: '600', marginTop: spacing.sm },

  pressed: { opacity: 0.85 },

});


