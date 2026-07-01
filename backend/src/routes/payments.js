const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { publicApiLimiter } = require('../middleware/rateLimit');
const c = require('../controllers/paymentController');

router.get('/razorpay/config', publicApiLimiter, c.getRazorpayConfig);
router.post('/razorpay/order', protect, authorize('user'), c.createRazorpayOrder);

module.exports = router;
