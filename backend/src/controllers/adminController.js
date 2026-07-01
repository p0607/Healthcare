const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { toSafeUser } = require('../lib/format');
const { validatePassword } = require('../lib/password');
const { ADMIN_TIERS, isSuperAdminUser } = require('../lib/adminPermissions');
const { audit } = require('../lib/auditLog');

exports.listTeamAdmins = async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        adminTier: true,
        accountActive: true,
        createdAt: true,
      },
    });
    return res.json({ admins });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Could not list admins' });
  }
};

exports.createTeamAdmin = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password;
    const phone = req.body?.phone ? String(req.body.phone).trim() : null;
    const tierRaw = String(req.body?.adminTier || ADMIN_TIERS.admin);
    const adminTier =
      tierRaw === ADMIN_TIERS.super_admin && isSuperAdminUser(req.user)
        ? ADMIN_TIERS.super_admin
        : ADMIN_TIERS.admin;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, and password are required' });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(String(password), 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashed,
        role: 'admin',
        adminTier,
        accountKinds: [],
      },
    });

    audit(req, {
      action: 'admin.created',
      entityType: 'User',
      entityId: user.id,
      metadata: { email, adminTier },
    });

    return res.status(201).json({
      message: 'Admin account created',
      user: toSafeUser(user),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Could not create admin' });
  }
};

exports.getAdminProfile = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const safe = toSafeUser(req.user);
    safe.adminTier = req.user.adminTier || ADMIN_TIERS.admin;
    safe.role = 'admin';
    safe.activeKind = 'admin';
    return res.json({ user: safe });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Could not load admin profile' });
  }
};
