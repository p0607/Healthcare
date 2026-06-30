/** Admin RBAC — shared between backend middleware and clients (UI gating). */

export const ADMIN_TIERS = {
  admin: 'admin',
  super_admin: 'super_admin',
};

export const ADMIN_TIER_LABELS = {
  admin: 'Admin',
  super_admin: 'Super admin',
};

/** Permissions granted to each admin tier. super_admin has wildcard. */
export const ADMIN_TIER_PERMISSIONS = {
  super_admin: ['*'],
  admin: [
    'stats.read',
    'requests.read',
    'users.read',
    'users.update',
    'nurses.read',
    'nurses.update',
    'catalog.read',
    'catalog.write',
  ],
};

export const SUPER_ADMIN_PERMISSIONS = [
  'admins.manage',
  'admins.create',
  'audit.read',
  'users.promote_admin',
];

export function resolveAdminTier(user) {
  if (user?.role !== 'admin') return null;
  return user.adminTier === ADMIN_TIERS.super_admin ? ADMIN_TIERS.super_admin : ADMIN_TIERS.admin;
}

export function isSuperAdminUser(user) {
  return resolveAdminTier(user) === ADMIN_TIERS.super_admin;
}

export function adminPermissionsFor(user) {
  const tier = resolveAdminTier(user);
  if (!tier) return [];
  return ADMIN_TIER_PERMISSIONS[tier] || [];
}

export function adminHasPermission(user, permission) {
  if (user?.role !== 'admin') return false;
  const perms = adminPermissionsFor(user);
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

export function adminHasAnyPermission(user, permissions = []) {
  return permissions.some((p) => adminHasPermission(user, p));
}
