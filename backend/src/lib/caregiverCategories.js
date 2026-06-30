/** Patient booking tabs — same four categories as admin care-services catalog. */
const CAREGIVER_CATEGORY_VALUES = new Set([
  'nurse_visit',
  'doctor_consult',
  'physiotherapy',
  'emergency',
]);

function isCaregiverCategory(value) {
  return value != null && CAREGIVER_CATEGORY_VALUES.has(String(value));
}

module.exports = { CAREGIVER_CATEGORY_VALUES, isCaregiverCategory };
