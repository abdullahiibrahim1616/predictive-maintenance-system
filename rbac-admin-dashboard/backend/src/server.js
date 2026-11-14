const fs = require('fs');
require('dotenv').config();

if (process.env.JWT_SECRET_FILE) {
  try {
    process.env.JWT_SECRET = fs.readFileSync(process.env.JWT_SECRET_FILE, 'utf8').trim();
  } catch (err) {
    throw new Error(`Could not read JWT_SECRET_FILE: ${err.message}`);
  }
}
if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET, 'utf8') < 32) {
  throw new Error('Configure a JWT secret with at least 32 bytes before starting the RBAC backend.');
}

const express = require('express');
const cors = require('cors');

const authRoutes       = require('./routes/auth.routes');
const usersRoutes      = require('./routes/users.routes');
const rolesRoutes      = require('./routes/roles.routes');
const permissionsRoutes = require('./routes/permissions.routes');
const auditRoutes      = require('./routes/audit.routes');
const settingsRoutes   = require('./routes/settings.routes');
const authMiddleware   = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '127.0.0.1';

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5180')
  .split(',')
  .map(origin => origin.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',        authRoutes);
app.use('/api/users',       usersRoutes);
app.use('/api/roles',       rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/audit-logs',  auditRoutes);
app.use('/api/settings',    settingsRoutes);

// Health
app.get('/api/health', (req, res) => res.json({ success: true, service: 'RBAC Admin Dashboard API', status: 'UP', timestamp: new Date().toISOString() }));

// Dashboard stats
app.get('/api/dashboard/stats', authMiddleware, (req, res) => {
  const { db } = require('./database/db');
  const users    = db.get('users').value();
  const roles    = db.get('roles').value();
  const logs     = db.get('audit_logs').value();
  const perms    = db.get('permissions').value();

  const today = new Date().toDateString();
  const deniedToday = logs.filter(l => l.status === 'DENIED' && new Date(l.timestamp).toDateString() === today).length;

  const roleBreakdown = roles.map(r => ({
    name: r.name,
    color: r.color,
    count: users.filter(u => u.role_id === r.id).length,
  }));

  const recentLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 8);
  const recentUsers = users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map(u => {
    const role = roles.find(r => r.id === u.role_id);
    return { ...u, password_hash: undefined, role_name: role?.name, role_color: role?.color };
  });

  res.json({
    success: true,
    stats: {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'ACTIVE').length,
      suspended: users.filter(u => u.status === 'SUSPENDED').length,
      totalRoles: roles.length,
      totalPerms: perms.length,
      totalLogs: logs.length,
      deniedToday,
    },
    recentLogs,
    roleBreakdown,
    recentUsers,
  });
});

// 404
app.use((req, res) => res.status(404).json({ success: false, message: `404 – ${req.method} ${req.path} not found.` }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, message: '500 – Internal Server Error', error: err.message });
});

app.listen(PORT, HOST, () => {
  console.log(`\n🔐 RBAC Admin Dashboard API`);
  console.log(`🚀 Running on http://localhost:${PORT}`);
});
