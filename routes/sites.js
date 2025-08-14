const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

// Validation middleware
const validateSite = [
    body('name').notEmpty().trim(),
    body('address').optional().trim(),
    body('phone').optional().trim(),
    body('email').optional().isEmail().normalizeEmail(),
    body('manager_name').optional().trim(),
    body('timezone').optional().trim(),
    body('checkin_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
    body('checkout_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
    body('currency').optional().trim(),
    body('num_rooms').optional().isInt({ min: 0 }),
    body('default_price').optional().isFloat({ min: 0 }),
    body('enable_alert').optional().isBoolean()
];

// GET /api/sites - Get all sites
router.get('/', async (req, res) => {
    try {
        const sites = await db.fetchAll("SELECT * FROM sites ORDER BY name ASC");
        res.json({ success: true, data: sites });
    } catch (error) {
        console.error('Get all sites error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/sites/profiles - Get all site profiles
router.get('/profiles', async (req, res) => {
    try {
        const profiles = await db.fetchAll("SELECT id, name FROM site_profile ORDER BY name ASC");
        res.json({ success: true, data: profiles });
    } catch (error) {
        console.error('Get site profiles error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/sites/:id/settings - Get site settings
router.get('/:id/settings', async (req, res) => {
    try {
        const { id } = req.params;
        const settings = await db.fetchAll(`
            SELECT setting_key, setting_value
            FROM site_settings
            WHERE site_id = ?
        `, [id]);
        
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Get site settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/sites/:id - Get site by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const site = await db.fetchOne("SELECT * FROM sites WHERE id = ?", [id]);
        
        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }
        
        res.json({ success: true, data: site });
    } catch (error) {
        console.error('Get site by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/sites/:id - Update site
router.put('/:id', validateSite, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const data = req.body;

        // Check if site exists
        const existingSite = await db.fetchOne("SELECT id FROM sites WHERE id = ?", [id]);
        if (!existingSite) {
            return res.status(404).json({ error: 'Site not found' });
        }

        // Prepare data
        const updateData = {
            name: data.name,
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            manager_name: data.manager_name || '',
            timezone: data.timezone || 'Asia/Bangkok',
            checkin_time: data.checkin_time || null,
            checkout_time: data.checkout_time || null,
            currency: data.currency || 'THB',
            num_rooms: data.num_rooms !== undefined && data.num_rooms !== '' ? parseInt(data.num_rooms) : null,
            default_price: data.default_price !== undefined && data.default_price !== '' ? parseFloat(data.default_price) : null,
            enable_alert: data.enable_alert !== undefined ? (data.enable_alert ? 1 : 0) : 0
        };

        const sql = `
            UPDATE sites SET
                name = ?, address = ?, phone = ?, email = ?, manager_name = ?,
                timezone = ?, checkin_time = ?, checkout_time = ?, currency = ?,
                num_rooms = ?, default_price = ?, enable_alert = ?
            WHERE id = ?
        `;

        await db.execute(sql, [
            updateData.name, updateData.address, updateData.phone, updateData.email,
            updateData.manager_name, updateData.timezone, updateData.checkin_time,
            updateData.checkout_time, updateData.currency, updateData.num_rooms,
            updateData.default_price, updateData.enable_alert, id
        ]);

        // Get updated site
        const updatedSite = await db.fetchOne("SELECT * FROM sites WHERE id = ?", [id]);
        
        res.json({ success: true, data: updatedSite });
    } catch (error) {
        console.error('Update site error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/sites/with-device-count - Get sites with device count
router.get('/with-device-count', async (req, res) => {
    try {
        const sites = await db.fetchAll(`
            SELECT s.id, s.name, COUNT(d.id) AS device_count
            FROM sites s
            LEFT JOIN devices d ON d.site_id = s.id
            GROUP BY s.id, s.name
            ORDER BY s.id
        `);
        
        res.json({ success: true, data: sites });
    } catch (error) {
        console.error('Get sites with device count error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/sites/for-admin/:adminId - Get sites for specific admin
router.get('/for-admin/:adminId', async (req, res) => {
    try {
        const { adminId } = req.params;
        
        // Check if super admin
        const isSuper = await db.fetchOne(
            "SELECT COUNT(*) AS count FROM admin_site WHERE admin_id = ? AND role = 'Super Administrator'",
            [adminId]
        );

        let sites;
        if (isSuper && isSuper.count > 0) {
            // Super admin gets all sites
            sites = await db.fetchAll("SELECT id, name FROM sites ORDER BY name ASC");
        } else {
            // Regular admin gets assigned sites
            sites = await db.fetchAll(`
                SELECT s.id, s.name
                FROM admin_site a
                JOIN sites s ON a.site_id = s.id
                WHERE a.admin_id = ?
                ORDER BY s.name ASC
            `, [adminId]);
        }
        
        res.json({ success: true, data: sites });
    } catch (error) {
        console.error('Get sites for admin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/sites/for-admin/:adminId/with-device-count - Get sites for admin with device count
router.get('/for-admin/:adminId/with-device-count', async (req, res) => {
    try {
        const { adminId } = req.params;
        
        // Check if super admin
        const isSuper = await db.fetchOne(
            "SELECT COUNT(*) AS count FROM admin_site WHERE admin_id = ? AND role = 'Super Administrator'",
            [adminId]
        );

        let sites;
        if (isSuper && isSuper.count > 0) {
            // Super admin gets all sites with device count
            sites = await db.fetchAll(`
                SELECT s.id, s.name, COUNT(d.id) AS device_count
                FROM sites s
                LEFT JOIN devices d ON d.site_id = s.id
                GROUP BY s.id, s.name
                ORDER BY s.name ASC
            `);
        } else {
            // Regular admin gets assigned sites with device count
            sites = await db.fetchAll(`
                SELECT s.id, s.name, COUNT(d.id) AS device_count
                FROM admin_site a
                JOIN sites s ON a.site_id = s.id
                LEFT JOIN devices d ON d.site_id = s.id
                WHERE a.admin_id = ?
                GROUP BY s.id, s.name
                ORDER BY s.name ASC
            `, [adminId]);
        }
        
        res.json({ success: true, data: sites });
    } catch (error) {
        console.error('Get sites for admin with device count error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/sites/ensure-default - Ensure default site exists
router.post('/ensure-default', async (req, res) => {
    try {
        const result = await db.fetchOne("SELECT COUNT(*) as count FROM sites");
        
        if (result.count == 0) {
            await db.execute(`
                INSERT INTO sites (
                    name, address, phone, email, manager_name, timezone,
                    checkin_time, checkout_time, currency, num_rooms,
                    default_price, enable_alert
                ) VALUES (
                    'MainBranch',
                    '123 Main St, City',
                    '0123456789',
                    'hotel@example.com',
                    'Manager Name',
                    'Asia/Bangkok',
                    '14:00:00',
                    '12:00:00',
                    'THB',
                    50,
                    1200.00,
                    1
                )
            `);
            
            res.json({ success: true, message: 'Default site created' });
        } else {
            res.json({ success: true, message: 'Default site already exists' });
        }
    } catch (error) {
        console.error('Ensure default site error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 