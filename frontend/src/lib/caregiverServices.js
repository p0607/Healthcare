/** Booking tabs caregivers can register under (matches admin catalog). */
export const CAREGIVER_SERVICE_TYPES = [
  { value: 'nurse_visit', label: 'Nurse', hint: 'Home nursing & clinical visits' },
  { value: 'doctor_consult', label: 'Doctor', hint: 'Consultations & physician care' },
  { value: 'physiotherapy', label: 'Physiotherapist', hint: 'Rehab & mobility therapy' },
  { value: 'emergency', label: 'Ambulance', hint: 'Urgent / ambulance response' },
];

export const caregiverServiceLabel = (value) =>
  CAREGIVER_SERVICE_TYPES.find((t) => t.value === value)?.label ?? value;

const SERVICE_TYPE_ORDER = CAREGIVER_SERVICE_TYPES.map((t) => t.value);

/** Group cart lines by booking tab, preserving Nurse → Doctor → Physio → Emergency order. */
export function groupCartItemsByServiceType(items) {
  const buckets = new Map();
  for (const item of items || []) {
    const st = item.serviceType || 'nurse_visit';
    if (!buckets.has(st)) buckets.set(st, []);
    buckets.get(st).push(item);
  }
  const extra = [...buckets.keys()].filter((st) => !SERVICE_TYPE_ORDER.includes(st));
  return [...SERVICE_TYPE_ORDER, ...extra]
    .filter((st) => buckets.has(st))
    .map((serviceType) => ({
      serviceType,
      label: caregiverServiceLabel(serviceType),
      items: buckets.get(serviceType),
    }));
}

export const isCaregiverCategory = (value) =>
  CAREGIVER_SERVICE_TYPES.some((t) => t.value === value);

/** Map stored category to UI badge kind. */
export function categoryToKind(category) {
  if (category === 'doctor_consult') return 'doctor';
  if (category === 'physiotherapy') return 'physio';
  if (category === 'emergency') return 'ambulance';
  return 'nurse';
}

/** Primary booking tab from saved offerings, else infer from specialization text. */
function inferServiceFromSpecialization(specialization) {
  const s = (specialization || '').toLowerCase();
  if (/physio|rehab|mobility|therapy/.test(s)) return 'physiotherapy';
  if (/ambulance|paramedic|ems|emergency/.test(s)) return 'emergency';
  if (/physician|doctor|mbbs|consultant|cardiac|cardio|surgeon|md\b|gp\b/.test(s)) {
    return 'doctor_consult';
  }
  return 'nurse_visit';
}

export function resolveCaregiverServiceType(careOfferings, specialization, caregiverCategory) {
  if (isCaregiverCategory(caregiverCategory)) return caregiverCategory;

  const types = [
    ...new Set((careOfferings || []).map((o) => o.serviceType).filter(Boolean)),
  ];
  if (types.length === 0 && (careOfferings || []).length > 0) {
    return inferServiceFromSpecialization(specialization);
  }
  if (types.length === 1) return types[0];
  if (types.length > 1) {
    const counts = {};
    for (const o of careOfferings) {
      if (!o.serviceType) continue;
      counts[o.serviceType] = (counts[o.serviceType] || 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top) return top[0];
  }

  return inferServiceFromSpecialization(specialization);
}

export function filterOfferingsForService(careOfferings, serviceType) {
  return (careOfferings || [])
    .filter((o) => !o.serviceType || o.serviceType === serviceType)
    .map((o) => ({
      careServiceOptionId: o.careServiceOptionId,
      rate: o.rate,
    }));
}

/** Split search text into lowercase words (ignores extra spaces). */
export function tokenizeSearchQuery(query) {
  return String(query || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

/** True if any search word appears in the option label or description. */
export function visitFocusMatchesSearch(option, query) {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return true;
  const haystack = `${option.label || ''} ${option.description || ''}`.toLowerCase();
  return tokens.some((word) => haystack.includes(word));
}

function kindForServiceType(serviceType) {
  if (serviceType === 'doctor_consult') return 'doctor';
  if (serviceType === 'physiotherapy') return 'physio';
  if (serviceType === 'nurse_visit') return 'nurse';
  return null;
}

function legacyCaregiversForService(enriched, serviceType) {
  let list;
  if (serviceType === 'nurse_visit') {
    list = enriched.filter((n) => n._kind === 'nurse');
  } else if (serviceType === 'doctor_consult') {
    list = enriched.filter((n) => n._kind === 'doctor');
  } else if (serviceType === 'physiotherapy') {
    list = enriched.filter((n) => n._kind === 'physio');
    if (list.length === 0) list = enriched.filter((n) => n._kind === 'nurse');
  } else if (serviceType === 'emergency') {
    const rank = { ambulance: 0, doctor: 1, nurse: 2, physio: 3 };
    list = [...enriched].sort((a, b) => (rank[a._kind] ?? 9) - (rank[b._kind] ?? 9));
  } else {
    list = enriched;
  }
  return list;
}

/** Nearest available caregiver for a service tab (by `distanceKm` from `/nurses`). */
export function nearestCaregiverForService(nurses, serviceType) {
  const list = caregiversForService(nurses, serviceType);
  if (list.length === 0) return null;
  return [...list].sort((a, b) => {
    const da = a.distanceKm != null ? Number(a.distanceKm) : Infinity;
    const db = b.distanceKm != null ? Number(b.distanceKm) : Infinity;
    return da - db;
  })[0];
}

/**
 * Fill in missing caregivers per cart group with the nearest match.
 * Returns merged map plus who was auto-assigned.
 */
export function autoAssignCaregiversForGroups(grouped, nurses, caregiversByType = {}) {
  const next = { ...(caregiversByType || {}) };
  const assigned = [];
  for (const group of grouped || []) {
    const existing = next[group.serviceType];
    if (existing?._id || existing?.id) continue;
    const nearest = nearestCaregiverForService(nurses, group.serviceType);
    if (nearest) {
      next[group.serviceType] = nearest;
      assigned.push({
        serviceType: group.serviceType,
        label: group.label,
        caregiver: nearest,
      });
    }
  }
  const stillMissing = (grouped || []).filter((g) => {
    const cg = next[g.serviceType];
    return !(cg?._id || cg?.id);
  });
  return { caregiversByType: next, assigned, stillMissing };
}

/** Caregivers for a cart that may include multiple service types. */
export function caregiversForCartItems(nurses, cartItems) {
  const types = [...new Set((cartItems || []).map((i) => i.serviceType).filter(Boolean))];
  if (types.length === 0) return caregiversForService(nurses, 'nurse_visit');
  if (types.length === 1) return caregiversForService(nurses, types[0]);
  const seen = new Set();
  const merged = [];
  for (const st of types) {
    for (const n of caregiversForService(nurses, st)) {
      if (!seen.has(n._id)) {
        seen.add(n._id);
        merged.push(n);
      }
    }
  }
  return merged;
}

/** Match admin booking tab: category, offerings for this tab, then legacy specialization rules. */
export function caregiversForService(nurses, serviceType) {
  const enriched = (nurses || []).map((n) => {
    const resolved = resolveCaregiverServiceType(
      n.careOfferings,
      n.specialization,
      n.caregiverCategory
    );
    return {
      ...n,
      _resolvedCategory: resolved,
      _kind: categoryToKind(resolved),
    };
  });

  const byCategory = enriched.filter((n) => {
    const tabCategory = n.caregiverCategory || n._resolvedCategory;
    return tabCategory === serviceType;
  });

  const byOffering = enriched.filter(
    (n) =>
      Array.isArray(n.careOfferings) &&
      n.careOfferings.length > 0 &&
      n.careOfferings.some((o) => o.serviceType === serviceType)
  );

  const uncategorized = enriched.filter((n) => !n.caregiverCategory);
  const byLegacy = legacyCaregiversForService(uncategorized, serviceType);

  const seen = new Set();
  const merged = [];
  for (const n of [...byCategory, ...byOffering, ...byLegacy]) {
    const id = n._id || n.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(n);
  }

  if (merged.length > 0) return merged;
  return legacyCaregiversForService(enriched, serviceType);
}

export function caregiverKindBadge(kind) {
  switch (kind) {
    case 'doctor':
      return { label: 'Doctor', className: 'bg-sky-100 text-sky-900' };
    case 'physio':
      return { label: 'Physio', className: 'bg-amber-100 text-amber-950' };
    case 'ambulance':
      return { label: 'Emergency', className: 'bg-rose-100 text-rose-900' };
    default:
      return { label: 'Nurse', className: 'bg-emerald-100 text-emerald-900' };
  }
}

export function initialsFromName(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}
