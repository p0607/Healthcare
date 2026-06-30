/** Maps marketing service ids → booking serviceType (mirrors backend). */
const SERVICE_ID_TO_TYPE = {
  'careguard-ai': 'nurse_visit',
  'carebot-companion': 'nurse_visit',
  'rapid-relief': 'emergency',
  'bedside-companion': 'nurse_visit',
  'homecoming-care': 'nurse_visit',
  'prepare-reassure': 'nurse_visit',
  'healing-hands': 'nurse_visit',
  'doctor-at-door': 'doctor_consult',
  carescript: 'nurse_visit',
  'move-mend': 'physiotherapy',
  healthclarity: 'nurse_visit',
  'breathe-balance': 'physiotherapy',
  'revive-restore': 'physiotherapy',
  'nourish-flourish': 'nurse_visit',
  'wholeness-hub': 'nurse_visit',
  'stayahead-health': 'nurse_visit',
  careshield: 'nurse_visit',
};

const TYPE_PRIORITY = ['emergency', 'doctor_consult', 'physiotherapy', 'nurse_visit'];

export function inferCaregiverCategory(selectedServiceIds) {
  const types = (selectedServiceIds || []).map((id) => SERVICE_ID_TO_TYPE[id]).filter(Boolean);
  for (const t of TYPE_PRIORITY) {
    if (types.includes(t)) return t;
  }
  return 'nurse_visit';
}
