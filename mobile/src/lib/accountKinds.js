/** Account kinds — mirrors frontend/src/lib/accountKinds.js (Expo Router navigation). */

export const REGISTER_ACCOUNT_KINDS = [
  { id: 'patient', label: 'Patient', desc: 'Book home care for yourself' },
  { id: 'guardian', label: 'Guardian', desc: 'Register and care for a patient' },
  { id: 'service_provider', label: 'Caregiver', desc: 'Offer care as a provider' },
];

export const LOGIN_AS_OPTIONS = [
  { id: 'patient', label: 'Patient' },
  { id: 'service_provider', label: 'Caregiver' },
  { id: 'guardian', label: 'Guardian' },
];

export const LOGIN_KIND_LABELS = {
  patient: 'Patient',
  guardian: 'Guardian',
  service_provider: 'Care provider',
  admin: 'Admin',
};

export const STAFF_LOGIN_ROLES = [
  { id: 'user', label: 'Patient', desc: 'Book home care' },
  { id: 'nurse', label: 'Care provider', desc: 'Nurse, doctor, physio, or emergency' },
  { id: 'admin', label: 'Admin', desc: 'Platform administration' },
];

export const REGISTER_SERVICE_LABELS = {
  nurse_visit: 'Nurse',
  doctor_consult: 'Doctor',
  physiotherapy: 'Physio',
  emergency: 'Emergency',
};

export const SPECIALIZATION_PLACEHOLDER = {
  nurse_visit: 'e.g. General nursing, ICU, pediatrics',
  doctor_consult: 'e.g. Cardiology, general physician',
  physiotherapy: 'e.g. Sports rehab, geriatric mobility',
  emergency: 'e.g. Paramedic, ambulance response',
};

export function labelForRegisterServiceType(serviceType) {
  return REGISTER_SERVICE_LABELS[serviceType] || serviceType;
}

export function navigateForUser(user, router) {
  router.replace(dashboardHref(user));
}

export function dashboardHref(user) {
  if (user?.role === 'admin') return '/(admin)/home';
  if (user?.role === 'nurse') return '/(caregiver)/home';
  return '/(app)/home';
}
