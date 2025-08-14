const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

// Validation middleware
const validateWifi = [
    body('site_id').isInt({ min: 1 }),
    body('ssid').notEmpty().trim(),
    body('password').notEmpty().trim(),
    body('policy_mode').notEmpty().trim(),
    body('for_room').notEmpty().trim(),
    body('security').optional().trim(),
    body('enabled').optional().isBoolean(),
    body('ap_group_id').optional().trim(),
    body('wifi_band').optional().trim()
];

// Helper function to ensure default profile exists
async function ensureDefaultProfile() {
    const row = await db.fetchOne("SELECT id FROM site_profile LIMIT 1");
    if (!row) {
        await db.execute(`
            INSERT INTO site_profile (name, ssid_template, password_rule, security, settings)
            VALUES ('Default Profile', 'Room-{{room}}', 'fixed', 'WPA2', '{}')
        `);
    }
    const result = await db.fetchOne("SELECT id FROM site_profile ORDER BY id ASC LIMIT 1");
    return result ? result.id : 1;
}

// GET /api/wifi - Get all WiFi configurations
router.get('/', async (req, res) => {
    try {
        const { site_id } = req.query;
        let sql = "SELECT * FROM site_wifi";
        let params = [];
        
        if (site_id) {
            sql += " WHERE site_id = ?";
            params.push(site_id);
        }
        
        sql += " ORDER BY id ASC";
        const wifiConfigs = await db.fetchAll(sql, params);
        
        res.json({ success: true, data: wifiConfigs });
    } catch (error) {
        console.error('Get all WiFi error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/wifi/:id - Get WiFi by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const wifi = await db.fetchOne("SELECT * FROM site_wifi WHERE id = ?", [id]);
        
        if (!wifi) {
            return res.status(404).json({ error: 'WiFi configuration not found' });
        }
        
        res.json({ success: true, data: wifi });
    } catch (error) {
        console.error('Get WiFi by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/wifi/by-room/:siteId/:room - Get WiFi by room
router.get('/by-room/:siteId/:room', async (req, res) => {
    try {
        const { siteId, room } = req.params;
        const wifi = await db.fetchOne(`
            SELECT * FROM site_wifi 
            WHERE site_id = ? AND for_room = ?
        `, [siteId, room]);
        
        if (!wifi) {
            return res.status(404).json({ error: 'WiFi configuration not found for this room' });
        }
        
        res.json({ success: true, data: wifi });
    } catch (error) {
        console.error('Get WiFi by room error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/wifi/by-site/:siteId - Get all WiFi for site
router.get('/by-site/:siteId', async (req, res) => {
    try {
        const { siteId } = req.params;
        const wifiConfigs = await db.fetchAll(`
            SELECT * FROM site_wifi 
            WHERE site_id = ? 
            ORDER BY id ASC
        `, [siteId]);
        
        res.json({ success: true, data: wifiConfigs });
    } catch (error) {
        console.error('Get WiFi by site error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/wifi - Add new WiFi configuration
router.post('/', validateWifi, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const data = req.body;
        
        // Ensure default profile exists
        let profileId = data.profile_id;
        if (!profileId) {
            profileId = await ensureDefaultProfile();
        } else {
            const profile = await db.fetchOne("SELECT id FROM site_profile WHERE id = ?", [profileId]);
            if (!profile) {
                profileId = await ensureDefaultProfile();
            }
        }
        
        const result = await db.execute(`
            INSERT INTO site_wifi
                (site_id, profile_id, ssid, password, policy_mode, for_room, security, enabled, ap_group_id, wifi_band)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.site_id, profileId, data.ssid, data.password, data.policy_mode,
            data.for_room, data.security || 'WPA2', data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1,
            data.ap_group_id || null, data.wifi_band || 'both'
        ]);

        const newWifi = await db.fetchOne("SELECT * FROM site_wifi WHERE id = ?", [result.last_insert_id]);
        
        res.status(201).json({ success: true, data: newWifi });
    } catch (error) {
        console.error('Add WiFi error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/wifi/:id - Update WiFi configuration
router.put('/:id', validateWifi, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const data = req.body;

        // Check if WiFi exists
        const existingWifi = await db.fetchOne("SELECT id FROM site_wifi WHERE id = ?", [id]);
        if (!existingWifi) {
            return res.status(404).json({ error: 'WiFi configuration not found' });
        }

        // Ensure default profile exists
        let profileId = data.profile_id;
        if (!profileId) {
            profileId = await ensureDefaultProfile();
        } else {
            const profile = await db.fetchOne("SELECT id FROM site_profile WHERE id = ?", [profileId]);
            if (!profile) {
                profileId = await ensureDefaultProfile();
            }
        }

        await db.execute(`
            UPDATE site_wifi SET
                site_id = ?, profile_id = ?, ssid = ?, password = ?, policy_mode = ?,
                for_room = ?, security = ?, enabled = ?, ap_group_id = ?, wifi_band = ?
            WHERE id = ?
        `, [
            data.site_id, profileId, data.ssid, data.password, data.policy_mode,
            data.for_room, data.security || 'WPA2', data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1,
            data.ap_group_id || null, data.wifi_band || 'both', id
        ]);

        const updatedWifi = await db.fetchOne("SELECT * FROM site_wifi WHERE id = ?", [id]);
        
        res.json({ success: true, data: updatedWifi });
    } catch (error) {
        console.error('Update WiFi error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/wifi/:id - Delete WiFi configuration
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if WiFi exists
        const existingWifi = await db.fetchOne("SELECT id FROM site_wifi WHERE id = ?", [id]);
        if (!existingWifi) {
            return res.status(404).json({ error: 'WiFi configuration not found' });
        }

        await db.execute("DELETE FROM site_wifi WHERE id = ?", [id]);

        res.json({ success: true, message: 'WiFi configuration deleted successfully' });
    } catch (error) {
        console.error('Delete WiFi error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/wifi/profiles - Get all WiFi profiles
router.get('/profiles', async (req, res) => {
    try {
        const profiles = await db.fetchAll("SELECT * FROM site_profile ORDER BY name ASC");
        res.json({ success: true, data: profiles });
    } catch (error) {
        console.error('Get WiFi profiles error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/wifi/profiles - Create new WiFi profile
router.post('/profiles', async (req, res) => {
    try {
        const { name, ssid_template, password_rule, security, settings } = req.body;

        const result = await db.execute(`
            INSERT INTO site_profile (name, ssid_template, password_rule, security, settings)
            VALUES (?, ?, ?, ?, ?)
        `, [name, ssid_template, password_rule, security, JSON.stringify(settings || {})]);

        const newProfile = await db.fetchOne("SELECT * FROM site_profile WHERE id = ?", [result.last_insert_id]);
        
        res.status(201).json({ success: true, data: newProfile });
    } catch (error) {
        console.error('Create WiFi profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/wifi/profiles/:id - Update WiFi profile
router.put('/profiles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, ssid_template, password_rule, security, settings } = req.body;

        await db.execute(`
            UPDATE site_profile 
            SET name = ?, ssid_template = ?, password_rule = ?, security = ?, settings = ?
            WHERE id = ?
        `, [name, ssid_template, password_rule, security, JSON.stringify(settings || {}), id]);

        const updatedProfile = await db.fetchOne("SELECT * FROM site_profile WHERE id = ?", [id]);
        
        res.json({ success: true, data: updatedProfile });
    } catch (error) {
        console.error('Update WiFi profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/wifi/profiles/:id - Delete WiFi profile
router.delete('/profiles/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await db.execute("DELETE FROM site_profile WHERE id = ?", [id]);

        res.json({ success: true, message: 'WiFi profile deleted successfully' });
    } catch (error) {
        console.error('Delete WiFi profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 