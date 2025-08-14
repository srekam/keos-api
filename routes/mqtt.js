const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mqtt = require('../config/mqtt');

// Initialize MQTT connection when routes are loaded
mqtt.connectMQTT().catch(error => {
    console.error('Failed to connect to MQTT broker:', error);
});

// Get MQTT connection status
router.get('/status', (req, res) => {
    try {
        const status = {
            connected: mqtt.isConnected(),
            timestamp: new Date().toISOString()
        };
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get MQTT configuration
router.get('/config', (req, res) => {
    try {
        const config = mqtt.getConfig();
        // Remove sensitive information
        const safeConfig = {
            ...config,
            mqtt: {
                ...config.mqtt,
                password: '***' // Hide password
            }
        };
        res.json({ success: true, data: safeConfig });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reload MQTT configuration
router.post('/reload-config', (req, res) => {
    try {
        const success = mqtt.reloadConfig();
        if (success) {
            res.json({ success: true, message: 'Configuration reloaded successfully' });
        } else {
            res.status(500).json({ success: false, error: 'Failed to reload configuration' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Publish message to MQTT topic
router.post('/publish', [
    body('topic').notEmpty().withMessage('Topic is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('qos').optional().isInt({ min: 0, max: 2 }).withMessage('QoS must be 0, 1, or 2'),
    body('retain').optional().isBoolean().withMessage('Retain must be boolean')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { topic, message, qos = 0, retain = false } = req.body;
        
        const options = {
            qos: parseInt(qos),
            retain: Boolean(retain)
        };

        await mqtt.publishMessage(topic, message, options);
        
        res.json({ 
            success: true, 
            message: 'Message published successfully',
            data: { topic, message, options }
        });
    } catch (error) {
        console.error('MQTT Publish error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Subscribe to MQTT topic
router.post('/subscribe', [
    body('topic').notEmpty().withMessage('Topic is required'),
    body('qos').optional().isInt({ min: 0, max: 2 }).withMessage('QoS must be 0, 1, or 2')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { topic, qos = 0 } = req.body;
        
        // For now, we'll just acknowledge the subscription
        // In a real implementation, you might want to store subscriptions
        // and handle message callbacks differently
        
        res.json({ 
            success: true, 
            message: 'Subscription request received',
            data: { topic, qos }
        });
    } catch (error) {
        console.error('MQTT Subscribe error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Send device command via MQTT
router.post('/device/command', [
    body('device_id').notEmpty().withMessage('Device ID is required'),
    body('command').notEmpty().withMessage('Command is required'),
    body('site_id').optional()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { device_id, command, site_id } = req.body;
        
        // Create MQTT topic for device command
        const topic = site_id 
            ? `hotel/${site_id}/device/${device_id}/command`
            : `hotel/device/${device_id}/command`;
        
        const message = {
            command: command,
            timestamp: new Date().toISOString(),
            source: 'keos-api'
        };

        await mqtt.publishMessage(topic, message, { qos: 1 });
        
        res.json({ 
            success: true, 
            message: 'Device command sent successfully',
            data: { device_id, command, topic }
        });
    } catch (error) {
        console.error('Device command error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Send WiFi configuration via MQTT
router.post('/wifi/config', [
    body('site_id').notEmpty().withMessage('Site ID is required'),
    body('room').notEmpty().withMessage('Room is required'),
    body('ssid').notEmpty().withMessage('SSID is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { site_id, room, ssid, password, security = 'WPA2' } = req.body;
        
        const topic = `hotel/${site_id}/wifi/${room}/config`;
        const message = {
            ssid: ssid,
            password: password,
            security: security,
            timestamp: new Date().toISOString(),
            source: 'keos-api'
        };

        await mqtt.publishMessage(topic, message, { qos: 1, retain: true });
        
        res.json({ 
            success: true, 
            message: 'WiFi configuration sent successfully',
            data: { site_id, room, topic }
        });
    } catch (error) {
        console.error('WiFi config error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Send system notification via MQTT
router.post('/notification', [
    body('site_id').notEmpty().withMessage('Site ID is required'),
    body('type').notEmpty().withMessage('Notification type is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('target').optional()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { site_id, type, message, target = 'all' } = req.body;
        
        const topic = `hotel/${site_id}/notification/${target}`;
        const notification = {
            type: type,
            message: message,
            timestamp: new Date().toISOString(),
            source: 'keos-api'
        };

        await mqtt.publishMessage(topic, notification, { qos: 1 });
        
        res.json({ 
            success: true, 
            message: 'Notification sent successfully',
            data: { site_id, type, target, topic }
        });
    } catch (error) {
        console.error('Notification error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router; 