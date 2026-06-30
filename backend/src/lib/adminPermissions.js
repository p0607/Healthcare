/** Server-side admin RBAC (mirrors packages/shared/src/adminPermissions.js). */

const ADMIN_TIERS = {
  admin: 'admin',
  super_admin: 'super_admin',
};

const ADMIN_TIER_PERMISSIONS = {
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

function resolveAdminTier(user) {
  if (user?.role !== 'admin') return null;
  return user.adminTier === ADMIN_TIERS.super_admin ? ADMIN_TIERS.super_admin : ADMIN_TIERS.admin;
}

function isSuperAdminUser(user) {
  return resolveAdminTier(user) === ADMIN_TIERS.super_admin;
}

function adminPermissionsFor(user) {
  const tier = resolveAdminTier(user);
  if (!tier) return [];
  return ADMIN_TIER_PERMISSIONS[tier] || [];
}

function adminHasPermission(user, permission) {
  if (user?.role !== 'admin') return false;
  const perms = adminPermissionsFor(user);
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

function adminHasAnyPermission(user, permissions = []) {
  return permissions.some((p) => adminHasPermission(user, p));
}

function assertAdminUser(user) {
  return user?.role === 'admin';
}

function requireAdmin() {
  return (req, res, next) => {
    if (!assertAdminUser(req.user)) {
      return res.status(403).json({ message: 'Forbidden: admin access required' });
    }
    next();
  };
}

function requireSuperAdmin() {
  return (req, res, next) => {
    if (!assertAdminUser(req.user) || !isSuperAdminUser(req.user)) {
      return res.status(403).json({ message: 'Forbidden: super admin access required' });
    }
    next();
  };
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!assertAdminUser(req.user)) {
      return res.status(403).json({ message: 'Forbidden: admin access required' });
    }
    if (!adminHasAnyPermission(req.user, permissions)) {
      return res.status(403).json({
        message: `Forbidden: requires permission ${permissions.join(' or ')}`,
      });
    }
    next();
  };
}

module.exports = {
  ADMIN_TIERS,
  assertAdminUser,
  isSuperAdminUser,
  resolveAdminTier,
  adminHasPermission,
  adminHasAnyPermission,
  requireAdmin,
  requireSuperAdmin,
  requirePermission,
};
