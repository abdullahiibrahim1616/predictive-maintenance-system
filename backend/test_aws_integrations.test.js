const assert = require('node:assert/strict');
const test = require('node:test');
const {
    PutObjectCommand
} = require('@aws-sdk/client-s3');
const {
    PublishCommand
} = require('@aws-sdk/client-sns');
const {
    GetKeyRotationStatusCommand,
    EnableKeyRotationCommand
} = require('@aws-sdk/client-kms');
const { createAwsIntegrations } = require('./src/services/awsIntegrations');

function createStubFactory(responses = {}) {
    const calls = [];
    const clientFactory = (service, region) => ({
        send: async (command) => {
            calls.push({ service, region, command });
            if (responses[command.constructor.name]) {
                return responses[command.constructor.name](command);
            }
            return { MessageId: 'message-123' };
        }
    });
    return { calls, clientFactory };
}

test('telemetry archival is disabled without a bucket', async () => {
    const { clientFactory, calls } = createStubFactory();
    const integrations = createAwsIntegrations({ env: {}, clientFactory });

    assert.deepEqual(await integrations.archiveTelemetry({ id: 'log-1' }), { status: 'DISABLED' });
    assert.equal(calls.length, 0);
});

test('S3 archives telemetry using the configured bucket and KMS key', async () => {
    const { clientFactory, calls } = createStubFactory();
    const integrations = createAwsIntegrations({
        env: {
            AWS_REGION: 'eu-west-1',
            AWS_S3_BUCKET: 'telemetry-bucket',
            AWS_S3_PREFIX: '/raw/',
            AWS_KMS_KEY_ID: 'kms-key-1'
        },
        clientFactory
    });
    const record = {
        id: 'log-1',
        timestamp: '2026-11-14T12:00:00.000Z',
        equipment_id: 'asset/1',
        measurements: { temperature_c: 72 }
    };

    const result = await integrations.archiveTelemetry(record);
    const call = calls[0];

    assert.equal(result.status, 'ARCHIVED');
    assert.equal(call.service, 's3');
    assert.equal(call.region, 'eu-west-1');
    assert.ok(call.command instanceof PutObjectCommand);
    assert.equal(call.command.input.Bucket, 'telemetry-bucket');
    assert.equal(call.command.input.Key, 'raw/2026/11/14/asset%2F1/log-1.json');
    assert.deepEqual(JSON.parse(call.command.input.Body.toString()), record);
    assert.equal(call.command.input.ServerSideEncryption, 'aws:kms');
    assert.equal(call.command.input.SSEKMSKeyId, 'kms-key-1');
});

test('SNS remains visibly simulated unless explicitly enabled', async () => {
    const { clientFactory, calls } = createStubFactory();
    const integrations = createAwsIntegrations({ env: {}, clientFactory });

    assert.deepEqual(await integrations.publishSms('test'), { status: 'SIMULATED', simulated: true });
    assert.deepEqual(
        await integrations.publishAlertTopic({ subject: 'test', message: 'test' }),
        { status: 'SIMULATED', simulated: true }
    );
    assert.equal(calls.length, 0);
});

test('SNS publishes to the configured SMS phone and alert topic', async () => {
    const { clientFactory, calls } = createStubFactory();
    const integrations = createAwsIntegrations({
        env: {
            AWS_REGION: 'eu-west-1',
            AWS_SNS_ENABLED: 'true',
            AWS_SNS_SMS_PHONE: '+2348000000000',
            AWS_SNS_TOPIC_ARN: 'arn:aws:sns:eu-west-1:123456789012:alerts'
        },
        clientFactory
    });

    const sms = await integrations.publishSms('critical alert');
    const topic = await integrations.publishAlertTopic({ subject: 'a'.repeat(120), message: 'critical alert' });

    assert.equal(sms.status, 'PUBLISHED');
    assert.equal(sms.destination, '+2348000000000');
    assert.equal(topic.status, 'PUBLISHED');
    assert.equal(topic.destination, 'arn:aws:sns:eu-west-1:123456789012:alerts');
    assert.equal(calls.length, 2);
    assert.ok(calls.every(call => call.command instanceof PublishCommand));
    assert.equal(calls[0].command.input.PhoneNumber, '+2348000000000');
    assert.equal(calls[1].command.input.Subject.length, 100);
});

test('KMS endpoint service enables automatic rotation and is idempotent', async () => {
    let enabled = false;
    const { clientFactory, calls } = createStubFactory({
        GetKeyRotationStatusCommand: () => ({ KeyRotationEnabled: enabled }),
        EnableKeyRotationCommand: () => {
            enabled = true;
            return {};
        }
    });
    const integrations = createAwsIntegrations({
        env: { AWS_REGION: 'eu-west-1', AWS_KMS_KEY_ID: 'kms-key-1' },
        clientFactory
    });

    const first = await integrations.enableKmsRotation();
    const second = await integrations.enableKmsRotation();

    assert.deepEqual(first, { keyId: 'kms-key-1', rotationEnabled: true, changed: true });
    assert.deepEqual(second, { keyId: 'kms-key-1', rotationEnabled: true, changed: false });
    assert.equal(calls.filter(call => call.command instanceof EnableKeyRotationCommand).length, 1);
    assert.equal(calls.filter(call => call.command instanceof GetKeyRotationStatusCommand).length, 2);
});

test('configured AWS calls fail explicitly when the region is missing', async () => {
    const { clientFactory, calls } = createStubFactory();
    const integrations = createAwsIntegrations({
        env: { AWS_S3_BUCKET: 'telemetry-bucket' },
        clientFactory
    });

    await assert.rejects(
        integrations.archiveTelemetry({ id: 'log-1' }),
        { code: 'AWS_INTEGRATION_CONFIG_MISSING' }
    );
    assert.equal(calls.length, 0);
});
