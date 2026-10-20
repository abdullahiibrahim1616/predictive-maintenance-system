const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const initDatabase = require('./database/dbInit');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error(`CORS blocked: Origin '${origin}' is not authorized.`));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/v1/health', (req, res) => {
    res.json({
        status: 'UP',
        service: 'Nigerian O&G Predictive Maintenance Cloud API',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Import API Routes
const authRoutes = require('./routes/authRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const telemetryRoutes = require('./routes/telemetryRoutes');
const workOrderRoutes = require('./routes/workOrderRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const auditRoutes = require('./routes/auditRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const roleRoutes = require('./routes/roleRoutes');

// Register API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/equipment', equipmentRoutes);
app.use('/api/v1/telemetry', telemetryRoutes);
app.use('/api/v1/work-orders', workOrderRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/roles', roleRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error occurred.',
        message: err.message
    });
});

// Boot Database & Start Express Server
if (require.main === module) {
    initDatabase().then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Predictive Maintenance Backend API listening on port ${PORT}`);
            console.log(`📡 Health Check URL: http://localhost:${PORT}/api/v1/health`);
        });
    }).catch(err => {
        console.error('Failed to initialize database:', err);
    });
}

module.exports = app;

