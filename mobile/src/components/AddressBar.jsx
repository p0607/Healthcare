import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deriveAddressDisplayName } from '@nursecare/shared';
import AddAddressModal from './AddAddressModal';
import { colors, fontSize, radius, spacing } from '../theme/theme';
import { useAddress } from '../context/AddressContext';

export default function AddressBar() {
  const {
    address,
    locationConfirmed,
    savedAddresses,
    selectSavedAddress,
    pickerOpen,
    setPickerOpen,
    addressModalOpen,
    setAddressModalOpen,
    pin,
    saveAddressFromModal,
  } = useAddress();

  const [expandedId, setExpandedId] = useState(null);

  const activeDisplayName = useMemo(() => {
    if (!locationConfirmed || !address) return 'Add delivery address';
    const match = savedAddresses.find((item) => item.label === address);
    return match?.displayName || deriveAddressDisplayName(address);
  }, [address, locationConfirmed, savedAddresses]);

  const closePicker = () => {
    setExpandedId(null);
    setPickerOpen(false);
  };

  return (
    <>
      <Pressable style={styles.row} onPress={() => setPickerOpen(true)}>
        <Ionicons name="location" size={16} color={colors.brand} />
        <Text style={styles.text} numberOfLines={1}>
          {activeDisplayName}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </Pressable>

      <Modal visible={pickerOpen} animationType="fade" transparent onRequestClose={closePicker}>
        <Pressable style={styles.overlay} onPress={closePicker}>
          <View style={styles.pickerSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.pickerTitle}>Delivery address</Text>
            <Text style={styles.pickerHint}>Tap a name to see the full address. Tap again to select.</Text>
            <ScrollView style={styles.pickerList}>
              {savedAddresses.map((item) => {
                const selected = locationConfirmed && address === item.label;
                const expanded = expandedId === item.id;
                const showFull = expanded || selected;
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.addrRow,
                      selected && styles.addrRowSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      if (expanded) {
                        selectSavedAddress(item);
                        closePicker();
                        return;
                      }
                      setExpandedId(item.id);
                    }}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selected ? colors.brand : colors.muted}
                      style={styles.radio}
                    />
                    <View style={styles.addrContent}>
                      <Text style={styles.displayName}>{item.displayName}</Text>
                      {showFull ? (
                        <Text style={styles.fullAddress}>{item.label}</Text>
                      ) : (
                        <Text style={styles.tapHint}>Tap to view full address</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
              {savedAddresses.length === 0 ? (
                <Text style={styles.emptyHint}>No saved addresses yet.</Text>
              ) : null}
            </ScrollView>
            <Pressable
              style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
              onPress={() => {
                closePicker();
                setAddressModalOpen(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.brand} />
              <Text style={styles.addText}>Add new address</Text>
            </Pressable>
            <Pressable style={styles.closeBtn} onPress={closePicker}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <AddAddressModal
        visible={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSave={saveAddressFromModal}
        initialPin={pin}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  text: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  pickerTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  pickerHint: { fontSize: fontSize.xs, color: colors.muted, marginTop: 4, marginBottom: spacing.md },
  pickerList: { maxHeight: 280 },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addrRowSelected: { backgroundColor: colors.brandSoft },
  radio: { marginTop: 2 },
  addrContent: { flex: 1, gap: 4 },
  displayName: { fontSize: fontSize.sm, fontWeight: '800', color: colors.text },
  fullAddress: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 18 },
  tapHint: { fontSize: fontSize.xs, color: colors.brand, fontWeight: '600' },
  emptyHint: { fontSize: fontSize.sm, color: colors.muted, paddingVertical: spacing.lg, textAlign: 'center' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  addText: { color: colors.brand, fontWeight: '700', fontSize: fontSize.sm },
  closeBtn: { alignItems: 'center', paddingVertical: spacing.md },
  closeText: { color: colors.muted, fontWeight: '600', fontSize: fontSize.sm },
  pressed: { opacity: 0.85 },
});
