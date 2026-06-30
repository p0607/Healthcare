export const REGISTER_ACCOUNT_KINDS = [
  { id: 'patient', label: 'Patient', desc: 'Book home care for yourself' },
  { id: 'guardian', label: 'Guardian', desc: 'Register and care for a patient' },
  { id: 'service_provider', label: 'Service', desc: 'Offer care as a provider' },
];

export const LOGIN_KIND_LABELS = {
  patient: 'Patient',
  guardian: 'Guardian',
  service_provider: 'Care provider',
  admin: 'Admin',
};

export function navigateForUser(user, navigate) {
  navigate(dashboardPathForUser(user));
}

export function dashboardPathForUser(user) {
  if (user?.role === 'admin') return '/admin';
  if (user?.role === 'nurse') return '/nurse';
  return '/dashboard';
}
