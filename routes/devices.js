const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

// Validation middleware
const validateDevice = [
    body('name').notEmpty().trim(),
    body('site_id').isInt({ min: 1 }),
    body('room').optional().trim(),
    body('mac_address').optional().trim(),
    body('ip_address').optional().trim(),
    body('status').optional().isIn(['online', 'offline', 'maintenance']),
    body('firmware').optional().trim(),
    body('current_ssid').optional().trim(),
    body('current_clients').optional().isInt({ min: 0 }),
    body('wifi_mode').optional().trim()
];

// GET /api/devices - Get all devices
router.get('/', async (req, res) => {
    try {
        const devices = await db.fetchAll(`
            SELECT d.*, s.name AS site_name 
            FROM devices d 
            LEFT JOIN sites s ON d.site_id = s.id 
            ORDER BY d.id ASC
        `);
        
        res.json({ success: true, data: devices });
    } catch (error) {
        console.error('Get all devices error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/devices/:id - Get device by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const device = await db.fetchOne(`
            SELECT d.*, s.name AS site_name 
            FROM devices d 
            LEFT JOIN sites s ON d.site_id = s.id 
            WHERE d.id = ?
        `, [id]);
        
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }
        
        res.json({ success: true, data: device });
    } catch (error) {
        console.error('Get device by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/devices/by-site/:siteId - Get devices by site
router.get('/by-site/:siteId', async (req, res) => {
    try {
        const { siteId } = req.params;
        const devices = await db.fetchAll(`
            SELECT d.*, s.name AS site_name 
            FROM devices d 
            LEFT JOIN sites s ON d.site_id = s.id 
            WHERE d.site_id = ?
            ORDER BY d.id ASC
        `, [siteId]);
        
        res.json({ success: true, data: devices });
    } catch (error) {
        console.error('Get devices by site error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/devices - Add new device
router.post('/', validateDevice, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const data = req.body;
        
        const result = await db.execute(`
            INSERT INTO devices (
                name, site_id, room, mac_address, ip_address, status,
                firmware, current_ssid, current_clients, wifi_mode, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            data.name, data.site_id, data.room || null, data.mac_address || null,
            data.ip_address || null, data.status || 'offline', data.firmware || null,
            data.current_ssid || null, data.current_clients || 0, data.wifi_mode || null
        ]);

        const newDevice = await db.fetchOne(`
            SELECT d.*, s.name AS site_name 
            FROM devices d 
            LEFT JOIN sites s ON d.site_id = s.id 
            WHERE d.id = ?
        `, [result.last_insert_id]);

        res.status(201).json({ success: true, data: newDevice });
    } catch (error) {
        console.error('Add device error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/devices/:id - Update device
router.put('/:id', validateDevice, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const data = req.body;

        // Check if device exists
        const existingDevice = await db.fetchOne("SELECT id FROM devices WHERE id = ?", [id]);
        if (!existingDevice) {
            return res.status(404).json({ error: 'Device not found' });
        }

        await db.execute(`
            UPDATE devices SET
                name = ?, site_id = ?, room = ?, mac_address = ?, ip_address = ?,
                status = ?, firmware = ?, current_ssid = ?, current_clients = ?,
                wifi_mode = ?, updated_at = NOW()
            WHERE id = ?
        `, [
            data.name, data.site_id, data.room || null, data.mac_address || null,
            data.ip_address || null, data.status || 'offline', data.firmware || null,
            data.current_ssid || null, data.current_clients || 0, data.wifi_mode || null, id
        ]);

        const updatedDevice = await db.fetchOne(`
            SELECT d.*, s.name AS site_name 
            FROM devices d 
            LEFT JOIN sites s ON d.site_id = s.id 
            WHERE d.id = ?
        `, [id]);

        res.json({ success: true, data: updatedDevice });
    } catch (error) {
        console.error('Update device error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/devices/:id/status - Update device status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { firmware, current_ssid, current_clients, current_clients_list, wifi_mode, last_online } = req.body;

        // Check if device exists
        const existingDevice = await db.fetchOne("SELECT id FROM devices WHERE id = ?", [id]);
        if (!existingDevice) {
            return res.status(404).json({ error: 'Device not found' });
        }

        await db.execute(`
            UPDATE devices SET
                firmware = ?, current_ssid = ?, current_clients = ?,
                current_clients_list = ?, wifi_mode = ?, last_online = ?
            WHERE id = ?
        `, [
            firmware || null, current_ssid || null, current_clients || 0,
            JSON.stringify(current_clients_list || []), wifi_mode || null,
            last_online || new Date().toISOString().slice(0, 19).replace('T', ' '), id
        ]);

        const updatedDevice = await db.fetchOne(`
            SELECT d.*, s.name AS site_name 
            FROM devices d 
            LEFT JOIN sites s ON d.site_id = s.id 
            WHERE d.id = ?
        `, [id]);

        res.json({ success: true, data: updatedDevice });
    } catch (error) {
        console.error('Update device status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/devices/:id - Delete device
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if device exists
        const existingDevice = await db.fetchOne("SELECT id FROM devices WHERE id = ?", [id]);
        if (!existingDevice) {
            return res.status(404).json({ error: 'Device not found' });
        }

        await db.execute("DELETE FROM devices WHERE id = ?", [id]);

        res.json({ success: true, message: 'Device deleted successfully' });
    } catch (error) {
        console.error('Delete device error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/devices/:id/apps - Get device apps
router.get('/:id/apps', async (req, res) => {
    try {
        const { id } = req.params;
        const apps = await db.fetchAll("SELECT * FROM device_app WHERE device_id = ?", [id]);
        res.json({ success: true, data: apps });
    } catch (error) {
        console.error('Get device apps error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/devices/:id/apps - Add device app
router.post('/:id/apps', async (req, res) => {
    try {
        const { id } = req.params;
        const { app_package, app_name, version } = req.body;

        await db.execute(`
            INSERT INTO device_app (device_id, app_package, app_name, install_time, version)
            VALUES (?, ?, ?, NOW(), ?)
        `, [id, app_package, app_name, version]);

        const newApp = await db.fetchOne(`
            SELECT * FROM device_app WHERE device_id = ? AND app_package = ? ORDER BY install_time DESC LIMIT 1
        `, [id, app_package]);

        res.status(201).json({ success: true, data: newApp });
    } catch (error) {
        console.error('Add device app error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/devices/:id/client-logs - Get device client logs
router.get('/:id/client-logs', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 100 } = req.query;
        
        const logs = await db.fetchAll(`
            SELECT * FROM device_client_log 
            WHERE device_id = ? 
            ORDER BY connect_time DESC 
            LIMIT ?
        `, [id, parseInt(limit)]);
        
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Get device client logs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/devices/:id/client-logs - Add device client log
router.post('/:id/client-logs', async (req, res) => {
    try {
        const { id } = req.params;
        const { client_mac, client_name, connect_time, disconnect_time, used_app } = req.body;

        await db.execute(`
            INSERT INTO device_client_log (device_id, client_mac, client_name, connect_time, disconnect_time, used_app)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id, client_mac, client_name, connect_time, disconnect_time, used_app]);

        res.status(201).json({ success: true, message: 'Client log added successfully' });
    } catch (error) {
        console.error('Add device client log error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================
//  Device IoT Routes
// ============================

// GET /api/devices/:id/iot - Get device IoT mappings
router.get('/:id/iot', async (req, res) => {
    try {
        const { id } = req.params;
        const iotMappings = await db.fetchAll(`
            SELECT * FROM device_iot 
            WHERE device_id = ? 
            ORDER BY description ASC
        `, [id]);
        
        res.json({ success: true, data: iotMappings });
    } catch (error) {
        console.error('Get device IoT error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/devices/:id/iot - Add device IoT mapping
router.post('/:id/iot', async (req, res) => {
    try {
        const { id } = req.params;
        const { ieee_id, description, type, topic, status_json } = req.body;
        
        const _id = ieee_id.replace(/:/g, '').toLowerCase();
        
        const result = await db.execute(`
            INSERT INTO device_iot (device_id, ieee_id, _id, description, type, topic, status_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, ieee_id, _id, description, type, topic, status_json]);
        
        const newIot = await db.fetchOne(`
            SELECT * FROM device_iot WHERE id = ?
        `, [result.last_insert_id]);
        
        res.status(201).json({ success: true, data: newIot });
    } catch (error) {
        console.error('Add device IoT error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/devices/iot/:iotId - Delete device IoT mapping
router.delete('/iot/:iotId', async (req, res) => {
    try {
        const { iotId } = req.params;
        
        await db.execute("DELETE FROM device_iot WHERE id = ?", [iotId]);
        
        res.json({ success: true, message: 'IoT mapping deleted successfully' });
    } catch (error) {
        console.error('Delete device IoT error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/devices/iot/:iotId/status - Upsert IoT status
router.post('/iot/:iotId/status', async (req, res) => {
    try {
        const { iotId } = req.params;
        const { iot_id, status_key, status_value } = req.body;
        
        await db.execute(`
            INSERT INTO device_iot_status (iot_id, status_key, status_value)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE status_value = ?, updated_at = NOW()
        `, [iot_id, status_key, status_value, status_value]);
        
        res.json({ success: true, message: 'IoT status updated successfully' });
    } catch (error) {
        console.error('Upsert IoT status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/devices/iot/:iotId/status - Get IoT status
router.get('/iot/:iotId/status', async (req, res) => {
    try {
        const { iotId } = req.params;
        
        const status = await db.fetchAll(`
            SELECT status_key, status_value, updated_at
            FROM device_iot_status
            WHERE iot_id = ?
        `, [iotId]);
        
        res.json({ success: true, data: status });
    } catch (error) {
        console.error('Get IoT status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================
//  Device Heartbeat Routes
// ============================

// POST /api/devices/:id/heartbeat - Upsert device heartbeat
router.post('/:id/heartbeat', async (req, res) => {
    try {
        const { id } = req.params;
        const { device_id, last_seen, status } = req.body;
        
        const timestamp = last_seen || new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        await db.execute(`
            INSERT INTO device_heartbeat (device_id, last_seen, status)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE last_seen = ?, status = ?
        `, [device_id, timestamp, status || 'ONLINE', timestamp, status || 'ONLINE']);
        
        res.json({ success: true, message: 'Heartbeat updated successfully' });
    } catch (error) {
        console.error('Upsert heartbeat error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/devices/:id/heartbeat - Get device heartbeat
router.get('/:id/heartbeat', async (req, res) => {
    try {
        const { id } = req.params;
        
        const heartbeat = await db.fetchOne(`
            SELECT * FROM device_heartbeat WHERE device_id = ?
        `, [id]);
        
        res.json({ success: true, data: heartbeat });
    } catch (error) {
        console.error('Get heartbeat error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================
//  Device WiFi Status Routes
// ============================

// POST /api/devices/:id/wifi-status - Upsert device WiFi status
router.post('/:id/wifi-status', async (req, res) => {
    try {
        const { id } = req.params;
        const { device_id, ssid, clients, rx_rate, tx_rate, signal } = req.body;
        
        await db.execute(`
            INSERT INTO device_wifi_status (device_id, ssid, clients, rx_rate, tx_rate, signal)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE ssid = ?, clients = ?, rx_rate = ?, tx_rate = ?, signal = ?, updated_at = NOW()
        `, [device_id, ssid, clients, rx_rate, tx_rate, signal, ssid, clients, rx_rate, tx_rate, signal]);
        
        res.json({ success: true, message: 'WiFi status updated successfully' });
    } catch (error) {
        console.error('Upsert WiFi status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/devices/:id/wifi-status - Get device WiFi status
router.get('/:id/wifi-status', async (req, res) => {
    try {
        const { id } = req.params;
        
        const wifiStatus = await db.fetchOne(`
            SELECT * FROM device_wifi_status WHERE device_id = ?
        `, [id]);
        
        res.json({ success: true, data: wifiStatus });
    } catch (error) {
        console.error('Get WiFi status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/devices/:id/wifi-profile - Update device WiFi profile
router.put('/:id/wifi-profile', async (req, res) => {
    try {
        const { id } = req.params;
        const { device_id, profile_id } = req.body;
        
        await db.execute(`
            UPDATE site_wifi sw
            JOIN devices d ON sw.site_id = d.site_id AND sw.for_room = d.room
            SET sw.profile_id = ?
            WHERE d.id = ?
        `, [profile_id, device_id]);
        
        res.json({ success: true, message: 'WiFi profile updated successfully' });
    } catch (error) {
        console.error('Update WiFi profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================
//  Device Command Routes
// ============================

// POST /api/devices/command - Publish device command
router.post('/command', async (req, res) => {
    try {
        const { site_id, room, command, parameters } = req.body;
        
        // This would typically publish to MQTT or send to device
        // For now, we'll just return success
        const response = {
            site_id: site_id,
            room: room,
            command: command,
            parameters: parameters,
            timestamp: new Date().toISOString(),
            status: 'sent'
        };
        
        res.json({ success: true, data: response });
    } catch (error) {
        console.error('Publish command error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 