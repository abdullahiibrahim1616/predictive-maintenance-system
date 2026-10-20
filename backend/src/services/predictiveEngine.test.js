const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeTelemetry } = require('./predictiveEngine');

describe('Predictive Maintenance Engine Unit Tests', () => {
    test('should return 100% health and baseline RUL for normal telemetry values', () => {
        const telemetry = {
            vibration_rms_mms: 2.1,
            temperature_c: 65.0,
            pressure_psi: 1200,
            flow_rate_bpd: 12000
        };

        const result = analyzeTelemetry(telemetry);

        assert.equal(result.healthIndex, 100);
        assert.equal(result.anomalyFlag, 0);
        assert.equal(result.failurePrediction, 'NORMAL');
        assert.equal(result.estimatedRulHours, 2400.0);
    });

    test('should detect Warning Vibration and calculate penalty score', () => {
        const telemetry = {
            vibration_rms_mms: 5.5,
            temperature_c: 68.0,
            pressure_psi: 1200,
            flow_rate_bpd: 12000
        };

        const result = analyzeTelemetry(telemetry);

        assert.equal(result.healthIndex, 80);
        assert.equal(result.anomalyFlag, 1);
        assert.equal(result.failurePrediction, 'Bearing Wear & Overheating');
        assert.equal(result.estimatedRulHours, 1600.0);
    });

    test('should detect Critical Dynamic Unbalance when vibration exceeds 8.0 mm/s', () => {
        const telemetry = {
            vibration_rms_mms: 9.5,
            temperature_c: 96.0,
            pressure_psi: 1650,
            flow_rate_bpd: 9000
        };

        const result = analyzeTelemetry(telemetry);

        assert.equal(result.healthIndex, 0);
        assert.equal(result.anomalyFlag, 1);
        assert.equal(result.failurePrediction, 'Critical Dynamic Unbalance / Bearing Failure');
        assert.equal(result.estimatedRulHours, 12.0);
    });
});
