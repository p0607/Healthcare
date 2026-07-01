const router = require('express').Router();
const {
  listTeamAdmins,
  createTeamAdmin,
  getAdminProfile,
} = require('../controllers/adminController');
const { listAuditLogs } = require('../controllers/auditLogController');
const { protect, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { requirePermission } = require('../lib/adminPermissions');

router.get('/me', protect, requireAdmin, getAdminProfile);
router.get('/team', protect, requireSuperAdmin, listTeamAdmins);
router.post('/team', protect, requireSuperAdmin, createTeamAdmin);
router.get('/audit-logs', protect, requireAdmin, requirePermission('audit.read'), listAuditLogs);

module.exports = router;
