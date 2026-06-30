/** Caregiver id from API (`_id`) or legacy stored shape (`id`). */
export function caregiverRecordId(caregiver) {
  if (!caregiver) return null;
  return caregiver._id ?? caregiver.id ?? null;
}

export function isValidPin(pin) {
  return (
    Array.isArray(pin) &&
    pin.length === 2 &&
    pin.every((n) => Number.isFinite(Number(n)))
  );
}

export function resolveCheckoutPin(checkoutMeta, user) {
  const candidates = [
    checkoutMeta?.pin,
    user?.location?.coordinates,
    user?.lng != null && user?.lat != null ? [Number(user.lng), Number(user.lat)] : null,
  ];
  for (const p of candidates) {
    if (isValidPin(p)) return [Number(p[0]), Number(p[1])];
  }
  return [77.5946, 12.9716];
}

export function resolveCheckoutAddress(checkoutMeta, user) {
  return (
    checkoutMeta?.address?.trim() ||
    user?.location?.address?.trim() ||
    ''
  );
}

/** Primary caregiver for payment API — first service group that has one assigned. */
export function resolvePrimaryCaregiver(grouped, caregiversByType) {
  for (const group of grouped) {
    const caregiver = caregiversByType[group.serviceType];
    if (caregiverRecordId(caregiver)) {
      return { caregiver, serviceType: group.serviceType };
    }
  }
  for (const [serviceType, caregiver] of Object.entries(caregiversByType || {})) {
    if (caregiverRecordId(caregiver)) {
      return { caregiver, serviceType };
    }
  }
  return { caregiver: null, serviceType: grouped[0]?.serviceType || 'nurse_visit' };
}

export function groupsMissingCaregivers(grouped, caregiversByType) {
  return grouped.filter((g) => !caregiverRecordId(caregiversByType?.[g.serviceType]));
}

export function autoAssignToastMessage(assigned) {
  if (!assigned?.length) return null;
  if (assigned.length === 1) {
    const { caregiver, label } = assigned[0];
    return `${caregiver.name} assigned as nearest ${label.toLowerCase()}`;
  }
  return `${assigned.length} nearest caregivers assigned for your services`;
}
