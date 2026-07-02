/**
 * Register — patient, guardian, and caregiver (nurse/doctor/physio/emergency).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import TextField from '../../src/components/TextField';
import ServiceRegistrationPicker from '../../src/components/ServiceRegistrationPicker';
import { useAuth } from '../../src/context/AuthContext';
import { api, apiErrorMessage } from '../../src/api/client';
import {
  REGISTER_ACCOUNT_KINDS,
  SPECIALIZATION_PLACEHOLDER,
  labelForRegisterServiceType,
  navigateForUser,
} from '../../src/lib/accountKinds';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, loading } = useAuth();

  const [accountKinds, setAccountKinds] = useState(['patient']);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    specialization: '',
    licenseNumber: '',
  });
  const [patientDetails, setPatientDetails] = useState({ name: '', email: '', phone: '' });
  const [patientCheck, setPatientCheck] = useState(null);
  const [checkingPatient, setCheckingPatient] = useState(false);
  const [caregiverCategory, setCaregiverCategory] = useState('nurse_visit');
  const [careOfferings, setCareOfferings] = useState([]);
  const [error, setError] = useState('');

  const wantsPatient = accountKinds.includes('patient');
  const wantsGuardian = accountKinds.includes('guardian');
  const wantsService = accountKinds.includes('service_provider');

  const toggleKind = (id) => {
    setAccountKinds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((k) => k !== id);
        return next.length ? next : prev;
      }
      return [...prev, id];
    });
  };

  const checkPatientEmail = useCallback(async (email) => {
    const trimmed = email?.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setPatientCheck(null);
      return;
    }
    setCheckingPatient(true);
    try {
      const { data } = await api.post('/auth/check-patient', { email: trimmed });
      setPatientCheck(data);
    } catch (err) {
      setPatientCheck({ error: err?.response?.data?.message || 'Could not verify patient email' });
    } finally {
      setCheckingPatient(false);
    }
  }, []);

  useEffect(() => {
    if (!wantsGuardian) return undefined;
    const t = setTimeout(() => checkPatientEmail(patientDetails.email), 500);
    return () => clearTimeout(t);
  }, [wantsGuardian, patientDetails.email, checkPatientEmail]);

  const patientStatus = useMemo(() => {
    if (!wantsGuardian || !patientDetails.email.trim()) return null;
    if (checkingPatient) return 'Checking patient email…';
    if (patientCheck?.error) return patientCheck.error;
    if (patientCheck?.exists) {
      return patientCheck.message || 'Patient account found — will be linked to your guardian profile';
    }
    if (patientCheck && !patientCheck.exists) return 'New patient will use your password below';
    return null;
  }, [wantsGuardian, patientDetails.email, checkingPatient, patientCheck]);

  const onSubmit = async () => {
    setError('');
    if (accountKinds.length === 0) {
      setError('Select at least one account type.');
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Name, email, and password are required.');
      return;
    }
    if (wantsGuardian && (!patientDetails.name.trim() || !patientDetails.email.trim())) {
      setError('Enter the patient’s full name and email for guardian registration.');
      return;
    }
    if (wantsService) {
      if (!caregiverCategory) {
        setError('Choose a caregiver type (Nurse, Doctor, Physio, or Emergency).');
        return;
      }
      if (careOfferings.length === 0) {
        setError('Select at least one sub-service with your rate.');
        return;
      }
    }
    if (patientCheck?.error) {
      setError(patientCheck.error);
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        accountKinds,
      };
      if (wantsGuardian) {
        payload.patientDetails = {
          name: patientDetails.name.trim(),
          email: patientDetails.email.trim(),
          phone: patientDetails.phone?.trim() || undefined,
        };
      }
      if (wantsService) {
        payload.caregiverCategory = caregiverCategory;
        payload.careOfferings = careOfferings;
        payload.specialization =
          form.specialization.trim() || labelForRegisterServiceType(caregiverCategory);
        payload.licenseNumber = form.licenseNumber?.trim() || undefined;
      }

      const user = await register(payload);
      navigateForUser(user, router);
    } catch (err) {
      setError(apiErrorMessage(err, 'Registration failed.'));
    }
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.brand}>Vytal</Text>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Choose your role and fill in your details.</Text>
          </View>

          <Text style={styles.sectionLabel}>I am registering as</Text>
          <View style={styles.kindGrid}>
            {REGISTER_ACCOUNT_KINDS.map((k) => {
              const checked = accountKinds.includes(k.id);
              return (
                <Pressable
                  key={k.id}
                  style={[styles.kindCard, checked && styles.kindCardActive]}
                  onPress={() => toggleKind(k.id)}
                >
                  <Text style={[styles.kindLabel, checked && styles.kindLabelActive]}>{k.label}</Text>
                  <Text style={styles.kindDesc}>{k.desc}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.form}>
            <Text style={styles.sectionLabel}>Your details</Text>
            <TextField label="Full name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Jane Doe" autoCapitalize="words" />
            <TextField label="Email" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="you@example.com" keyboardType="email-address" />
            <TextField label="Phone" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="Optional" keyboardType="phone-pad" />
            <TextField label="Password" value={form.password} onChangeText={(v) => setForm((f) => ({ ...f, password: v }))} placeholder="At least 8 characters" secureTextEntry />

            {wantsGuardian ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Patient you care for</Text>
                <TextField label="Patient full name" value={patientDetails.name} onChangeText={(v) => setPatientDetails((p) => ({ ...p, name: v }))} autoCapitalize="words" />
                <TextField label="Patient email" value={patientDetails.email} onChangeText={(v) => setPatientDetails((p) => ({ ...p, email: v }))} keyboardType="email-address" autoCapitalize="none" />
                <TextField label="Patient phone (optional)" value={patientDetails.phone} onChangeText={(v) => setPatientDetails((p) => ({ ...p, phone: v }))} keyboardType="phone-pad" />
                {patientStatus ? <Text style={styles.status}>{patientStatus}</Text> : null}
              </View>
            ) : null}

            {wantsService ? (
              <ServiceRegistrationPicker
                caregiverCategory={caregiverCategory}
                onCaregiverCategoryChange={setCaregiverCategory}
                careOfferings={careOfferings}
                onCareOfferingsChange={setCareOfferings}
                specialization={form.specialization}
                onSpecializationChange={(v) => setForm((f) => ({ ...f, specialization: v }))}
                licenseNumber={form.licenseNumber}
                onLicenseNumberChange={(v) => setForm((f) => ({ ...f, licenseNumber: v }))}
                specializationPlaceholder={SPECIALIZATION_PLACEHOLDER[caregiverCategory]}
              />
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label="Create account" onPress={onSubmit} loading={loading} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/login" style={styles.linkText}>Sign in</Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { gap: spacing.xs },
  brand: { fontSize: fontSize.sm, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: colors.brand },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fontSize.md, color: colors.muted },
  sectionLabel: { fontSize: fontSize.sm, fontWeight: '800', color: colors.text },
  kindGrid: { gap: spacing.sm },
  kindCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  kindCardActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  kindLabel: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  kindLabelActive: { color: colors.brand },
  kindDesc: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  form: { gap: spacing.lg },
  section: { gap: spacing.md },
  status: { fontSize: fontSize.xs, color: colors.brand, fontWeight: '600' },
  error: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: colors.muted, fontSize: fontSize.sm },
  linkText: { color: colors.brand, fontSize: fontSize.sm, fontWeight: '700' },
});
