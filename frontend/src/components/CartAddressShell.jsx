import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { useBookingCart } from '../context/BookingCartContext.jsx';
import DashboardAddressBar from './DashboardAddressBar.jsx';
import AddAddressModal from './AddAddressModal.jsx';
import { normalizeSavedAddress } from '../lib/addressFormat';

const savedAddressStorageKey = (user) => `patient:saved-addresses:${user?._id || user?.email || 'guest'}`;

const loadSavedAddresses = (user) => {
  const initial = user?.location?.address?.trim()
    ? [
        {
          id: 'profile-location',
          label: user.location.address,
          coordinates: user.location.coordinates || [77.5946, 12.9716],
        },
      ]
    : [];
  try {
    const stored = JSON.parse(localStorage.getItem(savedAddressStorageKey(user)) || '[]');
    const merged = [...initial, ...(Array.isArray(stored) ? stored : [])];
    return merged.filter(
      (item, index, arr) => item?.label && arr.findIndex((x) => x.label === item.label) === index
    );
  } catch {
    return initial;
  }
};

/** Delivery address bar on the cart page (replaces the safety monitor strip). */
export default function CartAddressShell() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const { checkoutMeta, setCheckoutMeta } = useBookingCart();
  const isCart = pathname === '/dashboard/cart';

  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState(() => loadSavedAddresses(user));

  const pin = useMemo(
    () => checkoutMeta?.pin ?? user?.location?.coordinates ?? [77.5946, 12.9716],
    [checkoutMeta?.pin, user?.location?.coordinates]
  );

  const address = checkoutMeta?.address?.trim() || user?.location?.address?.trim() || '';
  const locationConfirmed = Boolean(address);

  useEffect(() => {
    setSavedAddresses(loadSavedAddresses(user));
  }, [user?._id, user?.email, user?.location?.address]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem(savedAddressStorageKey(user), JSON.stringify(savedAddresses));
    } catch {
      /* ignore quota errors */
    }
  }, [savedAddresses, user]);

  const selectSavedAddress = useCallback(
    (item) => {
      if (!item?.coordinates) return;
      setCheckoutMeta((prev) => ({
        ...(prev || {}),
        address: item.label,
        pin: [...item.coordinates],
      }));
    },
    [setCheckoutMeta]
  );

  const saveAddressFromModal = useCallback(
    (payload) => {
      const normalized = normalizeSavedAddress({
        id: `${Date.now()}`,
        ...payload,
      });
      if (!normalized?.label) {
        toast.error('Complete the address details');
        return;
      }
      const existing = savedAddresses.find((item) => item.label === normalized.label);
      if (existing) {
        toast('Address already saved');
        selectSavedAddress(existing);
      } else {
        setSavedAddresses((prev) => [...prev, normalized]);
        selectSavedAddress(normalized);
        toast.success('Address saved');
      }
      setAddressModalOpen(false);
    },
    [savedAddresses, selectSavedAddress]
  );

  if (!user || !isCart) return null;

  return (
    <>
      <div className="border-b border-glass-border/40 bg-canvas/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5">
          <DashboardAddressBar
            compact
            narrow
            userName={user?.name}
            displayAddress={
              locationConfirmed ? address : 'Add a delivery address for this visit'
            }
            savedAddresses={savedAddresses}
            selectedLabel={locationConfirmed ? address : ''}
            onSelectAddress={selectSavedAddress}
            onAddClick={() => setAddressModalOpen(true)}
            pickerOpen={addressPickerOpen}
            onPickerOpenChange={setAddressPickerOpen}
          />
        </div>
      </div>
      <AddAddressModal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSave={saveAddressFromModal}
        initialPin={pin}
      />
    </>
  );
}
