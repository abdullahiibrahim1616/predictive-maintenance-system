const { verifyToken } = require('../config/jwt');
const { query, get } = require('../config/db');

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Access denied. Authentication token missing.' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({ success: false, error: 'Invalid or expired session token.' });
    }

    // Verify token_version against current database state for instant revocation
    if (decoded.token_version !== undefined) {
        try {
            const user = await get(`SELECT id, token_version FROM users WHERE id = ?`, [decoded.id]);
            if (!user || user.token_version !== decoded.token_version) {
                return res.status(401).json({
                    success: false,
                    error: 'Session has expired or was revoked. Please log in again.'
                });
            }
        } catch (dbErr) {
            console.error('Token version check error:', dbErr);
        }
    }

    req.user = decoded;
    next();
}

function requireRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required.' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Unauthorized. Required role: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`
            });
        }

        next();
    };
}

/**
 * Stage 1 Enhancement: Dynamic Atomic Permission Enforcement Middleware
 * Queries database role_permissions dynamically to respect real-time RBAC policy updates.
 */
function requirePermission(...requiredPermissions) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required.' });
        }

        // Super Admin retains unrestricted bypass
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        try {
            // Fetch live permissions for user's assigned role
            const userPerms = await query(
                `SELECT permission_key FROM role_permissions WHERE role_id = ?`,
                [req.user.role]
            );
            const grantedKeys = new Set(userPerms.map(p => p.permission_key));

            const hasAll = requiredPermissions.every(p => grantedKeys.has(p));
            if (!hasAll) {
                return res.status(403).json({
                    success: false,
                    error: `Forbidden: Missing required permission(s) [${requiredPermissions.join(', ')}]`,
                    userRole: req.user.role
                });
            }

            next();
        } catch (err) {
            console.error('RBAC Permission Validation Error:', err);
            return res.status(500).json({ success: false, error: 'Internal RBAC permission authorization failure.' });
        }
    };
}

/**
 * Facility Scope Guard (BOLA Mitigation)
 * Ensures non-SuperAdmins can only operate within their assigned plant facility.
 */
function requireFacilityAccess(facilityIdParam = 'facility_id') {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required.' });
        }

        if (req.user.role === 'SUPER_ADMIN') {
            return next(); // Super Admin has global access
        }

        const targetFacilityId = req.params[facilityIdParam] || req.body[facilityIdParam] || req.query[facilityIdParam];
        if (targetFacilityId && req.user.facility_id && targetFacilityId !== req.user.facility_id) {
            return res.status(403).json({
                success: false,
                error: `Cross-facility access denied. Your assigned facility is [${req.user.facility_id}], but target facility is [${targetFacilityId}].`
            });
        }

        next();
    };
}

module.exports = {
    authenticateToken,
    requireRoles,
    requirePermission,
    requireFacilityAccess
};
