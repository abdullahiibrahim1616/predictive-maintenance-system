const awsIntegrations = require('../services/awsIntegrations');
const { logAudit } = require('../middleware/auditMiddleware');

async function getKmsRotationStatus(req, res) {
    try {
        const rotation = await awsIntegrations.getKmsRotationStatus();
        return res.json({ success: true, rotation });
    } catch (err) {
        console.error('AWS KMS rotation status request failed:', err);
        const status = err.code === 'AWS_INTEGRATION_CONFIG_MISSING' ? 503 : 502;
        return res.status(status).json({
            success: false,
            error: status === 503
                ? 'AWS KMS key configuration is missing.'
                : 'Failed to retrieve AWS KMS rotation status.'
        });
    }
}

async function enableKmsRotation(req, res) {
    try {
        const rotation = await awsIntegrations.enableKmsRotation();
        await logAudit(req, 'AWS_KMS_AUTO_ROTATION_ENABLED', 'aws_kms_key', {
            keyId: rotation.keyId,
            changed: rotation.changed
        });
        return res.json({ success: true, rotation });
    } catch (err) {
        console.error('AWS KMS automatic rotation request failed:', err);
        const status = err.code === 'AWS_INTEGRATION_CONFIG_MISSING' ? 503 : 502;
        return res.status(status).json({
            success: false,
            error: status === 503
                ? 'AWS KMS key configuration is missing.'
                : 'Failed to enable AWS KMS automatic rotation.'
        });
    }
}

module.exports = {
    getKmsRotationStatus,
    enableKmsRotation
};
