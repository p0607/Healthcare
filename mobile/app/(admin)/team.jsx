import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { ADMIN_TIER_LABELS, isSuperAdminUser } from '@nursecare/shared/adminPermissions';
import AdminScreenHeader from '../../src/components/AdminScreenHeader';
import Button from '../../src/components/Button';
import SelectField from '../../src/components/SelectField';
import TextField from '../../src/components/TextField';
import { useAuth } from '../../src/context/AuthContext';
import { api, apiErrorMessage } from '../../src/api/client';
import { fmtShortDate } from '../../src/lib/adminFormat';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

const TIER_OPTIONS = [
  { id: 'admin', label: 'Admin' },
  { id: 'super_admin', label: 'Super admin' },
];

export default function AdminTeamScreen() {
  const { user } = useAuth();
  const superAdmin = isSuperAdminUser(user);

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    adminTier: 'admin',
  });

  const load = useCallback(async () => {
    const { data } = await api.get('/admin/team');
    setAdmins(data.admins || []);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (err) {
      Alert.alert('Error', apiErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    if (!superAdmin) return;
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch (err) {
        Alert.alert('Error', apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [load, superAdmin]);

  if (!superAdmin) {
    return <Redirect href="/(admin)/home" />;
  }

  const createAdmin = async () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    if (!name || !email || !password) {
      Alert.alert('Missing fields', 'Name, email, and password are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/team', {
        name,
        email,
        password,
        adminTier: form.adminTier,
      });
      setForm({ name: '', email: '', password: '', adminTier: 'admin' });
      await load();
      Alert.alert('Created', `Admin account created for ${email}.`);
    } catch (err) {
      Alert.alert('Could not create', apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safe}>
      <AdminScreenHeader
        title="Admin team"
        subtitle="Provision admin accounts. Only super admins can access this."
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create admin</Text>
          <TextField
            label="Full name"
            value={form.name}
            onChangeText={(name) => setForm((f) => ({ ...f, name }))}
          />
          <TextField
            label="Email"
            value={form.email}
            onChangeText={(email) => setForm((f) => ({ ...f, email }))}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextField
            label="Password"
            value={form.password}
            onChangeText={(password) => setForm((f) => ({ ...f, password }))}
            secureTextEntry
          />
          <SelectField
            label="Tier"
            value={form.adminTier}
            options={TIER_OPTIONS}
            onChange={(adminTier) => setForm((f) => ({ ...f, adminTier }))}
          />
          <Button label="Create admin" onPress={createAdmin} loading={saving} />
        </View>

        <Text style={styles.sectionTitle}>Team members</Text>
        {loading ? (
          <ActivityIndicator color={colors.brand} />
        ) : admins.length === 0 ? (
          <Text style={styles.empty}>No admin accounts yet.</Text>
        ) : (
          admins.map((admin) => (
            <View key={admin.id} style={styles.card}>
              <Text style={styles.name}>{admin.name}</Text>
              <Text style={styles.meta}>{admin.email}</Text>
              <Text style={styles.meta}>
                {ADMIN_TIER_LABELS[admin.adminTier] || 'Admin'} ·{' '}
                {admin.accountActive === false ? 'Inactive' : 'Active'} · Joined {fmtShortDate(admin.createdAt)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  formCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  formTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  empty: { color: colors.muted, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
  },
  name: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.muted },
});
