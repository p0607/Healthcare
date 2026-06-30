const router = require('express').Router();
const { protect, authorize, requireAdmin, requirePermission } = require('../middleware/auth');
const { otpLimiter } = require('../middleware/rateLimit');
const c = require('../controllers/requestController');

// USER endpoints
router.post('/quote', protect, authorize('user'), c.quoteFee);
router.post('/', protect, authorize('user'), c.createRequest);
router.get('/mine', protect, authorize('user'), c.myRequests);
router.post('/:id/cancel', protect, authorize('user'), c.cancelRequest);
router.post('/:id/rate', protect, authorize('user'), c.rateRequest);

// NURSE endpoints
router.get('/pending', protect, authorize('nurse'), c.pendingForNurses);
router.get('/assigned', protect, authorize('nurse'), c.assignedToMe);
router.post('/:id/accept', protect, authorize('nurse'), c.acceptRequest);
router.post('/:id/otp/send', otpLimiter, protect, authorize('nurse'), c.sendVisitOtp);
router.post('/:id/otp/verify', otpLimiter, protect, authorize('nurse'), c.verifyVisitOtp);
router.post('/:id/status', protect, authorize('nurse'), c.updateStatus);

// ADMIN endpoints
router.get('/admin/all', protect, requireAdmin, requirePermission('requests.read'), c.adminAllRequests);
router.get('/admin/stats', protect, requireAdmin, requirePermission('stats.read'), c.adminStats);
router.get('/admin/paid', protect, requireAdmin, requirePermission('stats.read'), c.adminPaidRequests);

module.exports = router;
