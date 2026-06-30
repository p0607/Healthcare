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

/** Saved-address record with optional structured fields. */
export function normalizeSavedAddress(item) {
  if (!item?.label && !item?.streetAddress) return null;
  return {
    id: item.id || `${Date.now()}`,
    label: item.label || composeAddressLabel(item),
    coordinates: item.coordinates,
    streetAddress: item.streetAddress || '',
    building: item.building || '',
    floor: item.floor || '',
    room: item.room || '',
    pincode: item.pincode || '',
  };
}
