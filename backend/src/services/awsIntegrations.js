const {
    S3Client,
    PutObjectCommand
} = require('@aws-sdk/client-s3');
const {
    SNSClient,
    PublishCommand
} = require('@aws-sdk/client-sns');
const {
    KMSClient,
    GetKeyRotationStatusCommand,
    EnableKeyRotationCommand
} = require('@aws-sdk/client-kms');

function createAwsIntegrations({ env = process.env, clientFactory } = {}) {
    const clients = {};

    function getSetting(name) {
        return typeof env[name] === 'string' ? env[name].trim() : '';
    }

    function getRegion() {
        const region = getSetting('AWS_REGION') || getSetting('AWS_DEFAULT_REGION');
        if (!region) {
            const error = new Error('AWS_REGION must be configured for AWS integrations.');
            error.code = 'AWS_INTEGRATION_CONFIG_MISSING';
            throw error;
        }
        return region;
    }

    function getClient(service) {
        if (!clients[service]) {
            const region = getRegion();
            if (clientFactory) {
                clients[service] = clientFactory(service, region);
            } else {
                const Client = { s3: S3Client, sns: SNSClient, kms: KMSClient }[service];
                clients[service] = new Client({ region });
            }
        }
        return clients[service];
    }

    function requireSetting(name) {
        const value = getSetting(name);
        if (!value) {
            const error = new Error(`${name} must be configured.`);
            error.code = 'AWS_INTEGRATION_CONFIG_MISSING';
            throw error;
        }
        return value;
    }

    async function archiveTelemetry(record) {
        const bucket = getSetting('AWS_S3_BUCKET');
        if (!bucket) return { status: 'DISABLED' };

        const date = new Date(record.timestamp || Date.now());
        if (Number.isNaN(date.getTime())) {
            throw new Error('Telemetry archive timestamp is invalid.');
        }

        const prefix = (getSetting('AWS_S3_PREFIX') || 'telemetry').replace(/^\/+|\/+$/g, '');
        const equipmentId = encodeURIComponent(String(record.equipment_id || 'unknown'));
        const recordId = encodeURIComponent(String(record.id || 'unknown'));
        const datePrefix = date.toISOString().slice(0, 10).replace(/-/g, '/');
        const keyParts = [prefix, datePrefix, equipmentId, `${recordId}.json`].filter(Boolean);
        const key = keyParts.join('/');
        const kmsKeyId = getSetting('AWS_KMS_KEY_ID');
        const input = {
            Bucket: bucket,
            Key: key,
            Body: Buffer.from(JSON.stringify(record)),
            ContentType: 'application/json'
        };
        if (kmsKeyId) {
            input.ServerSideEncryption = 'aws:kms';
            input.SSEKMSKeyId = kmsKeyId;
        }

        await getClient('s3').send(new PutObjectCommand(input));
        return { status: 'ARCHIVED', bucket, key };
    }

    function isSnsEnabled() {
        return getSetting('AWS_SNS_ENABLED').toLowerCase() === 'true';
    }

    async function publishSms(message) {
        if (!isSnsEnabled()) return { status: 'SIMULATED', simulated: true };

        const phoneNumber = requireSetting('AWS_SNS_SMS_PHONE');
        const result = await getClient('sns').send(new PublishCommand({
            PhoneNumber: phoneNumber,
            Message: message
        }));
        return { status: 'PUBLISHED', destination: phoneNumber, messageId: result.MessageId };
    }

    async function publishAlertTopic({ subject, message }) {
        if (!isSnsEnabled()) return { status: 'SIMULATED', simulated: true };

        const topicArn = requireSetting('AWS_SNS_TOPIC_ARN');
        const result = await getClient('sns').send(new PublishCommand({
            TopicArn: topicArn,
            Subject: String(subject).slice(0, 100),
            Message: message
        }));
        return { status: 'PUBLISHED', destination: topicArn, messageId: result.MessageId };
    }

    async function getKmsRotationStatus() {
        const keyId = requireSetting('AWS_KMS_KEY_ID');
        const result = await getClient('kms').send(new GetKeyRotationStatusCommand({ KeyId: keyId }));
        return { keyId, rotationEnabled: Boolean(result.KeyRotationEnabled) };
    }

    async function enableKmsRotation() {
        const current = await getKmsRotationStatus();
        if (!current.rotationEnabled) {
            await getClient('kms').send(new EnableKeyRotationCommand({ KeyId: current.keyId }));
        }
        return { ...current, rotationEnabled: true, changed: !current.rotationEnabled };
    }

    return {
        archiveTelemetry,
        publishSms,
        publishAlertTopic,
        getKmsRotationStatus,
        enableKmsRotation
    };
}

module.exports = createAwsIntegrations();
module.exports.createAwsIntegrations = createAwsIntegrations;
