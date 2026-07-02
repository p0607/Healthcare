import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AdminScreenHeader from '../../src/components/AdminScreenHeader';
import Button from '../../src/components/Button';
import SelectField from '../../src/components/SelectField';
import TextField from '../../src/components/TextField';
import { useAuth } from '../../src/context/AuthContext';
import { api, apiErrorMessage } from '../../src/api/client';
import { fmtInr, serviceLabel } from '../../src/lib/adminFormat';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

const TAB_OPTIONS = [
  { id: 'nurse_visit', label: 'Nurse visit' },
  { id: 'doctor_consult', label: 'Doctor' },
  { id: 'physiotherapy', label: 'Physio' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'all', label: 'All tabs' },
];

const BOOKING_TAB_OPTIONS = TAB_OPTIONS.filter((t) => t.id !== 'all');

const newDraftRow = () => ({ label: '', description: '', rate: '499' });

export default function AdminVisitOptionsScreen() {
  const { user, hydrating } = useAuth();
  const [listTabFilter, setListTabFilter] = useState('nurse_visit');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serviceType, setServiceType] = useState('nurse_visit');
  const [draftRows, setDraftRows] = useState([newDraftRow()]);

  const load = useCallback(async () => {
    if (hydrating || user?.role !== 'admin') return;
    const params = listTabFilter === 'all' ? {} : { serviceType: listTabFilter };
    const { data } = await api.get('/care-services/admin/all', { params });
    setOptions(data.options || []);
    setLoadError('');
  }, [hydrating, user?.role, listTabFilter]);

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
    if (hydrating) return;
    if (user?.role !== 'admin') {
      setLoading(false);
      setOptions([]);
      setLoadError('Admin access required. Sign in from Admin login.');
      return;
    }
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch (err) {
        const msg = apiErrorMessage(err);
        setLoadError(msg);
        setOptions([]);
        Alert.alert('Could not load visit options', msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [hydrating, user?.role, load]);

  const updateDraft = (index, patch) => {
    setDraftRows((rows) => rows.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const addDraftRow = () => setDraftRows((rows) => [...rows, newDraftRow()]);

  const removeDraftRow = (index) => {
    setDraftRows((rows) => (rows.length === 1 ? rows : rows.filter((_, idx) => idx !== index)));
  };

  const addOptions = async () => {
    if (hydrating || user?.role !== 'admin') {
      Alert.alert('Admin required', 'Sign in from Admin login to manage visit options.');
      return;
    }
    const cleaned = draftRows
      .map((row) => ({
        label: row.label.trim(),
        description: row.description.trim() || undefined,
        rate: Math.max(0, Math.round(Number(row.rate)) || 0),
      }))
      .filter((row) => row.label);

    if (cleaned.length === 0) {
      Alert.alert('Missing labels', 'Enter at least one service label.');
      return;
    }

    setSaving(true);
    try {
      for (const row of cleaned) {
        await api.post('/care-services', {
          label: row.label,
          description: row.description,
          serviceType,
          rate: row.rate,
        });
      }
      setDraftRows([newDraftRow()]);
      await load();
      setListTabFilter(serviceType);
      Alert.alert('Saved', `Added ${cleaned.length} visit option(s).`);
    } catch (err) {
      Alert.alert('Could not add', apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (option) => {
    try {
      await api.patch(`/care-services/${option.id}`, { active: !option.active });
      await load();
    } catch (err) {
      Alert.alert('Error', apiErrorMessage(err));
    }
  };

  const removeOption = (option) => {
    Alert.alert('Remove option', `Remove "${option.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/care-services/${option.id}`);
            await load();
          } catch (err) {
            Alert.alert('Error', apiErrorMessage(err));
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.safe}>
      <AdminScreenHeader
        title="Visit options"
        subtitle="Patient booking sub-services — add multiple at once, no images needed."
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <SelectField
          label="Browse tab"
          value={listTabFilter}
          options={TAB_OPTIONS}
          onChange={setListTabFilter}
        />

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add visit options</Text>
          <SelectField
            label="Booking tab"
            value={serviceType}
            options={BOOKING_TAB_OPTIONS}
            onChange={setServiceType}
          />

          <View style={styles.subHeader}>
            <Text style={styles.subTitle}>Options to create</Text>
            <Pressable onPress={addDraftRow} style={styles.addRowBtn}>
              <Ionicons name="add-circle" size={18} color={colors.brand} />
              <Text style={styles.addRowText}>Add row</Text>
            </Pressable>
          </View>

          {draftRows.map((row, index) => (
            <View key={index} style={styles.draftRow}>
              <View style={styles.draftHead}>
                <Text style={styles.draftLabel}>Option {index + 1}</Text>
                {draftRows.length > 1 ? (
                  <Pressable onPress={() => removeDraftRow(index)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
              <TextField
                label="Label"
                value={row.label}
                onChangeText={(label) => updateDraft(index, { label })}
                placeholder="e.g. Wound dressing at home"
              />
              <TextField
                label="Rate (INR)"
                value={row.rate}
                onChangeText={(rate) => updateDraft(index, { rate })}
                keyboardType="number-pad"
              />
              <TextField
                label="Description (optional)"
                value={row.description}
                onChangeText={(description) => updateDraft(index, { description })}
              />
            </View>
          ))}

          <Button label="Save visit options" onPress={addOptions} loading={saving} />
        </View>

        <Text style={styles.sectionTitle}>
          All options ({options.length})
        </Text>
        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
        {loading ? (
          <ActivityIndicator color={colors.brand} />
        ) : options.length === 0 ? (
          <Text style={styles.empty}>No options for this tab.</Text>
        ) : (
          options.map((option) => (
            <View key={option.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardMain}>
                  <Text style={styles.name}>{option.label}</Text>
                  <Text style={styles.meta}>
                    {serviceLabel(option.serviceType)} · {fmtInr(option.rate)} ·{' '}
                    {option.active === false ? 'inactive' : 'active'}
                  </Text>
                  {option.description ? <Text style={styles.desc}>{option.description}</Text> : null}
                </View>
                <View style={styles.actions}>
                  <Pressable onPress={() => toggleActive(option)} style={styles.actionBtn}>
                    <Text style={styles.actionText}>{option.active === false ? 'Activate' : 'Deactivate'}</Text>
                  </Pressable>
                  <Pressable onPress={() => removeOption(option)} style={styles.actionBtn}>
                    <Text style={[styles.actionText, styles.dangerText]}>Remove</Text>
                  </Pressable>
                </View>
              </View>
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
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subTitle: { fontSize: fontSize.sm, fontWeight: '800', color: colors.text },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addRowText: { color: colors.brand, fontWeight: '800', fontSize: fontSize.sm },
  draftRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  draftHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  draftLabel: { fontSize: fontSize.xs, fontWeight: '800', color: colors.muted, textTransform: 'uppercase' },
  removeText: { color: colors.danger, fontWeight: '700', fontSize: fontSize.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  errorText: { color: colors.danger, fontSize: fontSize.sm, lineHeight: 18 },
  empty: { color: colors.muted, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  cardMain: { flex: 1 },
  name: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  desc: { fontSize: fontSize.sm, color: colors.text, marginTop: 4, lineHeight: 18 },
  actions: { gap: spacing.xs, alignItems: 'flex-end' },
  actionBtn: { paddingHorizontal: spacing.xs, paddingVertical: 2 },
  actionText: { fontSize: fontSize.xs, fontWeight: '800', color: colors.brand },
  dangerText: { color: colors.danger },
});
