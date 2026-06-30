/** Account kinds stored in User.accountKinds (multi-select at registration). */
const ACCOUNT_KINDS = ['patient', 'guardian', 'service_provider'];

const SESSION_ROLE_BY_KIND = {
  patient: 'user',
  guardian: 'user',
  service_provider: 'nurse',
  admin: 'admin',
};

const KIND_LABELS = {
  patient: 'Patient',
  guardian: 'Guardian',
  service_provider: 'Care provider',
  admin: 'Admin',
};

function normalizeKinds(kinds) {
  if (!Array.isArray(kinds)) return [];
  return [...new Set(kinds.filter((k) => ACCOUNT_KINDS.includes(k)))];
}

function kindsToSessionRoles(kinds) {
  const roles = new Set();
  normalizeKinds(kinds).forEach((k) => {
    const r = SESSION_ROLE_BY_KIND[k];
    if (r) roles.add(r);
  });
  return [...roles];
}

function resolveSessionRole(requestedRole, accountKinds) {
  const kinds = normalizeKinds(accountKinds);
  const allowed = kindsToSessionRoles(kinds);
  if (requestedRole && allowed.includes(requestedRole)) return requestedRole;
  if (allowed.includes('nurse')) return 'nurse';
  if (allowed.includes('user')) return 'user';
  return 'user';
}

function userHasKind(user, kind) {
  const kinds = normalizeKinds(user?.accountKinds || []);
  if (kinds.length === 0) {
    if (kind === 'patient' && user?.role === 'user') return true;
    if (kind === 'service_provider' && user?.role === 'nurse') return true;
    return false;
  }
  return kinds.includes(kind);
}

module.exports = {
  ACCOUNT_KINDS,
  SESSION_ROLE_BY_KIND,
  KIND_LABELS,
  normalizeKinds,
  kindsToSessionRoles,
  resolveSessionRole,
  userHasKind,
};
