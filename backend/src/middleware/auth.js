const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { resolveAdminTier } = require('../lib/adminPermissions');

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ message: 'User no longer exists' });
    if (!user.accountActive) return res.status(403).json({ message: 'Account is deactivated' });

    req.user = user;
    req.adminTier = resolveAdminTier(user);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

/** Legacy role gate for patient/nurse routes. */
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Forbidden: requires role ${roles.join(' or ')}` });
    }
    next();
  };

const {
  requireAdmin,
  requireSuperAdmin,
  requirePermission,
} = require('../lib/adminPermissions');

module.exports = {
  protect,
  authorize,
  requireAdmin,
  requireSuperAdmin,
  requirePermission,
};
