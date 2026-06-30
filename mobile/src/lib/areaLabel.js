/** Short area/locality label from a full address string. */
export function areaLabelFromAddress(address) {
  if (!address?.trim()) return 'Service area not set';
  const parts = String(address)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0];
}
