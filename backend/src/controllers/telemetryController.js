const { run, query, get } = require('../config/db');
const { analyzeTelemetry } = require('../services/predictiveEngine');
const { calculateCostAvoidance } = require('../services/costCalculator');
const { logAudit } = require('../middleware/auditMiddleware');
const notificationService = require('../services/notificationService');
const awsIntegrations = require('../services/awsIntegrations');
const { randomUUID } = require('crypto');

async function ingestTelemetry(req, res) {
    try {
        const { equipment_id, vibration_rms_mms, temperature_c, pressure_psi, flow_rate_bpd } = req.body;

        if (!equipment_id || vibration_rms_mms === undefined || temperature_c === undefined) {
            return res.status(400).json({ success: false, error: 'Invalid telemetry payload.' });
        }

        const equipment = await get(`
            SELECT e.*, f.name as facility_name
            FROM equipment e
            JOIN facilities f ON e.facility_id = f.id
            WHERE e.id = ?
        `, [equipment_id]);

        if (!equipment) {
            return res.status(404).json({ success: false, error: 'Target equipment asset not found.' });
        }

        // Run Predictive Analytics Engine
        const analysis = analyzeTelemetry({
            vibration_rms_mms: parseFloat(vibration_rms_mms),
            temperature_c: parseFloat(temperature_c),
            pressure_psi: parseFloat(pressure_psi || 0),
            flow_rate_bpd: parseFloat(flow_rate_bpd || 0)
        });

        const logId = `log-${randomUUID()}`;
        await run(`
            INSERT INTO telemetry_logs (id, equipment_id, vibration_rms_mms, temperature_c, pressure_psi, flow_rate_bpd, health_index, anomaly_flag, failure_prediction)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            logId,
            equipment_id,
            vibration_rms_mms,
            temperature_c,
            pressure_psi || 0,
            flow_rate_bpd || 0,
            analysis.healthIndex,
            analysis.anomalyFlag,
            analysis.failurePrediction
        ]);

        // Determine Equipment Status based on Health Index
        let newStatus = 'OPERATIONAL';
        if (analysis.healthIndex < 45) newStatus = 'DEGRADED';
        else if (analysis.healthIndex < 70) newStatus = 'WARNING';

        await run(`UPDATE equipment SET health_index = ?, status = ? WHERE id = ?`, 
            [analysis.healthIndex, newStatus, equipment_id]);

        let autoWorkOrderCreated = null;
        let notificationsDispatched = [];
        let associatedWorkOrderId = null;

        // Auto-generate Work Order & Cost Avoidance Estimate if Anomaly Detected or Health < 65%
        if (analysis.healthIndex < 65.0) {
            // Check if there is already an open work order for this equipment
            const existingWO = await get(`SELECT id FROM work_orders WHERE equipment_id = ? AND status IN ('OPEN', 'IN_PROGRESS')`, [equipment_id]);

            let woId = existingWO ? existingWO.id : 'wo-auto-' + Date.now();
            associatedWorkOrderId = woId;
            const priority = analysis.healthIndex < 45 ? 'CRITICAL' : 'HIGH';

            if (!existingWO) {
                const title = `[AUTO-ALERT] Predictive Maint: ${equipment.tag_name} (${analysis.failurePrediction})`;
                const desc = `Automated trigger: Equipment Health Index dropped to ${analysis.healthIndex}%. Sensor metrics: Vibration=${vibration_rms_mms}mm/s, Temp=${temperature_c}°C. Estimated RUL: ${analysis.estimatedRulHours} hours.`;

                await run(`
                    INSERT INTO work_orders (id, equipment_id, title, description, priority, status, predicted_failure_mode, estimated_rul_hours)
                    VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?)
                `, [woId, equipment_id, title, desc, priority, analysis.failurePrediction, analysis.estimatedRulHours]);

                // Create Cost Avoidance Report
                const costEst = calculateCostAvoidance(48.0, 18500.0, 42000.0);
                const carId = 'car-' + Date.now();
                await run(`
                    INSERT INTO cost_avoidance_reports (id, work_order_id, estimated_downtime_hours_avoided, production_loss_rate_usd_per_hr, estimated_repair_cost_usd, net_savings_usd)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [carId, woId, 48.0, 18500.0, 42000.0, costEst.netSavingsUsd]);

                autoWorkOrderCreated = {
                    work_order_id: woId,
                    priority,
                    failurePrediction: analysis.failurePrediction,
                    estimatedRulHours: analysis.estimatedRulHours,
                    netSavingsUsd: costEst.netSavingsUsd
                };

                await logAudit(req, 'AUTO_WORK_ORDER_TRIGGERED', 'work_orders', { workOrderId: woId, equipment_id, healthIndex: analysis.healthIndex });
            }

            // Dispatch Real-Time SMS & Email Notifications
            const smsRes = await notificationService.sendSMSAlert({
                phone: process.env.AWS_SNS_SMS_PHONE,
                name: 'Emeka Okafor (Field Tech)',
                tag: equipment.tag_name,
                facility: equipment.facility_name,
                healthIndex: analysis.healthIndex,
                workOrderId: woId
            });

            const emailRes = await notificationService.sendEmailAlert({
                to: process.env.MAINTENANCE_ALERT_EMAIL,
                name: 'Dr. Fatima Aliyu (Maint Mgr)',
                tag: equipment.tag_name,
                facility: equipment.facility_name,
                failureMode: analysis.failurePrediction,
                healthIndex: analysis.healthIndex,
                workOrderId: woId
            });

            notificationsDispatched = [smsRes, emailRes];
        }

        let archive;
        try {
            archive = await awsIntegrations.archiveTelemetry({
                id: logId,
                timestamp: new Date().toISOString(),
                equipment_id,
                equipment_tag: equipment.tag_name,
                facility: equipment.facility_name,
                measurements: {
                    vibration_rms_mms,
                    temperature_c,
                    pressure_psi: pressure_psi || 0,
                    flow_rate_bpd: flow_rate_bpd || 0
                },
                analysis: {
                    health_index: analysis.healthIndex,
                    anomaly_flag: Boolean(analysis.anomalyFlag),
                    failure_prediction: analysis.failurePrediction,
                    estimated_rul_hours: analysis.estimatedRulHours
                },
                work_order_id: associatedWorkOrderId
            });
        } catch (err) {
            console.error('Telemetry was saved to the database but S3 archival failed:', err);
            archive = {
                status: 'FAILED',
                error: 'Telemetry was saved to the database but could not be archived to S3.'
            };
        }

        return res.status(201).json({
            success: true,
            telemetry: {
                id: logId,
                equipment_id,
                health_index: analysis.healthIndex,
                anomaly_flag: Boolean(analysis.anomalyFlag),
                failure_prediction: analysis.failurePrediction,
                estimated_rul_hours: analysis.estimatedRulHours,
                new_status: newStatus
            },
            autoWorkOrderCreated,
            notificationsDispatched,
            archive
        });

    } catch (err) {
        console.error('Telemetry ingestion error:', err);
        return res.status(500).json({ success: false, error: 'Telemetry ingestion failed.' });
    }
}

async function getRecentTelemetry(req, res) {
    try {
        const { equipment_id } = req.params;
        const logs = await query(`
            SELECT * FROM telemetry_logs
            WHERE equipment_id = ?
            ORDER BY timestamp DESC
            LIMIT 50
        `, [equipment_id]);

        return res.json({ success: true, count: logs.length, logs });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Failed to fetch telemetry history.' });
    }
}

module.exports = {
    ingestTelemetry,
    getRecentTelemetry
};
