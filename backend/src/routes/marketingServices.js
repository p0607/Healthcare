const express = require('express');
const { protect, requireAdmin, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/marketingServiceController');

const router = express.Router();

router.get('/admin/all', protect, requireAdmin, requirePermission('catalog.read'), ctrl.listAdmin);
router.post('/admin', protect, requireAdmin, requirePermission('catalog.write'), ctrl.create);
router.patch('/admin/default/:sectionId', protect, requireAdmin, requirePermission('catalog.write'), ctrl.updateDefaultSection);
router.delete('/admin/default/:sectionId', protect, requireAdmin, requirePermission('catalog.write'), ctrl.removeDefaultSection);
router.patch('/admin/default/:sectionId/services/:serviceId', protect, requireAdmin, requirePermission('catalog.write'), ctrl.updateDefaultSubService);
router.delete('/admin/default/:sectionId/services/:serviceId', protect, requireAdmin, requirePermission('catalog.write'), ctrl.removeDefaultSubService);
router.patch('/admin/:sectionId', protect, requireAdmin, requirePermission('catalog.write'), ctrl.updateSection);
router.delete('/admin/:sectionId', protect, requireAdmin, requirePermission('catalog.write'), ctrl.removeSection);
router.patch('/admin/:sectionId/services/:serviceId', protect, requireAdmin, requirePermission('catalog.write'), ctrl.updateSubService);
router.delete('/admin/:sectionId/services/:serviceId', protect, requireAdmin, requirePermission('catalog.write'), ctrl.removeSubService);

module.exports = router;
