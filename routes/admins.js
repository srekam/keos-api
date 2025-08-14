const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

// Validation middleware
const validateAdmin = [
    body('name').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').optional().isLength({ min: 6 }),
    body('verified').optional().isBoolean()
];

// GET /api/admins - Get all admins
router.get('/', async (req, res) => {
    try {
        const admins = await db.fetchAll(`
            SELECT id, email, name, verified, created_at 
            FROM admins 
            ORDER BY created_at DESC
        `);
        
        res.json({ success: true, data: admins });
    } catch (error) {
        console.error('Get all admins error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admins/:id - Get admin by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await db.fetchOne(`
            SELECT id, name, email, verified 
            FROM admins 
            WHERE id = ? 
            LIMIT 1
        `, [id]);
        
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        
        res.json({ success: true, data: admin });
    } catch (error) {
        console.error('Get admin by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admins - Create new admin
router.post('/', validateAdmin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, verified = true } = req.body;

        // Check if email already exists
        const existingAdmin = await db.fetchOne("SELECT id FROM admins WHERE email = ?", [email]);
        if (existingAdmin) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const hash = password ? await bcrypt.hash(password, 10) : '';
        
        const result = await db.execute(`
            INSERT INTO admins (name, email, password_hash, verified)
            VALUES (?, ?, ?, ?)
        `, [name, email, hash, verified ? 1 : 0]);

        const newAdmin = await db.fetchOne(`
            SELECT id, name, email, verified 
            FROM admins 
            WHERE id = ?
        `, [result.last_insert_id]);

        res.status(201).json({ success: true, data: newAdmin });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/admins/:id - Update admin
router.put('/:id', validateAdmin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { name, email, password, verified } = req.body;

        // Check if admin exists
        const existingAdmin = await db.fetchOne("SELECT id FROM admins WHERE id = ?", [id]);
        if (!existingAdmin) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        // Check if email already exists (excluding current admin)
        if (email) {
            const emailExists = await db.fetchOne("SELECT id FROM admins WHERE email = ? AND id != ?", [email, id]);
            if (emailExists) {
                return res.status(400).json({ error: 'Email already exists' });
            }
        }

        let updateSql = "UPDATE admins SET name = ?, email = ?";
        let params = [name, email];

        if (password) {
            const hash = await bcrypt.hash(password, 10);
            updateSql += ", password_hash = ?";
            params.push(hash);
        }

        if (verified !== undefined) {
            updateSql += ", verified = ?";
            params.push(verified ? 1 : 0);
        }

        updateSql += " WHERE id = ?";
        params.push(id);

        await db.execute(updateSql, params);

        const updatedAdmin = await db.fetchOne(`
            SELECT id, name, email, verified 
            FROM admins 
            WHERE id = ?
        `, [id]);

        res.json({ success: true, data: updatedAdmin });
    } catch (error) {
        console.error('Update admin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/admins/:id - Delete admin
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if admin exists
        const existingAdmin = await db.fetchOne("SELECT id FROM admins WHERE id = ?", [id]);
        if (!existingAdmin) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        await db.execute("DELETE FROM admins WHERE id = ?", [id]);

        res.json({ success: true, message: 'Admin deleted successfully' });
    } catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admins/:id/sites - Get admin sites
router.get('/:id/sites', async (req, res) => {
    try {
        const { id } = req.params;
        const sites = await db.fetchAll(`
            SELECT s.* FROM admin_site a
            JOIN sites s ON a.site_id = s.id
            WHERE a.admin_id = ?
        `, [id]);
        
        res.json({ success: true, data: sites });
    } catch (error) {
        console.error('Get admin sites error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admins/:id/permissions - Get admin permissions
router.get('/:id/permissions', async (req, res) => {
    try {
        const { id } = req.params;
        const permissions = await db.fetchAll(`
            SELECT permission_key FROM admin_permission WHERE admin_id = ?
        `, [id]);
        
        res.json({ 
            success: true, 
            data: permissions.map(p => p.permission_key) 
        });
    } catch (error) {
        console.error('Get admin permissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admins/:id/sites - Assign admin to site
router.post('/:id/sites', async (req, res) => {
    try {
        const { id } = req.params;
        const { site_id, role, allow_devices_adoption = false } = req.body;

        // Check if admin exists
        const admin = await db.fetchOne("SELECT id FROM admins WHERE id = ?", [id]);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        // Check if already assigned
        const existing = await db.fetchOne(`
            SELECT 1 FROM admin_site WHERE admin_id = ? AND site_id = ?
        `, [id, site_id]);
        
        if (existing) {
            return res.status(400).json({ error: 'Admin already assigned to this site' });
        }

        await db.execute(`
            INSERT INTO admin_site (admin_id, site_id, role, allow_devices_adoption)
            VALUES (?, ?, ?, ?)
        `, [id, site_id, role, allow_devices_adoption ? 1 : 0]);

        res.status(201).json({ success: true, message: 'Admin assigned to site successfully' });
    } catch (error) {
        console.error('Assign admin to site error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/admins/:id/sites/:siteId - Update admin site role
router.put('/:id/sites/:siteId', async (req, res) => {
    try {
        const { id, siteId } = req.params;
        const { role, allow_devices_adoption = false } = req.body;

        await db.execute(`
            UPDATE admin_site
            SET role = ?, allow_devices_adoption = ?
            WHERE admin_id = ? AND site_id = ?
        `, [role, allow_devices_adoption ? 1 : 0, id, siteId]);

        res.json({ success: true, message: 'Admin site role updated successfully' });
    } catch (error) {
        console.error('Update admin site role error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/admins/:id/sites/:siteId - Remove admin from site
router.delete('/:id/sites/:siteId', async (req, res) => {
    try {
        const { id, siteId } = req.params;

        await db.execute(`
            DELETE FROM admin_site WHERE admin_id = ? AND site_id = ?
        `, [id, siteId]);

        res.json({ success: true, message: 'Admin removed from site successfully' });
    } catch (error) {
        console.error('Remove admin from site error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admins/:id/permissions - Set admin permissions
router.post('/:id/permissions', async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions = [] } = req.body;

        // Clear old permissions
        await db.execute("DELETE FROM admin_permission WHERE admin_id = ?", [id]);

        // Insert new permissions
        for (const permission of permissions) {
            await db.execute(`
                INSERT INTO admin_permission (admin_id, permission_key) 
                VALUES (?, ?)
            `, [id, permission]);
        }

        res.json({ success: true, message: 'Admin permissions updated successfully' });
    } catch (error) {
        console.error('Set admin permissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admins/available-for-site/:siteId - Get available admins for site
router.get('/available-for-site/:siteId', async (req, res) => {
    try {
        const { siteId } = req.params;
        const admins = await db.fetchAll(`
            SELECT id, name, email FROM admins
            WHERE id NOT IN (SELECT admin_id FROM admin_site WHERE site_id = ?)
        `, [siteId]);
        
        res.json({ success: true, data: admins });
    } catch (error) {
        console.error('Get available admins for site error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admins/:id/is-super - Check if admin is super admin
router.get('/:id/is-super', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.fetchOne(`
            SELECT COUNT(*) AS count FROM admin_site 
            WHERE admin_id = ? AND role = 'Super Administrator'
        `, [id]);
        
        res.json({ 
            success: true, 
            isSuperAdmin: result.count > 0 
        });
    } catch (error) {
        console.error('Check super admin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 