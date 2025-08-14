const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const mongodb = require('../config/mongodb');

// Middleware to check MongoDB availability
const checkMongoDB = async (req, res, next) => {
    if (!mongodb.shouldUseMongoDB()) {
        return res.status(503).json({
            success: false,
            error: 'MongoDB service temporarily unavailable',
            degraded: true,
            message: 'System is running in degraded mode. Some features may be limited.'
        });
    }
    next();
};

// ==================== DEVICE LOGS ====================

/**
 * GET /api/logs/device/:deviceId
 * Get device logs with pagination and filtering
 */
router.get('/device/:deviceId', [
    param('deviceId').notEmpty().withMessage('Device ID is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('log_type').optional().isString().withMessage('Log type must be a string'),
    query('start_date').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('end_date').optional().isISO8601().withMessage('End date must be a valid ISO date')
], checkMongoDB, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { deviceId } = req.params;
        const { page = 1, limit = 20, log_type, start_date, end_date } = req.query;

        // Build query
        const query = { device_id: deviceId };
        if (log_type) query.log_type = log_type;
        if (start_date || end_date) {
            query.timestamp = {};
            if (start_date) query.timestamp.$gte = new Date(start_date);
            if (end_date) query.timestamp.$lte = new Date(end_date);
        }

        // Build options
        const options = {
            sort: { timestamp: -1 },
            skip: (page - 1) * limit,
            limit: parseInt(limit)
        };

        const result = await mongodb.findDocuments('device_logs', query, options);
        
        if (result.degraded) {
            return res.status(503).json({
                success: false,
                error: 'MongoDB unavailable',
                degraded: true,
                data: [],
                message: 'Device logs temporarily unavailable'
            });
        }

        res.json({
            success: true,
            data: result.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.data.length
            }
        });
    } catch (error) {
        console.error('Error fetching device logs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/logs/device
 * Add device log entry
 */
router.post('/device', [
    body('device_id').notEmpty().withMessage('Device ID is required'),
    body('site_id').notEmpty().withMessage('Site ID is required'),
    body('log_type').notEmpty().withMessage('Log type is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('level').optional().isIn(['info', 'warning', 'error', 'debug']).withMessage('Invalid log level'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object')
], checkMongoDB, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { device_id, site_id, log_type, message, level = 'info', metadata = {} } = req.body;

        const logEntry = {
            device_id,
            site_id,
            log_type,
            message,
            level,
            metadata,
            timestamp: new Date(),
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        };

        const result = await mongodb.insertDocument('device_logs', logEntry);

        if (result.degraded) {
            return res.status(503).json({
                success: false,
                error: 'MongoDB unavailable',
                degraded: true,
                message: 'Log entry could not be saved'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Device log entry created successfully',
            log_id: result.insertedId
        });
    } catch (error) {
        console.error('Error creating device log:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== SYSTEM LOGS ====================

/**
 * GET /api/logs/system
 * Get system logs with filtering
 */
router.get('/system', [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('level').optional().isIn(['info', 'warning', 'error', 'debug']).withMessage('Invalid log level'),
    query('service').optional().isString().withMessage('Service must be a string'),
    query('start_date').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('end_date').optional().isISO8601().withMessage('End date must be a valid ISO date')
], checkMongoDB, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { page = 1, limit = 20, level, service, start_date, end_date } = req.query;

        // Build query
        const query = {};
        if (level) query.level = level;
        if (service) query.service = service;
        if (start_date || end_date) {
            query.timestamp = {};
            if (start_date) query.timestamp.$gte = new Date(start_date);
            if (end_date) query.timestamp.$lte = new Date(end_date);
        }

        // Build options
        const options = {
            sort: { timestamp: -1 },
            skip: (page - 1) * limit,
            limit: parseInt(limit)
        };

        const result = await mongodb.findDocuments('system_logs', query, options);

        if (result.degraded) {
            return res.status(503).json({
                success: false,
                error: 'MongoDB unavailable',
                degraded: true,
                data: [],
                message: 'System logs temporarily unavailable'
            });
        }

        res.json({
            success: true,
            data: result.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.data.length
            }
        });
    } catch (error) {
        console.error('Error fetching system logs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/logs/system
 * Add system log entry
 */
router.post('/system', [
    body('service').notEmpty().withMessage('Service name is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('level').optional().isIn(['info', 'warning', 'error', 'debug']).withMessage('Invalid log level'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object')
], checkMongoDB, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { service, message, level = 'info', metadata = {} } = req.body;

        const logEntry = {
            service,
            message,
            level,
            metadata,
            timestamp: new Date(),
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        };

        const result = await mongodb.insertDocument('system_logs', logEntry);

        if (result.degraded) {
            return res.status(503).json({
                success: false,
                error: 'MongoDB unavailable',
                degraded: true,
                message: 'System log entry could not be saved'
            });
        }

        res.status(201).json({
            success: true,
            message: 'System log entry created successfully',
            log_id: result.insertedId
        });
    } catch (error) {
        console.error('Error creating system log:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== PERFORMANCE DATA ====================

/**
 * GET /api/logs/performance/:deviceId
 * Get performance data for a device
 */
router.get('/performance/:deviceId', [
    param('deviceId').notEmpty().withMessage('Device ID is required'),
    query('metric_type').optional().isString().withMessage('Metric type must be a string'),
    query('start_date').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('end_date').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')
], checkMongoDB, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { deviceId } = req.params;
        const { metric_type, start_date, end_date, limit = 100 } = req.query;

        // Build query
        const query = { device_id: deviceId };
        if (metric_type) query.metric_type = metric_type;
        if (start_date || end_date) {
            query.timestamp = {};
            if (start_date) query.timestamp.$gte = new Date(start_date);
            if (end_date) query.timestamp.$lte = new Date(end_date);
        }

        // Build options
        const options = {
            sort: { timestamp: -1 },
            limit: parseInt(limit)
        };

        const result = await mongodb.findDocuments('performance_data', query, options);

        if (result.degraded) {
            return res.status(503).json({
                success: false,
                error: 'MongoDB unavailable',
                degraded: true,
                data: [],
                message: 'Performance data temporarily unavailable'
            });
        }

        res.json({
            success: true,
            data: result.data,
            count: result.data.length
        });
    } catch (error) {
        console.error('Error fetching performance data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/logs/performance
 * Add performance data entry
 */
router.post('/performance', [
    body('device_id').notEmpty().withMessage('Device ID is required'),
    body('site_id').notEmpty().withMessage('Site ID is required'),
    body('metric_type').notEmpty().withMessage('Metric type is required'),
    body('value').notEmpty().withMessage('Value is required'),
    body('unit').optional().isString().withMessage('Unit must be a string'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object')
], checkMongoDB, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { device_id, site_id, metric_type, value, unit, metadata = {} } = req.body;

        const performanceEntry = {
            device_id,
            site_id,
            metric_type,
            value,
            unit,
            metadata,
            timestamp: new Date()
        };

        const result = await mongodb.insertDocument('performance_data', performanceEntry);

        if (result.degraded) {
            return res.status(503).json({
                success: false,
                error: 'MongoDB unavailable',
                degraded: true,
                message: 'Performance data could not be saved'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Performance data entry created successfully',
            entry_id: result.insertedId
        });
    } catch (error) {
        console.error('Error creating performance data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== ANALYTICS ====================

/**
 * GET /api/logs/analytics/site/:siteId
 * Get analytics data for a site
 */
router.get('/analytics/site/:siteId', [
    param('siteId').notEmpty().withMessage('Site ID is required'),
    query('metric_type').optional().isString().withMessage('Metric type must be a string'),
    query('start_date').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('end_date').optional().isISO8601().withMessage('End date must be a valid ISO date')
], checkMongoDB, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { siteId } = req.params;
        const { metric_type, start_date, end_date } = req.query;

        // Build query
        const query = { site_id: siteId };
        if (metric_type) query.metric_type = metric_type;
        if (start_date || end_date) {
            query.date = {};
            if (start_date) query.date.$gte = new Date(start_date);
            if (end_date) query.date.$lte = new Date(end_date);
        }

        const result = await mongodb.findDocuments('analytics_data', query, { sort: { date: -1 } });

        if (result.degraded) {
            return res.status(503).json({
                success: false,
                error: 'MongoDB unavailable',
                degraded: true,
                data: [],
                message: 'Analytics data temporarily unavailable'
            });
        }

        res.json({
            success: true,
            data: result.data,
            count: result.data.length
        });
    } catch (error) {
        console.error('Error fetching analytics data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/logs/analytics
 * Add analytics data entry
 */
router.post('/analytics', [
    body('site_id').notEmpty().withMessage('Site ID is required'),
    body('metric_type').notEmpty().withMessage('Metric type is required'),
    body('value').notEmpty().withMessage('Value is required'),
    body('date').optional().isISO8601().withMessage('Date must be a valid ISO date'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object')
], checkMongoDB, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { site_id, metric_type, value, date, metadata = {} } = req.body;

        const analyticsEntry = {
            site_id,
            metric_type,
            value,
            date: date ? new Date(date) : new Date(),
            metadata,
            created_at: new Date()
        };

        const result = await mongodb.insertDocument('analytics_data', analyticsEntry);

        if (result.degraded) {
            return res.status(503).json({
                success: false,
                error: 'MongoDB unavailable',
                degraded: true,
                message: 'Analytics data could not be saved'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Analytics data entry created successfully',
            entry_id: result.insertedId
        });
    } catch (error) {
        console.error('Error creating analytics data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== MONGODB STATUS ====================

/**
 * GET /api/logs/status
 * Get MongoDB connection status
 */
router.get('/status', async (req, res) => {
    try {
        const isConnected = mongodb.isMongoDBConnected();
        const shouldUse = mongodb.shouldUseMongoDB();

        res.json({
            success: true,
            mongodb: {
                connected: isConnected,
                should_use: shouldUse,
                available: isConnected && shouldUse
            },
            collections: isConnected ? [
                'device_logs',
                'system_logs', 
                'performance_data',
                'reports',
                'audit_trails',
                'analytics_data',
                'mqtt_logs'
            ] : []
        });
    } catch (error) {
        console.error('Error checking MongoDB status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router; 