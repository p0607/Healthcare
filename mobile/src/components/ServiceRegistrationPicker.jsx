import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../api/client';
import { labelForRegisterServiceType } from '../lib/accountKinds';
import TextField from './TextField';
import { colors, fontSize, radius, spacing } from '../theme/theme';

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

export default function ServiceRegistrationPicker({
  caregiverCategory,
  onCaregiverCategoryChange,
  careOfferings,
  onCareOfferingsChange,
  specialization,
  onSpecializationChange,
  licenseNumber,
  onLicenseNumberChange,
  specializationPlaceholder,
}) {
  const [types, setTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState('');
  const [catalog, setCatalog] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTypesLoading(true);
      try {
        const { data } = await api.get('/care-services/available-types');
        if (!cancelled) {
          setTypes(
            (data.types || []).map((t) => ({
              ...t,
              label: t.label || labelForRegisterServiceType(t.serviceType),
            }))
          );
        }
      } catch (err) {
        if (!cancelled) {
          setTypes([]);
          setTypesError(err?.response?.data?.message || 'Could not load services');
        }
      } finally {
        if (!cancelled) setTypesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCategory = useMemo(() => {
    if (caregiverCategory && types.some((t) => t.serviceType === caregiverCategory)) {
      return caregiverCategory;
    }
    return types[0]?.serviceType || '';
  }, [caregiverCategory, types]);

  useEffect(() => {
    if (!types.length) return;
    if (!caregiverCategory || !types.some((t) => t.serviceType === caregiverCategory)) {
      onCaregiverCategoryChange?.(types[0].serviceType);
    }
  }, [types, caregiverCategory, onCaregiverCategoryChange]);

  useEffect(() => {
    let cancelled = false;
    if (!activeCategory) {
      setCatalog([]);
      return undefined;
    }
    (async () => {
      try {
        const { data } = await api.get('/care-services', { params: { serviceType: activeCategory } });
        if (!cancelled) setCatalog(data.options || []);
      } catch {
        if (!cancelled) setCatalog([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCategory]);

  const offeringMap = useMemo(() => {
    const m = new Map();
    (careOfferings || []).forEach((r) => m.set(r.careServiceOptionId, Number(r.rate) || 0));
    return m;
  }, [careOfferings]);

  const toggleOption = (optionId, catalogRate, checked) => {
    if (checked) {
      onCareOfferingsChange(careOfferings.filter((r) => r.careServiceOptionId !== optionId));
    } else {
      onCareOfferingsChange([
        ...careOfferings,
        { careServiceOptionId: optionId, rate: catalogRate || 0 },
      ]);
    }
  };

  const setRate = (optionId, rate) => {
    const next = Math.max(0, Math.round(Number(rate)) || 0);
    const rest = careOfferings.filter((r) => r.careServiceOptionId !== optionId);
    onCareOfferingsChange([...rest, { careServiceOptionId: optionId, rate: next }]);
  };

  const onCategoryPick = (st) => {
    onCaregiverCategoryChange(st);
    onCareOfferingsChange([]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Caregiver type & services</Text>
      {typesError ? <Text style={styles.error}>{typesError}</Text> : null}

      {typesLoading ? (
        <ActivityIndicator color={colors.brand} />
      ) : types.length === 0 ? (
        <Text style={styles.hint}>No services open for registration yet. Ask an admin to add sub-services.</Text>
      ) : (
        <>
          <Text style={styles.label}>I am a</Text>
          <View style={styles.chipRow}>
            {types.map((t) => {
              const active = activeCategory === t.serviceType;
              return (
                <Pressable
                  key={t.serviceType}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => onCategoryPick(t.serviceType)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextField
            label="Specialization"
            value={specialization}
            onChangeText={onSpecializationChange}
            placeholder={specializationPlaceholder || 'Your specialty'}
          />
          <TextField
            label="License number (optional)"
            value={licenseNumber}
            onChangeText={onLicenseNumberChange}
            placeholder="e.g. RN-1001"
          />

          <Text style={styles.label}>Sub-services you offer</Text>
          <Text style={styles.hint}>Select at least one and set your rate (INR).</Text>

          {catalog.length === 0 ? (
            <Text style={styles.hint}>No sub-services for {labelForRegisterServiceType(activeCategory)} yet.</Text>
          ) : (
            catalog.map((opt) => {
              const checked = offeringMap.has(opt.id);
              return (
                <View key={opt.id} style={[styles.optionRow, checked && styles.optionSelected]}>
                  <Pressable style={styles.optionMain} onPress={() => toggleOption(opt.id, opt.rate, checked)}>
                    <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                      {checked ? <Text style={styles.checkMark}>✓</Text> : null}
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.optionLabel}>{opt.label}</Text>
                      <Text style={styles.catalogRate}>Catalog: {fmtInr(opt.rate)}</Text>
                    </View>
                  </Pressable>
                  {checked ? (
                    <TextInput
                      style={styles.rateInput}
                      keyboardType="number-pad"
                      value={String(offeringMap.get(opt.id) ?? opt.rate ?? 0)}
                      onChangeText={(v) => setRate(opt.id, v)}
                    />
                  ) : null}
                </View>
              );
            })
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  heading: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  label: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  hint: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 18 },
  error: { fontSize: fontSize.sm, color: colors.danger, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  chipText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.muted },
  chipTextActive: { color: colors.brand },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  optionSelected: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  optionMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { borderColor: colors.brand, backgroundColor: colors.brand },
  checkMark: { color: colors.white, fontSize: 12, fontWeight: '800' },
  optionLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  catalogRate: { fontSize: fontSize.xs, color: colors.muted },
  rateInput: {
    width: 72,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
    backgroundColor: colors.background,
    textAlign: 'center',
  },
});
