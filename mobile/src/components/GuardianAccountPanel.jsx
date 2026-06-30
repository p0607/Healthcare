import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { guardianAlsoPatient } from '@nursecare/shared';
import { api } from '../api/client';
import { saveCachedUser } from '../storage/session';
import Button from './Button';
import ChangePasswordForm from './ChangePasswordForm';
import TextField from './TextField';
import { colors, fontSize, radius, spacing } from '../theme/theme';

export default function GuardianAccountPanel({ user, setUser }) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [alsoPatient, setAlsoPatient] = useState(guardianAlsoPatient(user));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
    setPhone(user?.phone || '');
    setAlsoPatient(guardianAlsoPatient(user));
  }, [user]);

  const saveAccount = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/me/guardian-account', {
        name: name.trim(),
        phone: phone.trim(),
        alsoPatient,
      });
      setUser(data.user);
      await saveCachedUser(data.user);
      Alert.alert('Saved', data.message || 'Account updated.');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Guardian account</Text>
        <TextField label="Full name" value={name} onChangeText={setName} />
        <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextField label="Email" value={user?.email || ''} editable={false} />
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={styles.switchLabel}>I am also a patient</Text>
            <Text style={styles.switchHint}>
              Turn on to manage your own health profile alongside linked patients.
            </Text>
          </View>
          <Switch value={alsoPatient} onValueChange={setAlsoPatient} />
        </View>
        <Button title={saving ? 'Saving…' : 'Save account'} onPress={saveAccount} disabled={saving} />
      </View>

      <View style={styles.card}>
        <ChangePasswordForm />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  switchCopy: { flex: 1, gap: 4 },
  switchLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  switchHint: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 16 },
});
