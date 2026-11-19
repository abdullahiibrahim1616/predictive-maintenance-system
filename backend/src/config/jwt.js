const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const resolveEnvFilePath = (filePath) => {
    if (!filePath) return filePath;
    return path.isAbsolute(filePath) ? filePath : path.resolve(__dirname, '../../../', filePath);
};

let JWT_SECRET = process.env.JWT_SECRET;
if (process.env.JWT_SECRET_FILE) {
    const secretFilePath = resolveEnvFilePath(process.env.JWT_SECRET_FILE);
    try {
        JWT_SECRET = fs.readFileSync(secretFilePath, 'utf8').trim();
    } catch (err) {
        console.error(`❌ FATAL: Could not read JWT_SECRET_FILE: ${err.message}`);
        process.exit(1);
    }
}

if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, 'utf8') < 32) {
    console.error('❌ FATAL: Configure a JWT secret with at least 32 bytes. Server cannot start securely.');
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
            token_version: user.token_version || 1,
            type: 'access'
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
