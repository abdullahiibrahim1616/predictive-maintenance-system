const bcrypt = require('bcryptjs');
const { get, run, query } = require('../config/db');
const { generateToken, generateRefreshToken, hashRefreshToken, verifyToken } = require('../config/jwt');
const { logAudit } = require('../middleware/auditMiddleware');

const ALLOWED_ROLES = ['SUPER_ADMIN', 'MAINTENANCE_MANAGER', 'OPERATIONS_MANAGER', 'TECHNICIAN'];

// Password Complexity Validator: minimum 8 characters, >=1 uppercase, >=1 lowercase, >=1 digit
function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return 'Password is required.';
    }
    if (password.length < 8) {
        return 'Password must be at least 8 characters long.';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter (A-Z).';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least one lowercase letter (a-z).';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one numeric digit (0-9).';
    }
    return null;
}

// RFC compliant email format validator
function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
}

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required.' });
        }

        const cleanEmail = email.toLowerCase().trim();
        const user = await get(`SELECT * FROM users WHERE email = ?`, [cleanEmail]);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid email address or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid email address or password.' });
        }

        // Generate Access Token (15m) & Refresh Token (7d)
        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        // Store hashed refresh token in DB
        const rfHash = hashRefreshToken(refreshToken);
        const rfId = 'rf-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await run(
            `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
            [rfId, user.id, rfHash, expiresAt]
        );

        // Log audit event
        req.user = user;
        await logAudit(req, 'USER_LOGIN', 'users', { email: user.email, role: user.role });

        return res.json({
            success: true,
            token,
            refreshToken,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                facility_id: user.facility_id
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, error: 'Internal server login error.' });
    }
}

async function getMe(req, res) {
    try {
        const user = await get(
            `SELECT u.id, u.full_name, u.email, u.role, u.facility_id, f.name as facility_name, u.created_at
             FROM users u
             LEFT JOIN facilities f ON u.facility_id = f.id
             WHERE u.id = ?`,
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ success: false, error: 'User account not found.' });
        }
        return res.json({ success: true, user });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Error fetching user profile.' });
    }
}

async function refreshToken(req, res) {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, error: 'Refresh token is required.' });
        }

        const decoded = verifyToken(refreshToken);
        if (!decoded || decoded.type !== 'refresh') {
            return res.status(403).json({ success: false, error: 'Invalid or expired refresh token.' });
        }

        const rfHash = hashRefreshToken(refreshToken);
        const existingTokenRecord = await get(
            `SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP`,
            [rfHash]
        );

        if (!existingTokenRecord) {
            return res.status(403).json({ success: false, error: 'Refresh token has been revoked or expired.' });
        }

        const user = await get(`SELECT * FROM users WHERE id = ?`, [decoded.id]);
        if (!user || user.token_version !== decoded.token_version) {
            // Invalidate the compromised token record
            await run(`DELETE FROM refresh_tokens WHERE id = ?`, [existingTokenRecord.id]);
            return res.status(403).json({ success: false, error: 'Session revoked. Please log in again.' });
        }

        // Rotate Refresh Token
        await run(`DELETE FROM refresh_tokens WHERE id = ?`, [existingTokenRecord.id]);

        const newAccessToken = generateToken(user);
        const newRefreshToken = generateRefreshToken(user);
        const newRfHash = hashRefreshToken(newRefreshToken);
        const newRfId = 'rf-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await run(
            `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
            [newRfId, user.id, newRfHash, newExpiresAt]
        );

        return res.json({
            success: true,
            token: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (err) {
        console.error('Refresh token error:', err);
        return res.status(500).json({ success: false, error: 'Failed to refresh authentication session.' });
    }
}

async function changePassword(req, res) {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'Current password and new password are required.' });
        }

        const user = await get(`SELECT * FROM users WHERE id = ?`, [userId]);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User account not found.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Current password entered is incorrect.' });
        }

        const complexityError = validatePassword(newPassword);
        if (complexityError) {
            return res.status(400).json({ success: false, error: complexityError });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        const nextTokenVersion = (user.token_version || 1) + 1;

        // Update password and increment token_version to invalidate all existing sessions
        await run(
            `UPDATE users SET password_hash = ?, token_version = ? WHERE id = ?`,
            [newHash, nextTokenVersion, userId]
        );

        // Delete all refresh tokens for this user
        await run(`DELETE FROM refresh_tokens WHERE user_id = ?`, [userId]);

        await logAudit(req, 'USER_PASSWORD_CHANGED', 'users', { userId: user.id, email: user.email });

        // Generate brand new access & refresh tokens for the current caller
        const updatedUser = { ...user, token_version: nextTokenVersion };
        const newAccessToken = generateToken(updatedUser);
        const newRefreshToken = generateRefreshToken(updatedUser);

        const newRfHash = hashRefreshToken(newRefreshToken);
        const newRfId = 'rf-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await run(
            `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
            [newRfId, userId, newRfHash, newExpiresAt]
        );

        return res.json({
            success: true,
            message: 'Password changed successfully. All previous sessions invalidated.',
            token: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (err) {
        console.error('Change password error:', err);
        return res.status(500).json({ success: false, error: 'Failed to change password.' });
    }
}

async function registerUser(req, res) {
    try {
        const { full_name, email, password, role, facility_id } = req.body;

        if (!full_name || !email || !password || !role) {
            return res.status(400).json({ success: false, error: 'Missing required user registration fields.' });
        }

        const cleanEmail = email.toLowerCase().trim();
        if (!validateEmail(cleanEmail)) {
            return res.status(400).json({ success: false, error: 'Invalid email address format.' });
        }

        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({
                success: false,
                error: `Invalid role '${role}'. Allowed roles: ${ALLOWED_ROLES.join(', ')}`
            });
        }

        const pwdError = validatePassword(password);
        if (pwdError) {
            return res.status(400).json({ success: false, error: pwdError });
        }

        const existing = await get(`SELECT id FROM users WHERE email = ?`, [cleanEmail]);
        if (existing) {
            return res.status(400).json({ success: false, error: 'A user with this email address already exists.' });
        }

        const userId = 'usr-' + Date.now();
        const passwordHash = await bcrypt.hash(password, 10);

        await run(
            `INSERT INTO users (id, full_name, email, password_hash, role, facility_id, token_version) VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [userId, full_name.trim(), cleanEmail, passwordHash, role, facility_id || null]
        );

        await logAudit(req, 'CREATE_USER', 'users', { createdUserId: userId, email: cleanEmail, role });

        return res.status(201).json({
            success: true,
            message: 'User provisioned successfully.',
            user: { id: userId, full_name: full_name.trim(), email: cleanEmail, role, facility_id }
        });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ success: false, error: 'Failed to provision user.' });
    }
}

async function listUsers(req, res) {
    try {
        const users = await query(`
            SELECT u.id, u.full_name, u.email, u.role, u.facility_id, f.name as facility_name, u.created_at
             FROM users u
            LEFT JOIN facilities f ON u.facility_id = f.id
            ORDER BY u.created_at DESC
        `);
        return res.json({ success: true, users });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Failed to list users.' });
    }
}

module.exports = {
    login,
    getMe,
    refreshToken,
    changePassword,
    registerUser,
    listUsers,
    validatePassword,
    validateEmail
};
