const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const DB_PATH = path.resolve(process.env.DB_PATH || './rbac.db.json');
const adapter = new FileSync(DB_PATH);
const db = low(adapter);

// ─── Define defaults (schema) ─────────────────────────────────────────────────
db.defaults({
  roles: [],
  permissions: [],
  role_permissions: [],
  users: [],
  user_permissions: [],
  audit_logs: [],
  settings: [],
}).write();

// ─── Seed if empty ────────────────────────────────────────────────────────────
if (db.get('roles').size().value() === 0) {
  console.log('🌱 Seeding database...');

  const roles = [
    { id: 'role-superadmin', name: 'Super Admin', description: 'Unrestricted system access. Manages all users, roles, and settings.', color: '#ef4444', is_system: true, created_at: new Date().toISOString() },
    { id: 'role-admin',      name: 'Admin',       description: 'Manages users within their org. Cannot modify system-wide settings.', color: '#f59e0b', is_system: true,  created_at: new Date().toISOString() },
    { id: 'role-manager',    name: 'Manager',     description: 'Manages team members, approves requests, views dept reports.', color: '#6366f1', is_system: false, created_at: new Date().toISOString() },
    { id: 'role-staff',      name: 'Staff',       description: 'Accesses assigned modules and manages own records only.', color: '#10b981', is_system: false, created_at: new Date().toISOString() },
    { id: 'role-viewer',     name: 'Viewer',      description: 'Read-only access. Cannot create, edit, or delete records.', color: '#64748b', is_system: false, created_at: new Date().toISOString() },
  ];
  db.set('roles', roles).write();

  const perms = [
    { id: 'perm-001', key: 'users.create',              name: 'Create User',            module: 'User Management',     description: 'Create new user accounts' },
    { id: 'perm-002', key: 'users.edit',                name: 'Edit User',              module: 'User Management',     description: 'Edit user profiles and assignments' },
    { id: 'perm-003', key: 'users.delete',              name: 'Delete User',            module: 'User Management',     description: 'Permanently delete user accounts' },
    { id: 'perm-004', key: 'users.suspend',             name: 'Suspend/Activate User',  module: 'User Management',     description: 'Suspend or reactivate user accounts' },
    { id: 'perm-005', key: 'users.password_reset',      name: 'Reset Password',         module: 'User Management',     description: 'Reset user passwords' },
    { id: 'perm-006', key: 'roles.create',              name: 'Create Role',            module: 'Roles & Permissions', description: 'Create new roles' },
    { id: 'perm-007', key: 'roles.edit',                name: 'Edit Role',              module: 'Roles & Permissions', description: 'Rename and modify roles' },
    { id: 'perm-008', key: 'roles.delete',              name: 'Delete Role',            module: 'Roles & Permissions', description: 'Delete non-system roles' },
    { id: 'perm-009', key: 'roles.assign_permissions',  name: 'Assign Permissions',     module: 'Roles & Permissions', description: 'Grant or revoke role/user permissions' },
    { id: 'perm-010', key: 'dashboard.view',            name: 'View Dashboard',         module: 'Dashboard',           description: 'Access the main dashboard' },
    { id: 'perm-011', key: 'reports.view',              name: 'View Reports',           module: 'Reports',             description: 'View system and department reports' },
    { id: 'perm-012', key: 'reports.export',            name: 'Export Reports',         module: 'Reports',             description: 'Export reports to CSV' },
    { id: 'perm-013', key: 'settings.view',             name: 'View Settings',          module: 'Settings',            description: 'View system configuration' },
    { id: 'perm-014', key: 'settings.edit',             name: 'Edit Settings',          module: 'Settings',            description: 'Modify system configuration' },
    { id: 'perm-015', key: 'audit.view',                name: 'View Audit Logs',        module: 'Audit Logs',          description: 'Access the audit trail log' },
  ];
  db.set('permissions', perms).write();

  const rolePermMap = {
    'role-superadmin': perms.map(p => p.id),
    'role-admin':      ['perm-001','perm-002','perm-004','perm-005','perm-010','perm-011','perm-012','perm-015'],
    'role-manager':    ['perm-001','perm-002','perm-010','perm-011'],
    'role-staff':      ['perm-010'],
    'role-viewer':     ['perm-010','perm-011'],
  };
  const rolePermsArr = [];
  for (const [roleId, permIds] of Object.entries(rolePermMap)) {
    permIds.forEach(pid => rolePermsArr.push({ role_id: roleId, permission_id: pid }));
  }
  db.set('role_permissions', rolePermsArr).write();

  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const bootstrapPasswordFile = process.env.BOOTSTRAP_ADMIN_PASSWORD_FILE;
  if (!bootstrapEmail || !bootstrapPasswordFile) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD_FILE are required when initializing the RBAC database.');
  }

  let bootstrapPassword;
  const resolvedPasswordPath = path.isAbsolute(bootstrapPasswordFile)
    ? bootstrapPasswordFile
    : path.resolve(__dirname, '../../../', bootstrapPasswordFile);
  try {
    bootstrapPassword = fs.readFileSync(resolvedPasswordPath, 'utf8').trim();
  } catch (err) {
    throw new Error(`Could not read BOOTSTRAP_ADMIN_PASSWORD_FILE: ${err.message}`);
  }
  if (bootstrapPassword.length < 12) {
    throw new Error('The RBAC bootstrap administrator password must contain at least 12 characters.');
  }

  const users = [
    {
      id: uuidv4(),
      full_name: process.env.BOOTSTRAP_ADMIN_NAME || 'System Administrator',
      email: bootstrapEmail.trim().toLowerCase(),
      password_hash: bcrypt.hashSync(bootstrapPassword, 10),
      role_id: 'role-superadmin',
      department: 'Administration',
      avatar_color: '#ef4444',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      created_by: null,
      last_login: null,
    },
  ];
  db.set('users', users).write();
  db.set('user_permissions', []).write();

  const settings = [
    { key: 'session_timeout',      value: '30',          label: 'Session Timeout (minutes)',   group_name: 'Security' },
    { key: 'min_password_length',  value: '8',           label: 'Minimum Password Length',     group_name: 'Security' },
    { key: 'require_2fa',          value: 'false',       label: 'Require Two-Factor Auth',     group_name: 'Security' },
    { key: 'jwt_expiry_hours',     value: '24',          label: 'JWT Token Expiry (hours)',    group_name: 'Security' },
    { key: 'max_login_attempts',   value: '5',           label: 'Max Failed Login Attempts',   group_name: 'Security' },
    { key: 'org_name',             value: 'RBAC Corp',   label: 'Organisation Name',           group_name: 'General' },
    { key: 'support_email',        value: 'support@rbac.dev', label: 'Support Email',          group_name: 'General' },
    { key: 'timezone',             value: 'UTC',         label: 'Default Timezone',            group_name: 'General' },
    { key: 'audit_retention_days', value: '90',          label: 'Audit Log Retention (days)',  group_name: 'Compliance' },
    { key: 'enforce_rbac_strict',  value: 'true',        label: 'Enforce Strict RBAC',         group_name: 'Compliance' },
  ];
  db.set('settings', settings).write();

  db.set('audit_logs', []).write();

  console.log('✅ Database seeded successfully.');
}

// ─── Helper: get effective permissions ────────────────────────────────────────
function getUserPermissions(userId) {
  const user = db.get('users').find({ id: userId }).value();
  if (!user) return [];

  const rolePerms = db.get('role_permissions')
    .filter({ role_id: user.role_id })
    .map('permission_id')
    .value();

  const overrides = db.get('user_permissions').filter({ user_id: userId }).value();
  const permSet = new Set(rolePerms);
  overrides.forEach(o => {
    if (o.granted) permSet.add(o.permission_id);
    else permSet.delete(o.permission_id);
  });

  const allPerms = db.get('permissions').value();
  const permKeys = [];
  for (const pid of permSet) {
    const p = allPerms.find(x => x.id === pid);
    if (p) permKeys.push(p.key);
  }
  return permKeys;
}

// ─── Helper: write audit log ──────────────────────────────────────────────────
function writeAuditLog({ actorId, actorEmail, actorRole, action, targetType, targetId, targetName, details, ipAddress, status = 'SUCCESS' }) {
  const log = {
    id: uuidv4(),
    actor_id: actorId || null,
    actor_email: actorEmail || null,
    actor_role: actorRole || null,
    action,
    target_type: targetType || null,
    target_id: targetId || null,
    target_name: targetName || null,
    details: details ? JSON.stringify(details) : null,
    ip_address: ipAddress || null,
    status,
    timestamp: new Date().toISOString(),
  };
  db.get('audit_logs').push(log).write();
}

module.exports = { db, getUserPermissions, writeAuditLog };
