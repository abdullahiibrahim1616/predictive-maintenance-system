const { run, query } = require('../config/db');
const { randomUUID } = require('crypto');
const awsIntegrations = require('./awsIntegrations');

// Ensure notifications table exists
async function initNotificationTable() {
    await run(`
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            recipient_name TEXT NOT NULL,
            recipient_contact TEXT NOT NULL,
            channel TEXT CHECK(channel IN ('EMAIL', 'SMS')) NOT NULL,
            equipment_tag TEXT,
            subject TEXT NOT NULL,
            message_body TEXT NOT NULL,
            status TEXT DEFAULT 'DELIVERED',
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// Initialize on service load
initNotificationTable().catch(err => console.error('Failed to init notifications table:', err));

/**
 * Send a configured SMS through AWS SNS, or record a local simulation.
 */
async function sendSMSAlert({ phone, name, tag, facility, healthIndex, workOrderId }) {
    const id = `sms-${randomUUID()}`;
    const subject = `[SEPLAT CRITICAL SMS ALERT] ${tag}`;
    const message_body = `SEPLAT ALERT: Critical health (${healthIndex}%) detected on ${tag} at ${facility}. Failure Risk: Urgent. Work Order #${workOrderId || 'AUTO'} generated. Technician ${name} dispatched.`;
    const contact = phone || '+234-803-555-0192';

    try {
        const delivery = await awsIntegrations.publishSms(message_body);
        const recipientContact = delivery.destination || contact;
        await run(`
            INSERT INTO notifications (id, recipient_name, recipient_contact, channel, equipment_tag, subject, message_body, status)
            VALUES (?, ?, ?, 'SMS', ?, ?, ?, ?)
        `, [id, name, recipientContact, tag, subject, message_body, delivery.status]);

        console.log(`[${delivery.status}] SMS alert for ${name} (${recipientContact})`);
        return {
            success: true,
            id,
            channel: 'SMS',
            contact: recipientContact,
            subject,
            message_body,
            status: delivery.status,
            simulated: Boolean(delivery.simulated),
            messageId: delivery.messageId
        };
    } catch (err) {
        console.error('SMS notification error:', err);
        await recordFailedNotification({
            id, name, contact, tag, subject, message_body, channel: 'SMS'
        });
        return { success: false, id, channel: 'SMS', status: 'FAILED', error: err.message };
    }
}

/**
 * Publish email alerts to the configured SNS topic, or record a local simulation.
 */
async function sendEmailAlert({ to, name, tag, facility, failureMode, healthIndex, workOrderId }) {
    const id = `email-${randomUUID()}`;
    const subject = `⚠️ SEPLAT PREDICTIVE ALERT: ${tag} (${facility}) Health Index Critical (${healthIndex}%)`;
    const message_body = `Dear ${name},\n\nAutomated sensor telemetry at ${facility} has detected a critical anomaly on Asset Tag: ${tag}.\n\n- Current Health Index: ${healthIndex}%\n- Predicted Failure Mode: ${failureMode}\n- Action Required: Immediate Inspection\n- Work Order Reference: ${workOrderId || 'N/A'}\n\nPlease access the Seplat Energy Predictive Maintenance Portal to track repair progress.\n\nRegards,\nSeplat Energy Asset Integrity Systems`;
    const contact = to || (process.env.DEMO_MAINTENANCE_EMAIL || 'maint.mgr@localhost.test');

    try {
        const delivery = await awsIntegrations.publishAlertTopic({ subject, message: message_body });
        const recipientContact = delivery.destination || contact;
        const recipientName = delivery.destination ? 'AWS SNS alert subscribers' : name;
        await run(`
            INSERT INTO notifications (id, recipient_name, recipient_contact, channel, equipment_tag, subject, message_body, status)
            VALUES (?, ?, ?, 'EMAIL', ?, ?, ?, ?)
        `, [id, recipientName, recipientContact, tag, subject, message_body, delivery.status]);

        console.log(`[${delivery.status}] Email alert for ${recipientName} (${recipientContact})`);
        return {
            success: true,
            id,
            channel: 'EMAIL',
            contact: recipientContact,
            subject,
            message_body,
            status: delivery.status,
            simulated: Boolean(delivery.simulated),
            messageId: delivery.messageId
        };
    } catch (err) {
        console.error('Email notification error:', err);
        await recordFailedNotification({
            id, name, contact, tag, subject, message_body, channel: 'EMAIL'
        });
        return { success: false, id, channel: 'EMAIL', status: 'FAILED', error: err.message };
    }
}

async function recordFailedNotification({ id, name, contact, tag, subject, message_body, channel }) {
    try {
        await run(`
            INSERT INTO notifications (id, recipient_name, recipient_contact, channel, equipment_tag, subject, message_body, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'FAILED')
        `, [id, name, contact, channel, tag, subject, message_body]);
    } catch (err) {
        console.error('Failed to persist notification failure:', err);
    }
}

/**
 * List recent notification logs
 */
async function listNotifications(limit = 50) {
    return query(`
        SELECT * FROM notifications
        ORDER BY timestamp DESC
        LIMIT ?
    `, [limit]);
}

module.exports = {
    sendSMSAlert,
    sendEmailAlert,
    listNotifications
};
