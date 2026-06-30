import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {
  CAREGIVER_SERVICE_TYPES,
  caregiverServiceLabel,
  resolveCaregiverServiceType,
} from '@nursecare/shared/caregiverServices';
import AdminScreenHeader from '../../src/components/AdminScreenHeader';
import Button from '../../src/components/Button';
import SelectField from '../../src/components/SelectField';
import TextField from '../../src/components/TextField';
import { api, apiErrorMessage } from '../../src/api/client';
import { fmtInr, fmtShortDate, roleLabel, userId } from '../../src/lib/adminFormat';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

const ROLE_OPTIONS = [
  { id: 'user', label: 'Patient' },
  { id: 'nurse', label: 'Caregiver' },
];

const CATEGORY_OPTIONS = CAREGIVER_SERVICE_TYPES.map((t) => ({ id: t.value, label: t.label }));

export default function AdminUsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/nurses/admin/users');
    setUsers(data.users || []);
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
  }, [load]);

  const openEdit = (u) => {
    setEditingUser(u);
    setDraft({
      role: u.role || 'user',
      caregiverCategory:
        u.caregiverCategory || resolveCaregiverServiceType(u.careOfferings, u.specialization) || 'nurse_visit',
      specialization: u.specialization || '',
      phone: u.phone || '',
      available: u.available !== false,
    });
  };

  const closeEdit = () => {
    setEditingUser(null);
    setDraft({});
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const payload = { role: draft.role, phone: draft.phone };
      if (draft.role === 'nurse') {
        payload.caregiverCategory = draft.caregiverCategory;
        payload.specialization = draft.specialization;
        payload.available = draft.available;
      }
      const { data } = await api.patch(`/nurses/admin/users/${userId(editingUser)}`, payload);
      setUsers((list) => list.map((u) => (userId(u) === userId(editingUser) ? data.user : u)));
      closeEdit();
      Alert.alert('Saved', 'User updated.');
    } catch (err) {
      Alert.alert('Could not save', apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const isCaregiver = draft.role === 'nurse';

  return (
    <View style={styles.safe}>
      <AdminScreenHeader
        title="Users"
        subtitle="Edit login role, category, phone, and availability."
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading ? (
          <ActivityIndicator color={colors.brand} style={styles.loader} />
        ) : users.length === 0 ? (
          <Text style={styles.empty}>No users yet.</Text>
        ) : (
          users.map((u) => {
            const id = userId(u);
            const offerings = u.careOfferings || [];
            const serviceType = resolveCaregiverServiceType(
              offerings,
              u.specialization,
              u.caregiverCategory
            );
            return (
              <View key={id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardMain}>
                    <Text style={styles.name}>{u.name}</Text>
                    <Text style={styles.meta}>{u.email}</Text>
                    <Text style={styles.meta}>{roleLabel(u.role)} · Joined {fmtShortDate(u.createdAt)}</Text>
                    {u.role === 'nurse' ? (
                      <Text style={styles.meta}>
                        {caregiverServiceLabel(serviceType)} · {u.specialization || 'No specialization'}
                      </Text>
                    ) : null}
                  </View>
                  {u.role !== 'admin' ? (
                    <Pressable onPress={() => openEdit(u)} style={styles.editBtn}>
                      <Text style={styles.editText}>Edit</Text>
                    </Pressable>
                  ) : null}
                </View>
                {offerings.length > 0 ? (
                  <View style={styles.tags}>
                    {offerings.slice(0, 4).map((o) => (
                      <Text key={o.careServiceOptionId} style={styles.tag}>
                        {o.label || 'Service'} · {fmtInr(o.rate)}
                      </Text>
                    ))}
                    {offerings.length > 4 ? (
                      <Text style={styles.tagMuted}>+{offerings.length - 4} more</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={Boolean(editingUser)} animationType="slide" transparent onRequestClose={closeEdit}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit user</Text>
            <Text style={styles.modalSubtitle}>{editingUser?.name}</Text>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <SelectField
                label="Login role"
                value={draft.role}
                options={ROLE_OPTIONS}
                onChange={(role) => setDraft((d) => ({ ...d, role }))}
              />
              {isCaregiver ? (
                <>
                  <SelectField
                    label="Category"
                    value={draft.caregiverCategory}
                    options={CATEGORY_OPTIONS}
                    onChange={(caregiverCategory) => setDraft((d) => ({ ...d, caregiverCategory }))}
                  />
                  <TextField
                    label="Specialization"
                    value={draft.specialization}
                    onChangeText={(specialization) => setDraft((d) => ({ ...d, specialization }))}
                  />
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Available for jobs</Text>
                    <Switch
                      value={draft.available !== false}
                      onValueChange={(available) => setDraft((d) => ({ ...d, available }))}
                    />
                  </View>
                </>
              ) : null}
              <TextField
                label="Phone"
                value={draft.phone}
                onChangeText={(phone) => setDraft((d) => ({ ...d, phone }))}
                keyboardType="phone-pad"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button label="Cancel" variant="outline" onPress={closeEdit} disabled={saving} style={styles.modalBtn} />
              <Button label="Save" onPress={saveEdit} loading={saving} style={styles.modalBtn} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  loader: { marginTop: spacing.xl },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  cardMain: { flex: 1 },
  name: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  editBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  editText: { color: colors.brand, fontWeight: '800', fontSize: fontSize.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    fontSize: 10,
    color: colors.brand,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagMuted: { fontSize: 10, color: colors.muted },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  modalSubtitle: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2, marginBottom: spacing.md },
  modalForm: { gap: spacing.md, paddingBottom: spacing.md },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  switchLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalBtn: { flex: 1 },
});
