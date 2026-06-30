import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { filterOfferingsForService, resolveCaregiverServiceType } from '@nursecare/shared';
import { useAuth } from '../../src/context/AuthContext';
import { api, apiErrorMessage } from '../../src/api/client';
import Button from '../../src/components/Button';
import CaregiverScreenHeader from '../../src/components/CaregiverScreenHeader';
import ServiceRegistrationPicker from '../../src/components/ServiceRegistrationPicker';
import TextField from '../../src/components/TextField';
import { saveCachedUser } from '../../src/storage/session';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

export default function CaregiverProfileScreen() {
  const { user, setUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.location?.address || '',
    specialization: user?.specialization || '',
    licenseNumber: user?.licenseNumber || '',
  });
  const [caregiverCategory, setCaregiverCategory] = useState(user?.caregiverCategory || 'nurse_visit');
  const [careOfferings, setCareOfferings] = useState([]);

  const serviceType = useMemo(
    () =>
      resolveCaregiverServiceType(
        user?.careOfferings,
        form.specialization || user?.specialization,
        user?.caregiverCategory
      ),
    [user?.careOfferings, form.specialization, user?.specialization, user?.caregiverCategory]
  );

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      address: user.location?.address || '',
      specialization: user.specialization || '',
      licenseNumber: user.licenseNumber || '',
    });
    setCaregiverCategory(user.caregiverCategory || 'nurse_visit');
    setCareOfferings(filterOfferingsForService(user.careOfferings, serviceType));
  }, [user?._id, user?.careOfferings, serviceType]);

  const saveProfile = async () => {
    if (careOfferings.length === 0) {
      Alert.alert('Sub-services required', 'Select at least one sub-service with a rate.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/nurses/me', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        specialization: form.specialization.trim(),
        licenseNumber: form.licenseNumber.trim(),
        location: {
          address: form.address.trim(),
          ...(user?.location?.coordinates?.length === 2
            ? { coordinates: user.location.coordinates }
            : {}),
        },
        careOfferings: careOfferings.map(({ careServiceOptionId, rate }) => ({
          careServiceOptionId,
          rate: Math.max(0, Math.round(Number(rate)) || 0),
        })),
      });
      if (data?.user) {
        await saveCachedUser(data.user);
        setUser(data.user);
      }
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (err) {
      Alert.alert('Error', apiErrorMessage(err, 'Could not save profile.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <CaregiverScreenHeader title="Profile" subtitle="Professional details" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          For photo, password, and notifications, open the Settings tab.
        </Text>

        <View style={styles.card}>
          <TextField
            label="Full name"
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="Your name"
          />
          <TextField
            label="Phone"
            value={form.phone}
            onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
            placeholder="+91..."
            keyboardType="phone-pad"
          />
          <TextField
            label="Address"
            value={form.address}
            onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
            placeholder="Service area address"
          />
          <TextField
            label="Qualification"
            value={form.specialization}
            onChangeText={(v) => setForm((f) => ({ ...f, specialization: v }))}
            placeholder="e.g. General Nursing"
          />
          <TextField
            label="License number"
            value={form.licenseNumber}
            onChangeText={(v) => setForm((f) => ({ ...f, licenseNumber: v }))}
            placeholder="RN-1001"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sub-services & rates</Text>
          <ServiceRegistrationPicker
            caregiverCategory={caregiverCategory}
            onCaregiverCategoryChange={setCaregiverCategory}
            careOfferings={careOfferings}
            onCareOfferingsChange={setCareOfferings}
            specialization={form.specialization}
            onSpecializationChange={(v) => setForm((f) => ({ ...f, specialization: v }))}
            licenseNumber={form.licenseNumber}
            onLicenseNumberChange={(v) => setForm((f) => ({ ...f, licenseNumber: v }))}
          />
        </View>

        <Button label="Save profile" onPress={saveProfile} loading={saving} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  hint: { fontSize: fontSize.sm, color: colors.muted, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
});
