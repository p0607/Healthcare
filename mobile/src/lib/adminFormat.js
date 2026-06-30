/** Shared formatters for admin screens (mirrors web admin pages). */

export const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

export const fmtDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

export const fmtShortDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN');
  } catch {
    return '—';
  }
};

export const serviceLabel = (value) => value?.replace(/_/g, ' ') || '—';

export const roleLabel = (role) => {
  if (role === 'user') return 'Patient';
  if (role === 'nurse') return 'Caregiver';
  if (role === 'admin') return 'Admin';
  return role || '—';
};

export const userId = (u) => u?._id || u?.id;
