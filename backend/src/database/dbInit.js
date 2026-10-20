const { run, get, query } = require('../config/db');
const bcrypt = require('bcryptjs');
const { runMigrations } = require('./migrator');

async function initDatabase() {
    console.log('🔄 Initializing Database Tables & Seed Data...');
    await runMigrations();

    // 1. Create Tables
    await run(`
        CREATE TABLE IF NOT EXISTS facilities (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            region TEXT NOT NULL,
            facility_type TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS equipment (
            id TEXT PRIMARY KEY,
            facility_id TEXT NOT NULL,
            tag_name TEXT UNIQUE NOT NULL,
            equipment_type TEXT NOT NULL,
            serial_number TEXT NOT NULL,
            criticality_rating TEXT DEFAULT 'HIGH',
            status TEXT DEFAULT 'OPERATIONAL',
            health_index REAL DEFAULT 100.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            facility_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE SET NULL
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS telemetry_logs (
            id TEXT PRIMARY KEY,
            equipment_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            vibration_rms_mms REAL NOT NULL,
            temperature_c REAL NOT NULL,
            pressure_psi REAL NOT NULL,
            flow_rate_bpd REAL NOT NULL,
            health_index REAL NOT NULL,
            anomaly_flag INTEGER DEFAULT 0,
            failure_prediction TEXT DEFAULT 'NORMAL',
            FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS work_orders (
            id TEXT PRIMARY KEY,
            equipment_id TEXT NOT NULL,
            assigned_to_user_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            priority TEXT DEFAULT 'MEDIUM',
            status TEXT DEFAULT 'OPEN',
            predicted_failure_mode TEXT,
            estimated_rul_hours REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS cost_avoidance_reports (
            id TEXT PRIMARY KEY,
            work_order_id TEXT NOT NULL,
            estimated_downtime_hours_avoided REAL NOT NULL,
            production_loss_rate_usd_per_hr REAL NOT NULL,
            estimated_repair_cost_usd REAL NOT NULL,
            net_savings_usd REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            user_email TEXT,
            user_role TEXT,
            action TEXT NOT NULL,
            target_entity TEXT NOT NULL,
            ip_address TEXT,
            metadata TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // RBAC System Tables
    await run(`
        CREATE TABLE IF NOT EXISTS roles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            badge_class TEXT DEFAULT 'badge-cyan',
            is_system INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS permissions (
            key TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS role_permissions (
            role_id TEXT NOT NULL,
            permission_key TEXT NOT NULL,
            PRIMARY KEY (role_id, permission_key),
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (permission_key) REFERENCES permissions(key) ON DELETE CASCADE
        )
    `);

    // Check and Seed RBAC Roles & Permissions
    const roleCount = await get(`SELECT COUNT(*) as count FROM roles`);
    if (!roleCount || roleCount.count === 0) {
        console.log('🌱 Seeding RBAC Roles & Permission Matrix...');
        
        const defaultRoles = [
            { id: 'SUPER_ADMIN', name: 'Super Admin', desc: 'Global system governance, security policies, KMS master key rotation, unrestricted user & role management.', badge: 'badge-rose' },
            { id: 'MAINTENANCE_MANAGER', name: 'Maintenance Manager', desc: 'Equipment health monitoring, predictive work order creation, technician task assignment, vibration alert threshold tuning.', badge: 'badge-amber' },
            { id: 'OPERATIONS_MANAGER', name: 'Operations Manager', desc: 'Cost avoidance analytics, executive fleet reliability metrics, production downtime loss calculations.', badge: 'badge-emerald' },
            { id: 'TECHNICIAN', name: 'Field Technician', desc: 'Field execution of assigned maintenance work orders, repair log submission, vibration sensor validation.', badge: 'badge-cyan' }
        ];

        for (const r of defaultRoles) {
            await run(`INSERT INTO roles (id, name, description, badge_class) VALUES (?, ?, ?, ?)`, [r.id, r.name, r.desc, r.badge]);
        }

        const defaultPerms = [
            { key: 'telemetry.view', name: 'View Asset Telemetry', category: 'Telemetry & Asset Monitoring' },
            { key: 'telemetry.ingest', name: 'Ingest Real-time Sensor Data', category: 'Telemetry & Asset Monitoring' },
            { key: 'workorders.create', name: 'Generate Work Orders', category: 'Maintenance & Work Orders' },
            { key: 'workorders.edit', name: 'Edit & Reassign Tasks', category: 'Maintenance & Work Orders' },
            { key: 'workorders.complete', name: 'Complete Maintenance Tasks', category: 'Maintenance & Work Orders' },
            { key: 'reports.view', name: 'View Reliability Reports', category: 'Analytics & Financials' },
            { key: 'reports.export', name: 'Export Financial & Cost Data', category: 'Analytics & Financials' },
            { key: 'audit.view', name: 'Access ISO 27001 Audit Trail', category: 'Governance & Security' },
            { key: 'users.manage', name: 'Provision & Suspend User Accounts', category: 'Governance & Security' },
            { key: 'roles.manage', name: 'Modify RBAC Role Matrix', category: 'Governance & Security' },
            { key: 'kms.rotate', name: 'Rotate AWS KMS Encryption Keys', category: 'Governance & Security' }
        ];

        for (const p of defaultPerms) {
            await run(`INSERT INTO permissions (key, name, category) VALUES (?, ?, ?)`, [p.key, p.name, p.category]);
        }

        // Role-Permission mappings
        const rolePermMap = {
            'SUPER_ADMIN': defaultPerms.map(p => p.key),
            'MAINTENANCE_MANAGER': ['telemetry.view', 'telemetry.ingest', 'workorders.create', 'workorders.edit', 'workorders.complete', 'reports.view'],
            'OPERATIONS_MANAGER': ['telemetry.view', 'reports.view', 'reports.export'],
            'TECHNICIAN': ['telemetry.view', 'workorders.complete']
        };

        for (const [roleId, permKeys] of Object.entries(rolePermMap)) {
            for (const key of permKeys) {
                await run(`INSERT INTO role_permissions (role_id, permission_key) VALUES (?, ?)`, [roleId, key]);
            }
        }
    }

    // 2. Check if seed data exists
    const userCount = await get(`SELECT COUNT(*) as count FROM users`);
    if (userCount && userCount.count > 0) {
        console.log('✅ Database already populated with seed data.');
        return;
    }

    console.log('🌱 Seeding Database with Seplat Energy Plc Assets & Demo Accounts...');

    // Facilities (Seplat Energy OML Assets)
    const facilities = [
        { id: 'fac-1', name: 'Ovhor Processing Facility (OML 38)', region: 'Delta State Onshore', facility_type: 'Crude Processing Station' },
        { id: 'fac-2', name: 'Oben Gas Processing Plant (OML 4)', region: 'Edo/Delta Border', facility_type: 'Gas Compressor & Processing Plant' },
        { id: 'fac-3', name: 'Amukpe Crude Terminal (OML 41)', region: 'Delta State Onshore', facility_type: 'Crude Storage & Export Facility' }
    ];

    for (const f of facilities) {
        await run(`INSERT INTO facilities (id, name, region, facility_type) VALUES (?, ?, ?, ?)`, 
            [f.id, f.name, f.region, f.facility_type]);
    }

    // Password hash for 'password123'
    const passwordHash = await bcrypt.hash('password123', 10);

    // Users (4 Roles)
    const users = [
        { id: 'usr-admin', name: 'Engr. Chukwuemeka Obi', email: 'admin@seplatenergy.com', role: 'SUPER_ADMIN', facId: 'fac-1' },
        { id: 'usr-maint', name: 'Dr. Fatima Aliyu', email: 'maint.mgr@seplatenergy.com', role: 'MAINTENANCE_MANAGER', facId: 'fac-2' },
        { id: 'usr-ops', name: 'Chief Dayo Adeyemi', email: 'ops.mgr@seplatenergy.com', role: 'OPERATIONS_MANAGER', facId: 'fac-1' },
        { id: 'usr-tech', name: 'Emeka Okafor (Field Tech)', email: 'tech.field@seplatenergy.com', role: 'TECHNICIAN', facId: 'fac-2' }
    ];

    for (const u of users) {
        await run(`INSERT INTO users (id, full_name, email, password_hash, role, facility_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [u.id, u.name, u.email, passwordHash, u.role, u.facId]);
    }

    // Equipment Assets
    const equipmentList = [
        { id: 'eq-101', facId: 'fac-1', tag: 'CPX-03A', type: 'Crude Processing Train Centrifugal Pump', serial: 'SN-CPX-8849', crit: 'CRITICAL', status: 'WARNING', health: 58.4 },
        { id: 'eq-102', facId: 'fac-1', tag: 'INJ-104B', type: 'Water Injection Pump 104B', serial: 'SN-INJ-3392', crit: 'HIGH', status: 'OPERATIONAL', health: 92.1 },
        { id: 'eq-103', facId: 'fac-2', tag: 'COMP-GT-01', type: 'Gas Turbine Generator Unit 1', serial: 'SN-GT-1102', crit: 'CRITICAL', status: 'DEGRADED', health: 42.0 },
        { id: 'eq-104', facId: 'fac-2', tag: 'HPV-SEP-201', type: 'High-Pressure 3-Phase Separator Train 2', serial: 'SN-HPV-7711', crit: 'MEDIUM', status: 'OPERATIONAL', health: 96.5 },
        { id: 'eq-105', facId: 'fac-3', tag: 'OBL-PUMP-01', type: 'Main Oil Buffer Loading Pump', serial: 'SN-OBL-9901', crit: 'CRITICAL', status: 'OPERATIONAL', health: 88.0 }
    ];

    for (const eq of equipmentList) {
        await run(`INSERT INTO equipment (id, facility_id, tag_name, equipment_type, serial_number, criticality_rating, status, health_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [eq.id, eq.facId, eq.tag, eq.type, eq.serial, eq.crit, eq.status, eq.health]);
    }

    // Initial Telemetry Logs
    const initialLogs = [
        { id: 'log-1', eqId: 'eq-101', vib: 7.8, temp: 88.5, press: 1420, flow: 12500, health: 58.4, anomaly: 1, pred: 'Bearing Wear & Seal Degradation' },
        { id: 'log-2', eqId: 'eq-102', vib: 2.1, temp: 62.0, press: 850, flow: 24000, health: 92.1, anomaly: 0, pred: 'NORMAL' },
        { id: 'log-3', eqId: 'eq-103', vib: 11.4, temp: 104.2, press: 1850, flow: 9800, health: 42.0, anomaly: 1, pred: 'Turbine Blade Fatigue' },
        { id: 'log-4', eqId: 'eq-104', vib: 1.4, temp: 48.0, press: 420, flow: 31000, health: 96.5, anomaly: 0, pred: 'NORMAL' },
        { id: 'log-5', eqId: 'eq-105', vib: 3.2, temp: 68.4, press: 1100, flow: 45000, health: 88.0, anomaly: 0, pred: 'NORMAL' }
    ];

    for (const l of initialLogs) {
        await run(`INSERT INTO telemetry_logs (id, equipment_id, vibration_rms_mms, temperature_c, pressure_psi, flow_rate_bpd, health_index, anomaly_flag, failure_prediction) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [l.id, l.eqId, l.vib, l.temp, l.press, l.flow, l.health, l.anomaly, l.pred]);
    }

    // Initial Work Orders
    const workOrders = [
        {
            id: 'wo-101',
            eqId: 'eq-101',
            userId: 'usr-tech',
            title: 'Crude Pump CPX-03A Bearing & Seal Inspection',
            desc: 'Telemetry detected elevated vibration RMS (7.8 mm/s) and temperature spike (88.5°C). Inspect mechanical seals and thrust bearings.',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            failureMode: 'Bearing Wear & Seal Degradation',
            rul: 148.0
        },
        {
            id: 'wo-102',
            eqId: 'eq-103',
            userId: 'usr-tech',
            title: 'URGENT: Gas Turbine COMP-GT-01 Hot Section Inspection',
            desc: 'Vibration reached critical threshold (11.4 mm/s). Immediate shutdown recommended to prevent blade failure.',
            priority: 'CRITICAL',
            status: 'OPEN',
            failureMode: 'Turbine Blade Fatigue & Dynamic Unbalance',
            rul: 36.5
        }
    ];

    for (const wo of workOrders) {
        await run(`INSERT INTO work_orders (id, equipment_id, assigned_to_user_id, title, description, priority, status, predicted_failure_mode, estimated_rul_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [wo.id, wo.eqId, wo.userId, wo.title, wo.desc, wo.priority, wo.status, wo.failureMode, wo.rul]);
    }

    // Cost Avoidance Reports
    const costReports = [
        {
            id: 'car-101',
            woId: 'wo-101',
            hoursAvoided: 48.0,
            lossRate: 12500.0,
            repairCost: 35000.0,
            netSavings: 565000.0
        },
        {
            id: 'car-102',
            woId: 'wo-102',
            hoursAvoided: 96.0,
            lossRate: 24000.0,
            repairCost: 85000.0,
            netSavings: 2219000.0
        }
    ];

    for (const cr of costReports) {
        await run(`INSERT INTO cost_avoidance_reports (id, work_order_id, estimated_downtime_hours_avoided, production_loss_rate_usd_per_hr, estimated_repair_cost_usd, net_savings_usd) VALUES (?, ?, ?, ?, ?, ?)`,
            [cr.id, cr.woId, cr.hoursAvoided, cr.lossRate, cr.repairCost, cr.netSavings]);
    }

    // Audit Log Entry
    await run(`INSERT INTO audit_logs (id, user_id, user_email, user_role, action, target_entity, ip_address, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['aud-1', 'usr-admin', 'admin@seplatenergy.com', 'SUPER_ADMIN', 'SYSTEM_INITIALIZATION', 'DATABASE_SEED', '127.0.0.1', JSON.stringify({ note: 'Initial seed of Seplat Energy Plc assets and facilities' })]);

    console.log('✅ Database initialization and seeding complete.');
}

module.exports = initDatabase;
