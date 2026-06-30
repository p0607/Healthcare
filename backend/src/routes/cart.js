const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/cartController');

const router = express.Router();

router.get('/me', protect, authorize('user'), c.getMyCart);
router.put('/me', protect, authorize('user'), c.saveMyCart);

module.exports = router;
