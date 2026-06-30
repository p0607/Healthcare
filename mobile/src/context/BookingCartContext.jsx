/**
 * Booking cart — mobile port of frontend/src/context/BookingCartContext.jsx.
 * Persists to AsyncStorage + syncs with PUT/GET /cart/me when logged in.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveCaregiverServiceType } from '@nursecare/shared';
import { api } from '../api/client';
import { getToken } from '../storage/session';
import { useAuth } from './AuthContext';

const BookingCartContext = createContext(null);

export function cartUserId(user) {
  return user?._id ?? user?.id ?? null;
}

function cartStorageKey(userId) {
  return userId ? `nursecare_cart_${userId}` : 'nursecare_cart_guest';
}

function normalizeCaregiver(caregiver) {
  if (!caregiver || typeof caregiver !== 'object') return caregiver;
  const _id = caregiver._id ?? caregiver.id;
  return _id ? { ...caregiver, _id } : caregiver;
}

function normalizeCaregiversByType(map) {
  if (!map || typeof map !== 'object') return {};
  return Object.fromEntries(Object.entries(map).map(([st, cg]) => [st, normalizeCaregiver(cg)]));
}

function migrateLegacyCaregiver(legacy, items) {
  if (!legacy) return {};
  const inferred = resolveCaregiverServiceType(
    legacy.careOfferings,
    legacy.specialization,
    legacy.caregiverCategory
  );
  const types = [...new Set((items || []).map((i) => i.serviceType).filter(Boolean))];
  const serviceType = types.includes(inferred) ? inferred : types[0] || inferred || 'nurse_visit';
  return { [serviceType]: normalizeCaregiver(legacy) };
}

function normalizeCartPayload(raw) {
  if (!raw || typeof raw !== 'object') {
    return { items: [], caregiversByType: {}, checkoutMeta: null };
  }
  const items = Array.isArray(raw.items) ? raw.items : [];
  const caregiversByType = normalizeCaregiversByType(
    raw.caregiversByType && typeof raw.caregiversByType === 'object'
      ? raw.caregiversByType
      : migrateLegacyCaregiver(raw.caregiver, items)
  );
  return { items, caregiversByType, checkoutMeta: raw.checkoutMeta ?? null };
}

async function readStoredCart(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return normalizeCartPayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeStoredCart(key, payload) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* optional */
  }
}

function buildPayload(items, caregiversByType, checkoutMeta) {
  return { items, caregiversByType, checkoutMeta };
}

export function BookingCartProvider({ children }) {
  const { user } = useAuth();
  const userId = cartUserId(user);
  const storageKey = cartStorageKey(userId);
  const [hydrated, setHydrated] = useState(false);
  const [items, setItems] = useState([]);
  const [caregiversByType, setCaregiversByType] = useState({});
  const [checkoutMeta, setCheckoutMeta] = useState(null);
  const [paymentCheckout, setPaymentCheckout] = useState(null);
  const removeListenerRef = useRef(null);
  const remoteApplyRef = useRef(false);
  const saveTimerRef = useRef(null);
  const localEditAtRef = useRef(0);
  const itemsRef = useRef(items);
  const caregiversRef = useRef(caregiversByType);
  const checkoutMetaRef = useRef(checkoutMeta);

  itemsRef.current = items;
  caregiversRef.current = caregiversByType;
  checkoutMetaRef.current = checkoutMeta;

  const markLocalEdit = useCallback(() => {
    localEditAtRef.current = Date.now();
  }, []);

  const applyCartState = useCallback(
    async (payload, { fromRemote = false } = {}) => {
      if (fromRemote && Date.now() - localEditAtRef.current < 3000) return;
      const normalized = normalizeCartPayload(payload);
      remoteApplyRef.current = true;
      setItems(normalized.items);
      setCaregiversByType(normalized.caregiversByType);
      setCheckoutMeta(normalized.checkoutMeta);
      await writeStoredCart(storageKey, normalized);
      remoteApplyRef.current = false;
    },
    [storageKey]
  );

  const persistCartNow = useCallback(
    async (payload) => {
      const normalized = normalizeCartPayload(payload);
      await writeStoredCart(storageKey, normalized);
      const token = await getToken();
      if (!userId || !token) return;
      api.put('/cart/me', normalized).catch(() => {});
    },
    [storageKey, userId]
  );

  const fetchRemoteCart = useCallback(async () => {
    const token = await getToken();
    if (!userId || !token) return undefined;
    try {
      const { data } = await api.get('/cart/me');
      return normalizeCartPayload(data?.cart);
    } catch {
      return undefined;
    }
  }, [userId]);

  const persistRemoteCart = useCallback(
    async (payload) => {
      const token = await getToken();
      if (!userId || !token) return;
      try {
        await api.put('/cart/me', payload);
      } catch {
        /* offline */
      }
    },
    [userId]
  );

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);

    (async () => {
      const local = await readStoredCart(storageKey);
      const remote = userId ? await fetchRemoteCart() : undefined;
      if (cancelled) return;

      if (remote !== undefined) {
        await applyCartState(remote, { fromRemote: true });
      } else if (local) {
        await applyCartState(local);
      } else {
        await applyCartState({ items: [], caregiversByType: {}, checkoutMeta: null });
      }

      if (!cancelled) setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [storageKey, userId, applyCartState, fetchRemoteCart]);

  useEffect(() => {
    if (!hydrated || remoteApplyRef.current) return;
    const payload = buildPayload(items, caregiversByType, checkoutMeta);
    writeStoredCart(storageKey, payload);
    if (!userId) return undefined;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistRemoteCart(payload);
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [hydrated, storageKey, userId, items, caregiversByType, checkoutMeta, persistRemoteCart]);

  const caregiver = useMemo(
    () => Object.values(caregiversByType).find(Boolean) ?? null,
    [caregiversByType]
  );

  const setCaregiverForType = useCallback(
    (serviceType, person) => {
      if (!serviceType) return;
      markLocalEdit();
      setCaregiversByType((prev) => {
        if (!person) {
          if (!prev[serviceType]) return prev;
          const next = { ...prev };
          delete next[serviceType];
          return next;
        }
        const normalized = normalizeCaregiver(person);
        if (prev[serviceType]?._id === normalized?._id) return prev;
        return { ...prev, [serviceType]: normalized };
      });
    },
    [markLocalEdit]
  );

  const setCaregiver = useCallback(
    (person) => {
      if (!person) {
        markLocalEdit();
        setCaregiversByType({});
        return;
      }
      const serviceType = resolveCaregiverServiceType(
        person.careOfferings,
        person.specialization,
        person.caregiverCategory
      );
      setCaregiverForType(serviceType, person);
    },
    [setCaregiverForType, markLocalEdit]
  );

  const registerRemoveListener = useCallback((fn) => {
    removeListenerRef.current = fn;
    return () => {
      if (removeListenerRef.current === fn) removeListenerRef.current = null;
    };
  }, []);

  const removeItem = useCallback(
    (id) => {
      markLocalEdit();
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== id);
        const types = new Set(next.map((item) => item.serviceType || 'nurse_visit'));
        const prunedCaregivers = Object.fromEntries(
          Object.entries(caregiversRef.current).filter(([st]) => types.has(st))
        );
        setCaregiversByType(prunedCaregivers);
        const payload = buildPayload(next, prunedCaregivers, checkoutMetaRef.current);
        persistCartNow(payload);
        return next;
      });
      removeListenerRef.current?.(id);
    },
    [markLocalEdit, persistCartNow]
  );

  const clearCart = useCallback(async () => {
    markLocalEdit();
    const empty = { items: [], caregiversByType: {}, checkoutMeta: null };
    await applyCartState(empty);
    try {
      await AsyncStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    persistCartNow(empty);
    removeListenerRef.current?.(null);
  }, [storageKey, applyCartState, persistCartNow, markLocalEdit]);

  const setItemsWithPersist = useCallback(
    (updater) => {
      markLocalEdit();
      setItems((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        const payload = buildPayload(next, caregiversRef.current, checkoutMetaRef.current);
        persistCartNow(payload);
        return next;
      });
    },
    [markLocalEdit, persistCartNow]
  );

  const itemCount = items.length;
  const total = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.rate) || 0), 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      setItems: setItemsWithPersist,
      caregiversByType,
      setCaregiversByType,
      setCaregiverForType,
      caregiver,
      setCaregiver,
      checkoutMeta,
      setCheckoutMeta,
      paymentCheckout,
      setPaymentCheckout,
      removeItem,
      clearCart,
      itemCount,
      total,
      registerRemoveListener,
      cartHydrated: hydrated,
    }),
    [
      items,
      setItemsWithPersist,
      caregiversByType,
      setCaregiverForType,
      caregiver,
      checkoutMeta,
      paymentCheckout,
      setPaymentCheckout,
      removeItem,
      clearCart,
      itemCount,
      total,
      registerRemoveListener,
      setCaregiver,
      hydrated,
    ]
  );

  return <BookingCartContext.Provider value={value}>{children}</BookingCartContext.Provider>;
}

export function useBookingCart() {
  const ctx = useContext(BookingCartContext);
  if (!ctx) throw new Error('useBookingCart must be used inside BookingCartProvider');
  return ctx;
}
