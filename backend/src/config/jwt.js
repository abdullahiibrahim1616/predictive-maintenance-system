const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET environment variable is not configured. Server cannot start securely.');
    process.exit(1);
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // Short-lived access token
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d'; // Long-lived refresh token

function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            facility_id: user.facility_id,
            full_name: user.full_name,
            token_version: user.token_version || 1
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

function generateRefreshToken(user) {
    return jwt.sign(
        {
            id: user.id,
            token_version: user.token_version || 1,
            type: 'refresh'
        },
        JWT_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN }
    );
}

function hashRefreshToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
    generateToken,
    verifyToken,
    generateRefreshToken,
    hashRefreshToken,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    REFRESH_EXPIRES_IN
};
