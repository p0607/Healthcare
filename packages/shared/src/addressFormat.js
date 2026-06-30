/** Build a single-line delivery label from structured parts. */
export function composeAddressLabel({ streetAddress, building, floor, room, pincode }) {
  const unitParts = [];
  if (room?.trim()) unitParts.push(`Room ${room.trim()}`);
  if (floor?.trim()) unitParts.push(`Floor ${floor.trim()}`);
  if (building?.trim()) unitParts.push(building.trim());

  const line = [...unitParts, streetAddress?.trim()].filter(Boolean).join(', ');
  const pin = pincode?.trim();
  if (!line) return pin || '';
  return pin ? `${line} - ${pin}` : line;
}

function uniqueAddressId() {
  return `addr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Ensure every saved address has a distinct id (fixes legacy records missing or sharing ids). */
export function ensureUniqueAddressIds(addresses) {
  if (!Array.isArray(addresses)) return [];
  const seen = new Set();
  return addresses.map((item) => {
    if (!item) return item;
    if (item.id && !seen.has(item.id)) {
      seen.add(item.id);
      return item;
    }
    let id = item.id;
    while (!id || seen.has(id)) {
      id = uniqueAddressId();
    }
    seen.add(id);
    return { ...item, id };
  });
}

/** Short name for address lists — custom label or first two words of the full address. */
export function deriveAddressDisplayName(fullLabel, displayName) {
  const custom = String(displayName || '').trim();
  if (custom) return custom;
  const words = String(fullLabel || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'Address';
  return words.slice(0, 2).join(' ');
}

/** Saved-address record with optional structured fields. */
export function normalizeSavedAddress(item) {
  if (!item?.label && !item?.streetAddress) return null;
  const label = item.label || composeAddressLabel(item);
  return {
    id: item.id || uniqueAddressId(),
    label,
    displayName: deriveAddressDisplayName(label, item.displayName),
    coordinates: item.coordinates,
    streetAddress: item.streetAddress || '',
    building: item.building || '',
    floor: item.floor || '',
    room: item.room || '',
    pincode: item.pincode || '',
  };
}
