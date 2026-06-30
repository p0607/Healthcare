const router = require('express').Router();
const {
  listTeamAdmins,
  createTeamAdmin,
  getAdminProfile,
} = require('../controllers/adminController');
const { protect, requireAdmin, requireSuperAdmin } = require('../middleware/auth');

router.get('/me', protect, requireAdmin, getAdminProfile);
router.get('/team', protect, requireSuperAdmin, listTeamAdmins);
router.post('/team', protect, requireSuperAdmin, createTeamAdmin);

module.exports = router;
