const router = require('express').Router();
const ctrl = require('../controllers/careServiceController');
const { protect, requireAdmin, requirePermission } = require('../middleware/auth');

router.get('/admin/all', protect, requireAdmin, requirePermission('catalog.read'), ctrl.listAdmin);
router.post('/', protect, requireAdmin, requirePermission('catalog.write'), ctrl.create);
router.patch('/:id', protect, requireAdmin, requirePermission('catalog.write'), ctrl.update);
router.delete('/:id', protect, requireAdmin, requirePermission('catalog.write'), ctrl.remove);

module.exports = router;
