-- Migration 001: Baseline Schema for Predictive Maintenance Platform

CREATE TABLE IF NOT EXISTS facilities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    facility_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    facility_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE SET NULL
);

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
);

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
);

CREATE TABLE IF NOT EXISTS cost_avoidance_reports (
    id TEXT PRIMARY KEY,
    work_order_id TEXT NOT NULL,
    estimated_downtime_hours_avoided REAL NOT NULL,
    production_loss_rate_usd_per_hr REAL NOT NULL,
    estimated_repair_cost_usd REAL NOT NULL,
    net_savings_usd REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
);

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
);

CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    badge_class TEXT DEFAULT 'badge-cyan',
    is_system INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TEXT NOT NULL,
    permission_key TEXT NOT NULL,
    PRIMARY KEY (role_id, permission_key),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_key) REFERENCES permissions(key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_name TEXT NOT NULL,
    recipient_contact TEXT NOT NULL,
    channel TEXT CHECK(channel IN ('EMAIL', 'SMS')) NOT NULL,
    equipment_tag TEXT,
    subject TEXT NOT NULL,
    message_body TEXT NOT NULL,
    status TEXT DEFAULT 'DELIVERED',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
