const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Import database connections
const db = require('./config/database');
const mongodb = require('./config/mongodb');

// Import routes
const authRoutes = require('./routes/auth');
const siteRoutes = require('./routes/sites');
const deviceRoutes = require('./routes/devices');
const adminRoutes = require('./routes/admins');
const wifiRoutes = require('./routes/wifi');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const mqttRoutes = require('./routes/mqtt');
const logsRoutes = require('./routes/logs');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://10.5.50.48:3000', 'http://10.5.50.48:38006'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        mariadb: db.isConnected() ? 'connected' : 'disconnected',
        mongodb: mongodb.isMongoDBConnected() ? 'connected' : 'disconnected'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/wifi', wifiRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/mqtt', mqttRoutes);
app.use('/api/logs', logsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Keos API Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    
    // Initialize MongoDB connection
    try {
        await mongodb.connectToMongoDB();
        console.log('✅ MongoDB connection initialized');
    } catch (error) {
        console.log('⚠️ MongoDB connection failed - system will run in degraded mode');
    }
});

module.exports = app; 