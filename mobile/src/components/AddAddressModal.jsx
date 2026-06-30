import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { composeAddressLabel, deriveAddressDisplayName, resolveDemoIndiaCoordinates } from '@nursecare/shared';
import { getDeviceCoordinates } from '../lib/deviceLocation';
import { reverseGeocode, searchPlaces } from '../lib/geocode';
import TextField from './TextField';
import { colors, fontSize, radius, spacing } from '../theme/theme';

export default function AddAddressModal({ visible, onClose, onSave, initialPin }) {
  const [pin, setPin] = useState(initialPin || [77.5946, 12.9716]);
  const [streetAddress, setStreetAddress] = useState('');
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [room, setRoom] = useState('');
  const [pincode, setPincode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    setPin(initialPin || [77.5946, 12.9716]);
    setStreetAddress('');
    setLocationConfirmed(false);
    setBuilding('');
    setFloor('');
    setRoom('');
    setPincode('');
    setDisplayName('');
    setSearchResults([]);
  }, [visible, initialPin]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = streetAddress.trim();
    if (q.length < 2 || locationConfirmed) {
      setSearchResults([]);
      return undefined;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchPlaces(q);
      setSearchResults(results);
      setSearching(false);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [streetAddress, locationConfirmed]);

  const preview = composeAddressLabel({ streetAddress, building, floor, room, pincode });
  const previewDisplayName = deriveAddressDisplayName(preview, displayName);
  const canSave = locationConfirmed && streetAddress.trim();

  const pickPlace = (place) => {
    setPin([place.lng, place.lat]);
    setStreetAddress(place.label);
    if (place.pincode) setPincode(place.pincode);
    if (place.buildingName && !building.trim()) setBuilding(place.buildingName);
    setLocationConfirmed(true);
    setSearchResults([]);
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow location access to use your current delivery address.');
        return;
      }

      const pos = await getDeviceCoordinates({ demoFallback: true });
      const resolved = resolveDemoIndiaCoordinates(pos.coords.longitude, pos.coords.latitude);
      const lng = resolved.lng;
      const lat = resolved.lat;
      setPin([lng, lat]);

      let label = await reverseGeocode(lng, lat);
      if (!label?.trim()) {
        label = resolved.usedDemoFallback
          ? 'Bengaluru, Karnataka, India'
          : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }

      setStreetAddress(label);
      setLocationConfirmed(true);

      if (resolved.usedDemoFallback) {
        Alert.alert(
          'Demo location used',
          'Device GPS was invalid or unavailable, so we set Bengaluru as your delivery area. You can edit the address below.'
        );
      }
    } catch (err) {
      Alert.alert('Location unavailable', err?.message || 'Could not read your current location.');
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSave?.({
        streetAddress: streetAddress.trim(),
        building: building.trim(),
        floor: floor.trim(),
        room: room.trim(),
        pincode: pincode.trim(),
        displayName: displayName.trim(),
        label: preview,
        coordinates: [...pin],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="location" size={18} color={colors.white} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.title}>Add delivery address</Text>
              <Text style={styles.subtitle}>Search your area, then add building details.</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <Pressable
              style={({ pressed }) => [styles.gpsBtn, pressed && styles.pressed]}
              onPress={useCurrentLocation}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <Ionicons name="navigate" size={16} color={colors.brand} />
              )}
              <Text style={styles.gpsText}>Use current location</Text>
            </Pressable>

            <TextField
              label="Search area / street"
              value={streetAddress}
              onChangeText={(t) => {
                setStreetAddress(t);
                setLocationConfirmed(false);
              }}
              placeholder="Start typing your area…"
            />

            {searching ? (
              <ActivityIndicator size="small" color={colors.brand} style={styles.searchSpinner} />
            ) : null}

            {searchResults.length > 0 && !locationConfirmed ? (
              <View style={styles.results}>
                {searchResults.map((place) => (
                  <Pressable
                    key={place.id}
                    style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}
                    onPress={() => pickPlace(place)}
                  >
                    <Ionicons name="location-outline" size={16} color={colors.brand} />
                    <Text style={styles.resultText} numberOfLines={2}>
                      {place.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {locationConfirmed ? (
              <View style={styles.confirmedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.confirmedText}>Location confirmed</Text>
              </View>
            ) : null}

            <TextField
              label="Building / apartment"
              value={building}
              onChangeText={setBuilding}
              placeholder="e.g. Sunshine Apartments"
            />
            <View style={styles.row}>
              <View style={styles.half}>
                <TextField label="Floor" value={floor} onChangeText={setFloor} placeholder="4" />
              </View>
              <View style={styles.half}>
                <TextField label="Room / flat" value={room} onChangeText={setRoom} placeholder="402" />
              </View>
            </View>
            <TextField
              label="PIN code"
              value={pincode}
              onChangeText={(t) => setPincode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit PIN"
              keyboardType="number-pad"
            />

            <TextField
              label="Address display as"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="e.g. Home, Office (optional)"
            />

            {preview ? (
              <View style={styles.preview}>
                <Text style={styles.previewLabel}>Preview</Text>
                <Text style={styles.previewDisplayName}>{previewDisplayName}</Text>
                <Text style={styles.previewText}>{preview}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.saveBtn, !canSave && styles.saveBtnDisabled, pressed && styles.pressed]}
              onPress={handleSave}
              disabled={!canSave || saving}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save address'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  body: { padding: spacing.lg, maxHeight: 480 },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  gpsText: { color: colors.brand, fontWeight: '700', fontSize: fontSize.sm },
  searchSpinner: { marginBottom: spacing.sm },
  results: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultText: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  confirmedText: { fontSize: fontSize.sm, color: colors.success, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  preview: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065f46',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewDisplayName: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: '#064e3b',
    marginTop: 4,
  },
  previewText: { fontSize: fontSize.sm, color: '#064e3b', marginTop: 4, lineHeight: 20 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  cancelText: { color: colors.text, fontWeight: '600', fontSize: fontSize.sm },
  saveBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  pressed: { opacity: 0.85 },
});