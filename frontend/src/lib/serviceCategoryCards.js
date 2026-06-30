/** Default labels for the four booking care-type cards on the patient dashboard. */
export const SERVICE_CATEGORY_DEFAULTS = [
  {
    id: 'nurse',
    label: 'Nurse visit',
    serviceType: 'nurse_visit',
    subtitle: 'Nursing at home',
  },
  {
    id: 'doctor',
    label: 'Doctor',
    serviceType: 'doctor_consult',
    subtitle: 'Doctor consultation',
  },
  {
    id: 'physio',
    label: 'Physio',
    serviceType: 'physiotherapy',
    subtitle: 'Physiotherapy',
  },
  {
    id: 'emergency',
    label: 'Emergency',
    serviceType: 'emergency',
    subtitle: 'Urgent response',
  },
];

/** @deprecated use mergeServiceCategoryCards */
export const SERVICE_CATEGORY_CARDS = SERVICE_CATEGORY_DEFAULTS.map((row) => ({
  ...row,
  imageSrc: '',
}));

/**
 * Merge admin API rows with static defaults for VisitBookingFlow cards.
 * @param {Array<{ serviceType: string, imageUrl?: string|null, subtitle?: string }>} apiRows
 */
export function mergeServiceCategoryCards(apiRows = []) {
  const byType = Object.fromEntries((apiRows || []).map((row) => [row.serviceType, row]));
  return SERVICE_CATEGORY_DEFAULTS.map((def) => {
    const remote = byType[def.serviceType];
    return {
      ...def,
      subtitle: remote?.subtitle?.trim() || def.subtitle,
      imageSrc: remote?.imageUrl || '',
    };
  });
}
