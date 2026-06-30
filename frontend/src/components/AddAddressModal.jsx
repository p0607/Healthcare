import { useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import LocationSearch from './LocationSearch.jsx';
import { composeAddressLabel } from '../lib/addressFormat';

const AddAddressModal = ({ open, onClose, onSave, initialPin }) => {
  const [pin, setPin] = useState(initialPin || [77.5946, 12.9716]);
  const [streetAddress, setStreetAddress] = useState('');
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [room, setRoom] = useState('');
  const [pincode, setPincode] = useState('');

  useEffect(() => {
    if (!open) return;
    setPin(initialPin || [77.5946, 12.9716]);
    setStreetAddress('');
    setLocationConfirmed(false);
    setBuilding('');
    setFloor('');
    setRoom('');
    setPincode('');
  }, [open, initialPin]);

  if (!open) return null;

  const preview = composeAddressLabel({ streetAddress, building, floor, room, pincode });
  const canSave = locationConfirmed && streetAddress.trim();

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      streetAddress: streetAddress.trim(),
      building: building.trim(),
      floor: floor.trim(),
      room: room.trim(),
      pincode: pincode.trim(),
      label: preview,
      coordinates: [...pin],
    });
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-6">
      <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-address-title"
        className="relative w-full max-w-lg rounded-2xl border border-glass-border/60 bg-white shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 border-b border-glass-border/50 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
              <MapPin className="w-4 h-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id="add-address-title" className="text-base font-semibold text-foreground">
                Add delivery address
              </h2>
              <p className="text-xs text-muted truncate">Search your area, then add building and room details.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="touch-target rounded-lg p-2 text-muted hover:bg-glass/60" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[min(70dvh,640px)] overflow-y-auto px-4 py-4 space-y-4">
          <LocationSearch
            pin={pin}
            setPin={setPin}
            address={streetAddress}
            setAddress={setStreetAddress}
            locationConfirmed={locationConfirmed}
            setLocationConfirmed={setLocationConfirmed}
            loadNurses={() => {}}
            idPrefix="add-address"
            variant="prominent"
            onPlaceSelected={(place) => {
              if (place?.pincode) setPincode(place.pincode);
              if (place?.buildingName && !building.trim()) setBuilding(place.buildingName);
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block sm:col-span-2">
              <span className="block text-xs font-medium text-muted mb-1">Building / apartment name</span>
              <input
                type="text"
                className="input py-2"
                placeholder="e.g. Sunshine Apartments"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted mb-1">Floor</span>
              <input
                type="text"
                className="input py-2"
                placeholder="e.g. 4"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted mb-1">Room / flat no.</span>
              <input
                type="text"
                className="input py-2"
                placeholder="e.g. 402"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-xs font-medium text-muted mb-1">PIN code</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="input py-2"
                placeholder="6-digit PIN code"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </label>
          </div>

          {preview ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-sm">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800/80">Preview</div>
              <p className="mt-1 text-emerald-950 leading-snug">{preview}</p>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-glass-border/50 px-4 py-3 bg-glass/30">
          <button type="button" onClick={onClose} className="btn-outline px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Save address
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddAddressModal;
