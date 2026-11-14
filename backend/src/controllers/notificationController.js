const notificationService = require('../services/notificationService');

async function getNotifications(req, res) {
    try {
        const notifications = await notificationService.listNotifications(50);
        return res.json({ success: true, count: notifications.length, notifications });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Failed to fetch notification logs.' });
    }
}

async function triggerTestNotification(req, res) {
    try {
        const { channel, recipient_name, contact, equipment_tag } = req.body;
        let result;

        if (channel === 'SMS') {
            result = await notificationService.sendSMSAlert({
                phone: contact || '+234-803-555-0192',
                name: recipient_name || 'Emeka Okafor',
                tag: equipment_tag || 'CPX-03A',
                facility: 'Ovhor Processing Facility',
                healthIndex: 45.0,
                workOrderId: 'wo-test-101'
            });
        } else if (channel === 'EMAIL') {
            result = await notificationService.sendEmailAlert({
                to: contact || 'maint.mgr@seplatenergy.com',
                name: recipient_name || 'Dr. Fatima Aliyu',
                tag: equipment_tag || 'COMP-GT-01',
                facility: 'Oben Gas Processing Plant',
                failureMode: 'Turbine Blade Fatigue & Dynamic Unbalance',
                healthIndex: 42.0,
                workOrderId: 'wo-test-102'
            });
        } else {
            return res.status(400).json({ success: false, error: 'Channel must be SMS or EMAIL.' });
        }

        return res.status(result.success ? 201 : 502).json({ success: result.success, result });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Failed to dispatch test notification.' });
    }
}

module.exports = {
    getNotifications,
    triggerTestNotification
};
