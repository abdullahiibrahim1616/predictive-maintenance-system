const { analyzeTelemetry, THRESHOLDS } = require('./predictiveEngine');

describe('Predictive Maintenance Engine Unit Tests', () => {

    test('should return 100% health and baseline RUL for normal telemetry values', () => {
        const telemetry = {
            vibration_rms_mms: 2.1,
            temperature_c: 65.0,
            pressure_psi: 1200,
            flow_rate_bpd: 12000
        };

        const result = analyzeTelemetry(telemetry);

        expect(result.healthIndex).toBe(100);
        expect(result.anomalyFlag).toBe(0);
        expect(result.failurePrediction).toBe('NORMAL');
        expect(result.estimatedRulHours).toBe(2400.0);
    });

    test('should detect Warning Vibration and calculate penalty score', () => {
        const telemetry = {
            vibration_rms_mms: 5.5, // >= warning (4.5)
            temperature_c: 68.0,
            pressure_psi: 1200,
            flow_rate_bpd: 12000
        };

        const result = analyzeTelemetry(telemetry);

        expect(result.healthIndex).toBe(80); // 100 - 20
        expect(result.anomalyFlag).toBe(1);
        expect(result.failurePrediction).toBe('Bearing Wear & Overheating');
        expect(result.estimatedRulHours).toBe(1600.0); // 80 * 20
    });

    test('should detect Critical Dynamic Unbalance when vibration exceeds 8.0 mm/s', () => {
        const telemetry = {
            vibration_rms_mms: 9.5, // >= critical (8.0)
            temperature_c: 96.0,  // >= critical (95.0)
            pressure_psi: 1650,
            flow_rate_bpd: 9000   // cavitation flag
        };

        const result = analyzeTelemetry(telemetry);

        expect(result.healthIndex).toBe(0); // 100 - (45 + 40 + 25) = -10 clamped to 0
        expect(result.anomalyFlag).toBe(1);
        expect(result.failurePrediction).toBe('Critical Dynamic Unbalance / Bearing Failure');
        expect(result.estimatedRulHours).toBe(12.0); // clamped minimum RUL
    });

});
