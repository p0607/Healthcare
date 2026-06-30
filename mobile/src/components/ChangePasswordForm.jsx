import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import Button from './Button';
import TextField from './TextField';
import { colors, fontSize, spacing } from '../theme/theme';

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Missing fields', 'Enter your current and new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password updated', 'Your password has been changed successfully.');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.hint}>
        Use a strong password with at least 8 characters. Required after signing in with a temporary password.
      </Text>
      <TextField
        label="Current password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        autoCapitalize="none"
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
      <Button title={saving ? 'Resetting…' : 'Reset password'} onPress={onSubmit} disabled={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  hint: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 18 },
});
