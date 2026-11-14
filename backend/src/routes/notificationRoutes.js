const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken, requirePermission, requireRoles } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, requirePermission('telemetry.view'), notificationController.getNotifications);
router.post('/test', authenticateToken, requireRoles('SUPER_ADMIN'), notificationController.triggerTestNotification);

module.exports = router;
