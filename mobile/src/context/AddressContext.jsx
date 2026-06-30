/**
 * Delivery address state — mirrors web UserDashboard address handling.
 * Saved addresses in AsyncStorage; active address synced to checkout meta.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeSavedAddress, deriveAddressDisplayName, ensureUniqueAddressIds } from '@nursecare/shared';
import { api } from '../api/client';
import { saveCachedUser } from '../storage/session';
import { useAuth } from './AuthContext';
import { useBookingCart } from './BookingCartContext';

const AddressContext = createContext(null);

const DEFAULT_PIN = [77.5946, 12.9716];

function savedAddressStorageKey(user) {
  return `patient:saved-addresses:${user?._id || user?.id || user?.email || 'guest'}`;
}

export function AddressProvider({ children }) {
  const { user, setUser } = useAuth();
  const { setCheckoutMeta } = useBookingCart();

  const [pin, setPin] = useState(() => user?.location?.coordinates || DEFAULT_PIN);
  const [address, setAddress] = useState(() => user?.location?.address || '');
  const [locationConfirmed, setLocationConfirmed] = useState(Boolean(user?.location?.address?.trim()));
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const initial = user?.location?.address?.trim()
        ? [
            {
              id: 'profile-location',
              label: user.location.address,
              displayName: deriveAddressDisplayName(user.location.address),
              coordinates: user.location.coordinates || DEFAULT_PIN,
            },
          ]
        : [];

      try {
        const raw = await AsyncStorage.getItem(savedAddressStorageKey(user));
        const stored = raw ? JSON.parse(raw) : [];
        const merged = [...initial, ...(Array.isArray(stored) ? stored : [])];
        const deduped = ensureUniqueAddressIds(
          merged
            .filter(
              (item, index, arr) => item?.label && arr.findIndex((x) => x.label === item.label) === index
            )
            .map((item) => normalizeSavedAddress(item))
            .filter(Boolean)
        );
        if (!cancelled) {
          setSavedAddresses(deduped);
          if (user?.location?.address?.trim()) {
            setAddress(user.location.address);
            setPin(user.location.coordinates || DEFAULT_PIN);
            setLocationConfirmed(true);
          }
          setHydrated(true);
        }
      } catch {
        if (!cancelled) {
          setSavedAddresses(
            ensureUniqueAddressIds(initial.map((item) => normalizeSavedAddress(item)).filter(Boolean))
          );
          setHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?._id, user?.email]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(savedAddressStorageKey(user), JSON.stringify(savedAddresses)).catch(() => {});
  }, [savedAddresses, user, hydrated]);

  const selectSavedAddress = useCallback((item) => {
    if (!item?.coordinates) return;
    setPin([...item.coordinates]);
    setAddress(item.label);
    setLocationConfirmed(true);
    setPickerOpen(false);
    setCheckoutMeta((prev) => ({
      ...(prev || {}),
      pin: [...item.coordinates],
      address: item.label,
    }));
  }, [setCheckoutMeta]);

  const saveAddressFromModal = useCallback(
    async (payload) => {
      const normalized = normalizeSavedAddress(payload);
      if (!normalized?.label) return { ok: false, message: 'Complete the address details' };

      const existing = savedAddresses.find((item) => item.label === normalized.label);
      if (existing) {
        selectSavedAddress(existing);
      } else {
        setSavedAddresses((prev) => [...prev, normalized]);
        selectSavedAddress(normalized);
      }

      setAddressModalOpen(false);

      try {
        const { data } = await api.patch('/auth/me/profile', {
          location: {
            address: normalized.label,
            coordinates: normalized.coordinates,
          },
        });
        if (data?.user) {
          await saveCachedUser(data.user);
          setUser(data.user);
        }
      } catch {
        /* local address still works for booking */
      }

      return { ok: true };
    },
    [savedAddresses, selectSavedAddress, setUser]
  );

  const value = useMemo(
    () => ({
      pin,
      setPin,
      address,
      setAddress,
      locationConfirmed,
      setLocationConfirmed,
      savedAddresses,
      selectSavedAddress,
      saveAddressFromModal,
      addressModalOpen,
      setAddressModalOpen,
      pickerOpen,
      setPickerOpen,
      addressHydrated: hydrated,
    }),
    [
      pin,
      address,
      locationConfirmed,
      savedAddresses,
      selectSavedAddress,
      saveAddressFromModal,
      addressModalOpen,
      pickerOpen,
      hydrated,
    ]
  );

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddress() {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error('useAddress must be used inside AddressProvider');
  return ctx;
}
