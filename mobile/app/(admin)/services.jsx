import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { api, apiErrorMessage } from '../../src/api/client';
import { fmtInr } from '../../src/lib/adminFormat';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

const MODE_OPTIONS = [
  { id: 'new', label: 'New service section' },
  { id: 'existing', label: 'Add to existing section' },
];

const newSubService = () => ({ name: '', rate: '499', description: '' });

export default function AdminServicesScreen() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({
    mode: 'new',
    existingSectionId: '',
    serviceName: '',
    subServices: [newSubService()],
  });

  const load = useCallback(async () => {
    const { data } = await api.get('/marketing-services/admin/all');
    setSections(data.sections || []);
  }, []);

  const sectionOptions = useMemo(
    () =>
      sections.map((s) => ({
        id: s.id,
        label: s.title || s.serviceName || s.id,
      })),
    [sections]
  );

  const selectedSection = useMemo(
    () => sections.find((s) => s.id === form.existingSectionId) || null,
    [sections, form.existingSectionId]
  );

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

  const updateSubService = (index, patch) => {
    setForm((current) => ({
      ...current,
      subServices: current.subServices.map((row, idx) => (idx === index ? { ...row, ...patch } : row)),
    }));
  };

  const addSubServiceRow = () => {
    setForm((current) => ({ ...current, subServices: [...current.subServices, newSubService()] }));
  };

  const removeSubServiceRow = (index) => {
    setForm((current) => ({
      ...current,
      subServices:
        current.subServices.length === 1
          ? current.subServices
          : current.subServices.filter((_, idx) => idx !== index),
    }));
  };

  const resetForm = () => {
    setForm({
      mode: 'new',
      existingSectionId: '',
      serviceName: '',
      subServices: [newSubService()],
    });
  };

  const submit = async () => {
    const serviceName =
      form.mode === 'existing'
        ? String(selectedSection?.title || selectedSection?.serviceName || '').trim()
        : form.serviceName.trim();

    const cleaned = form.subServices
      .map((row) => ({
        name: row.name.trim(),
        rate: Math.max(0, Math.round(Number(row.rate)) || 0),
        description: row.description.trim() || undefined,
      }))
      .filter((row) => row.name);

    if (!serviceName) {
      Alert.alert('Missing service', form.mode === 'existing' ? 'Pick an existing section.' : 'Enter a service name.');
      return;
    }
    if (cleaned.length === 0) {
      Alert.alert('Missing sub-services', 'Add at least one sub-service with a name.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/marketing-services/admin', {
        serviceName,
        subServices: cleaned,
      });
      resetForm();
      await load();
      Alert.alert(
        'Saved',
        form.mode === 'existing'
          ? `Added ${cleaned.length} sub-service(s) to ${serviceName}.`
          : `Created ${serviceName} with ${cleaned.length} sub-service(s).`
      );
    } catch (err) {
      Alert.alert('Could not save', apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = async (section) => {
    try {
      await api.patch(`/marketing-services/admin/${section.id}`, { active: section.active === false });
      await load();
    } catch (err) {
      Alert.alert('Error', apiErrorMessage(err));
    }
  };

  const removeSection = (section) => {
    Alert.alert('Remove service', `Remove ${section.title}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/marketing-services/admin/${section.id}`);
            await load();
          } catch (err) {
            Alert.alert('Error', apiErrorMessage(err));
          }
        },
      },
    ]);
  };

  const toggleSubService = async (section, service) => {
    try {
      await api.patch(`/marketing-services/admin/${section.id}/services/${service.id}`, {
        active: service.active === false,
      });
      await load();
    } catch (err) {
      Alert.alert('Error', apiErrorMessage(err));
    }
  };

  const removeSubService = (section, service) => {
    Alert.alert('Remove sub-service', `Remove ${service.laymanName || service.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/marketing-services/admin/${section.id}/services/${service.id}`);
            await load();
          } catch (err) {
            Alert.alert('Error', apiErrorMessage(err));
          }
        },
      },
    ]);
  };

  const quickAddToSection = (section) => {
    setForm({
      mode: 'existing',
      existingSectionId: section.id,
      serviceName: '',
      subServices: [newSubService()],
    });
  };

  return (
    <View style={styles.safe}>
      <AdminScreenHeader
        title="Services catalog"
        subtitle="Create service sections and multiple sub-services (no images required)."
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create / extend catalog</Text>

          <SelectField
            label="Action"
            value={form.mode}
            options={MODE_OPTIONS}
            onChange={(mode) =>
              setForm((f) => ({
                ...f,
                mode,
                existingSectionId: mode === 'existing' ? f.existingSectionId : '',
              }))
            }
          />

          {form.mode === 'new' ? (
            <TextField
              label="Service section name"
              value={form.serviceName}
              onChangeText={(serviceName) => setForm((f) => ({ ...f, serviceName }))}
              placeholder="e.g. Elder Care, Smart Care"
            />
          ) : sectionOptions.length === 0 ? (
            <Text style={styles.hint}>No custom sections yet — create one first.</Text>
          ) : (
            <SelectField
              label="Existing section"
              value={form.existingSectionId}
              options={sectionOptions}
              onChange={(existingSectionId) => setForm((f) => ({ ...f, existingSectionId }))}
            />
          )}

          <View style={styles.subHeader}>
            <Text style={styles.subTitle}>Sub-services</Text>
            <Pressable onPress={addSubServiceRow} style={styles.addRowBtn}>
              <Ionicons name="add-circle" size={18} color={colors.brand} />
              <Text style={styles.addRowText}>Add row</Text>
            </Pressable>
          </View>

          {form.subServices.map((row, index) => (
            <View key={index} style={styles.subDraft}>
              <View style={styles.subDraftHead}>
                <Text style={styles.subDraftLabel}>Sub-service {index + 1}</Text>
                {form.subServices.length > 1 ? (
                  <Pressable onPress={() => removeSubServiceRow(index)}>
                    <Text style={styles.removeRowText}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
              <TextField
                label="Name"
                value={row.name}
                onChangeText={(name) => updateSubService(index, { name })}
                placeholder="e.g. Bedside nursing"
              />
              <TextField
                label="Rate (INR)"
                value={row.rate}
                onChangeText={(rate) => updateSubService(index, { rate })}
                keyboardType="number-pad"
              />
              <TextField
                label="Description (optional)"
                value={row.description}
                onChangeText={(description) => updateSubService(index, { description })}
              />
            </View>
          ))}

          <Button label="Save service & sub-services" onPress={submit} loading={saving} />
        </View>

        <Text style={styles.sectionTitle}>
          All custom sections ({sections.length})
        </Text>
        {loading ? (
          <ActivityIndicator color={colors.brand} />
        ) : sections.length === 0 ? (
          <Text style={styles.empty}>No custom services yet. Create one above.</Text>
        ) : (
          sections.map((section) => {
            const open = expandedId === section.id;
            const subCount = (section.services || []).length;
            return (
              <View key={section.id} style={styles.card}>
                <Pressable
                  onPress={() => setExpandedId(open ? null : section.id)}
                  style={styles.cardHead}
                >
                  <View style={styles.cardMain}>
                    <Text style={styles.name}>{section.title || section.serviceName}</Text>
                    <Text style={styles.meta}>
                      {section.active === false ? 'Hidden' : 'Visible'} · {subCount} sub-service
                      {subCount === 1 ? '' : 's'}
                    </Text>
                    {section.tagline ? <Text style={styles.tagline}>{section.tagline}</Text> : null}
                  </View>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
                </Pressable>

                {open ? (
                  <View style={styles.expanded}>
                    <View style={styles.actions}>
                      <Pressable onPress={() => quickAddToSection(section)} style={styles.actionBtn}>
                        <Text style={styles.actionText}>+ Add sub-service</Text>
                      </Pressable>
                      <Pressable onPress={() => toggleSection(section)} style={styles.actionBtn}>
                        <Text style={styles.actionText}>{section.active === false ? 'Show' : 'Hide'}</Text>
                      </Pressable>
                      <Pressable onPress={() => removeSection(section)} style={styles.actionBtn}>
                        <Text style={[styles.actionText, styles.dangerText]}>Remove</Text>
                      </Pressable>
                    </View>
                    {(section.services || []).map((svc) => (
                      <View key={svc.id} style={styles.subRow}>
                        <View style={styles.subMain}>
                          <Text style={styles.subName}>{svc.laymanName || svc.name}</Text>
                          <Text style={styles.subMeta}>
                            {fmtInr(svc.rate)} · {svc.active === false ? 'hidden' : 'visible'}
                          </Text>
                          {svc.description || svc.tagline ? (
                            <Text style={styles.subDesc}>{svc.description || svc.tagline}</Text>
                          ) : null}
                        </View>
                        <View style={styles.subActions}>
                          <Pressable onPress={() => toggleSubService(section, svc)} style={styles.actionBtn}>
                            <Text style={styles.actionText}>{svc.active === false ? 'Show' : 'Hide'}</Text>
                          </Pressable>
                          <Pressable onPress={() => removeSubService(section, svc)} style={styles.actionBtn}>
                            <Text style={[styles.actionText, styles.dangerText]}>Remove</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })
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
  hint: { fontSize: fontSize.sm, color: colors.muted },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subTitle: { fontSize: fontSize.sm, fontWeight: '800', color: colors.text },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addRowText: { color: colors.brand, fontWeight: '800', fontSize: fontSize.sm },
  subDraft: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  subDraftHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subDraftLabel: { fontSize: fontSize.xs, fontWeight: '800', color: colors.muted, textTransform: 'uppercase' },
  removeRowText: { color: colors.danger, fontWeight: '700', fontSize: fontSize.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  empty: { color: colors.muted, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  cardMain: { flex: 1 },
  name: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  tagline: { fontSize: fontSize.xs, color: colors.muted, marginTop: 4, lineHeight: 18 },
  expanded: { borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md, gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subMain: { flex: 1 },
  subName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  subMeta: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  subDesc: { fontSize: fontSize.xs, color: colors.text, marginTop: 4, lineHeight: 16 },
  subActions: { alignItems: 'flex-end', gap: 2 },
  actionBtn: { paddingHorizontal: spacing.xs, paddingVertical: 2 },
  actionText: { fontSize: fontSize.xs, fontWeight: '800', color: colors.brand },
  dangerText: { color: colors.danger },
});
