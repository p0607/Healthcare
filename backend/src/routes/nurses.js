const router = require('express').Router();
const { protect, authorize, requireAdmin, requirePermission } = require('../middleware/auth');
const c = require('../controllers/nurseController');

router.get('/', c.listNurses);
router.get('/available', c.listAvailableAt);
router.put('/me', protect, authorize('nurse'), c.updateMe);
router.patch('/me/settings', protect, authorize('nurse'), c.updateSettings);
router.get('/me/payments', protect, authorize('nurse'), c.myPayments);
router.patch('/me/payout', protect, authorize('nurse'), c.updatePayout);
router.patch('/me/location', protect, authorize('nurse'), c.updateMyLocation);
router.get('/admin/users', protect, requireAdmin, requirePermission('users.read'), c.adminListUsers);
router.patch('/admin/users/:id', protect, requireAdmin, requirePermission('users.update'), c.adminUpdateUser);
router.put('/admin/users/:id', protect, requireAdmin, requirePermission('users.update'), c.adminUpdateUser);

module.exports = router;
