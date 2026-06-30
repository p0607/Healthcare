import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { initialsFromName } from '@nursecare/shared';
import { useAuth } from '../../src/context/AuthContext';
import { api, apiErrorMessage } from '../../src/api/client';
import Button from '../../src/components/Button';
import CaregiverScreenHeader from '../../src/components/CaregiverScreenHeader';
import TextField from '../../src/components/TextField';
import { saveCachedUser } from '../../src/storage/session';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

const emptyCert = () => ({ title: '', issuer: '', year: '' });

function parseCerts(user) {
  const raw = user?.certifications;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((c) =>
    typeof c === 'string'
      ? { title: c, issuer: '', year: '' }
      : { title: c?.title || '', issuer: c?.issuer || '', year: c?.year || '' }
  );
}

export default function CaregiverSettingsScreen() {
  const router = useRouter();
  const { user, setUser, logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const [about, setAbout] = useState(user?.about || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [certifications, setCertifications] = useState(() => parseCerts(user));
  const [certDraft, setCertDraft] = useState(emptyCert);
  const [notifyNewJobs, setNotifyNewJobs] = useState(user?.notifyNewJobs !== false);
  const [notifySms, setNotifySms] = useState(Boolean(user?.notifySms));

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deactivatePassword, setDeactivatePassword] = useState('');

  useEffect(() => {
    if (!user) return;
    setAbout(user.about || '');
    setPhone(user.phone || '');
    setCertifications(parseCerts(user));
    setNotifyNewJobs(user.notifyNewJobs !== false);
    setNotifySms(Boolean(user.notifySms));
  }, [user]);

  const persistUser = async (updated) => {
    await saveCachedUser(updated);
    setUser(updated);
  };

  const addCertification = () => {
    const title = certDraft.title.trim();
    if (!title) {
      Alert.alert('Required', 'Enter a certification title.');
      return;
    }
    setCertifications((list) => [
      ...list,
      { title, issuer: certDraft.issuer.trim(), year: certDraft.year.trim() },
    ]);
    setCertDraft(emptyCert());
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/nurses/me/settings', {
        about,
        certifications,
        notifyNewJobs,
        notifySms,
      });
      if (phone !== (user?.phone || '')) {
        const { data: prof } = await api.put('/nurses/me', { phone });
        await persistUser({ ...data.user, phone: prof.user.phone });
      } else {
        await persistUser(data.user);
      }
      Alert.alert('Saved', 'Settings updated.');
    } catch (err) {
      Alert.alert('Error', apiErrorMessage(err, 'Could not save settings.'));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Password too short', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }
    setPwdSaving(true);
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Done', 'Password updated.');
    } catch (err) {
      Alert.alert('Error', apiErrorMessage(err, 'Could not change password.'));
    } finally {
      setPwdSaving(false);
    }
  };

  const deactivateAccount = () => {
    if (!deactivatePassword) {
      Alert.alert('Required', 'Enter your password to confirm.');
      return;
    }
    Alert.alert(
      'Deactivate account',
      'Your profile will be hidden from patients until support reactivates you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            setDeactivating(true);
            try {
              await api.post('/auth/deactivate-account', { password: deactivatePassword });
              await logout();
              router.replace('/(auth)/staff-login?provider=1');
            } catch (err) {
              Alert.alert('Error', apiErrorMessage(err, 'Could not deactivate account.'));
            } finally {
              setDeactivating(false);
            }
          },
        },
      ]
    );
  };

  const onLogout = () => {
    Alert.alert('Log out', 'Sign out of your caregiver account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/landing');
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <CaregiverScreenHeader title="Settings" subtitle="Account & preferences" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFromName(user?.name)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.name}>{user?.name}</Text>
              <Text style={styles.email}>{user?.email}</Text>
            </View>
          </View>
          <TextField
            label="About"
            value={about}
            onChangeText={setAbout}
            placeholder="Short bio for your profile"
            multiline
            style={styles.aboutField}
          />
          <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Certifications</Text>
          <TextField
            label="Title"
            value={certDraft.title}
            onChangeText={(v) => setCertDraft((d) => ({ ...d, title: v }))}
            placeholder="BLS, RN, etc."
          />
          <TextField
            label="Issuer"
            value={certDraft.issuer}
            onChangeText={(v) => setCertDraft((d) => ({ ...d, issuer: v }))}
          />
          <TextField
            label="Year"
            value={certDraft.year}
            onChangeText={(v) => setCertDraft((d) => ({ ...d, year: v }))}
            keyboardType="number-pad"
          />
          <Button label="Add certification" variant="outline" onPress={addCertification} />
          {certifications.map((c, i) => (
            <View key={`${c.title}-${i}`} style={styles.certRow}>
              <View style={styles.flex}>
                <Text style={styles.certTitle}>{c.title}</Text>
                {(c.issuer || c.year) ? (
                  <Text style={styles.certMeta}>{[c.issuer, c.year].filter(Boolean).join(' · ')}</Text>
                ) : null}
              </View>
              <Pressable onPress={() => setCertifications((list) => list.filter((_, j) => j !== i))}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>New job alerts</Text>
            <Switch value={notifyNewJobs} onValueChange={setNotifyNewJobs} trackColor={{ true: colors.brand }} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>SMS for urgent bookings</Text>
            <Switch value={notifySms} onValueChange={setNotifySms} trackColor={{ true: colors.brand }} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Change password</Text>
          <TextField
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />
          <TextField label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
          <TextField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <Button label="Update password" onPress={changePassword} loading={pwdSaving} variant="outline" />
        </View>

        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.dangerTitle}>Deactivate account</Text>
          <Text style={styles.dangerHint}>
            You will be hidden from patients and stop receiving new bookings.
          </Text>
          <TextField
            label="Confirm password"
            value={deactivatePassword}
            onChangeText={setDeactivatePassword}
            secureTextEntry
          />
          <Button
            label="Deactivate account"
            onPress={deactivateAccount}
            loading={deactivating}
            variant="outline"
          />
        </View>

        <Button label="Save settings" onPress={saveSettings} loading={saving} />

        <Pressable style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.brand },
  name: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  email: { fontSize: fontSize.sm, color: colors.muted },
  aboutField: { minHeight: 80 },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  certTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  certMeta: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  switchLabel: { fontSize: fontSize.sm, color: colors.text, flex: 1, paddingRight: spacing.md },
  dangerCard: { borderColor: '#fecdd3', backgroundColor: '#fff1f2' },
  dangerTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.danger },
  dangerHint: { fontSize: fontSize.sm, color: colors.muted, lineHeight: 20 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: fontSize.sm },
});
