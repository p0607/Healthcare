const express = require('express');
const { protect, requireAdmin, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/bookingCategoryController');

const router = express.Router();

router.get('/admin/all', protect, requireAdmin, requirePermission('catalog.read'), ctrl.listAdmin);
router.patch('/admin/:serviceType', protect, requireAdmin, requirePermission('catalog.write'), ctrl.update);

module.exports = router;
