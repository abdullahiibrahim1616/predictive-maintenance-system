const express = require('express');
const securityController = require('../controllers/securityController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

const router = express.Router();
const authorizeKmsRotation = [
    authenticateToken,
    requirePermission('kms.rotate')
];

router.get('/kms/rotation', ...authorizeKmsRotation, securityController.getKmsRotationStatus);
router.post('/kms/rotation', ...authorizeKmsRotation, securityController.enableKmsRotation);

module.exports = router;
