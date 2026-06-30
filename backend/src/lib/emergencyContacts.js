const MIN_REQUIRED = 2;
const MAX_SLOTS = 8;

function trimOrNull(v) {
  const s = String(v ?? '').trim();
  return s || null;
}

function rowHasAnyData(row) {
  return Boolean(row?.name || row?.phone || row?.email);
}

function normalizeEmergencyContacts(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const mapped = arr.map((row) => ({
    name: trimOrNull(row?.name),
    phone: trimOrNull(row?.phone),
    email: trimOrNull(row?.email),
  }));

  let trimmed = [...mapped];
  while (trimmed.length > MIN_REQUIRED && !rowHasAnyData(trimmed[trimmed.length - 1])) {
    trimmed.pop();
  }
  while (trimmed.length < MIN_REQUIRED) {
    trimmed.push({ name: null, phone: null, email: null });
  }
  return trimmed.slice(0, MAX_SLOTS);
}

function emergencyContactFilled(row) {
  return Boolean(row?.name && row?.phone);
}

function emergencyContactsComplete(slots) {
  const rows = normalizeEmergencyContacts(slots);
  const active = rows.filter(rowHasAnyData);
  const complete = active.filter(emergencyContactFilled);
  if (complete.length < MIN_REQUIRED) return false;
  return active.every(emergencyContactFilled);
}

module.exports = {
  MIN_REQUIRED,
  MAX_SLOTS,
  normalizeEmergencyContacts,
  emergencyContactFilled,
  emergencyContactsComplete,
};
