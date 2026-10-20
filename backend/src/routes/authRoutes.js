const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// Login rate limiter: Max 10 attempts per 15 minutes per IP to block brute-force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many authentication attempts from this IP address. Please wait 15 minutes before trying again.'
    }
});

// Public Authentication Endpoints
router.post('/login', loginLimiter, authController.login);
router.post('/refresh', authController.refreshToken);

// Authenticated Endpoints
router.get('/me', authenticateToken, authController.getMe);
router.patch('/change-password', authenticateToken, authController.changePassword);

// RBAC Protected Administrative Endpoints
router.post('/register', authenticateToken, requirePermission('users.manage'), authController.registerUser);
router.get('/users', authenticateToken, requirePermission('users.manage'), authController.listUsers);

module.exports = router;
