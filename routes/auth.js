const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

// Validation middleware
const validateLogin = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 1 })
];

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find admin by email
        const admin = await db.fetchOne(
            "SELECT * FROM admins WHERE email = ? LIMIT 1",
            [email]
        );

        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Get admin permissions
        const permissions = await db.fetchAll(
            "SELECT permission_key FROM admin_permission WHERE admin_id = ?",
            [admin.id]
        );

        // Get admin sites
        const sites = await db.fetchAll(
            "SELECT s.* FROM admin_site a JOIN sites s ON a.site_id = s.id WHERE a.admin_id = ?",
            [admin.id]
        );

        // Create session data (similar to PHP session)
        const sessionData = {
            admin_id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role || 'ADMIN',
            permissions: permissions.map(p => p.permission_key),
            sites: sites
        };

        res.json({
            success: true,
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                verified: admin.verified
            },
            session: sessionData
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/verify
router.get('/verify', async (req, res) => {
    try {
        const adminId = req.query.admin_id || req.headers['x-admin-id'];
        
        if (!adminId) {
            return res.status(401).json({ error: 'No admin ID provided' });
        }

        const admin = await db.fetchOne(
            "SELECT id, email, name, verified FROM admins WHERE id = ? LIMIT 1",
            [adminId]
        );

        if (!admin) {
            return res.status(401).json({ error: 'Invalid admin ID' });
        }

        // Get permissions
        const permissions = await db.fetchAll(
            "SELECT permission_key FROM admin_permission WHERE admin_id = ?",
            [adminId]
        );

        // Get sites
        const sites = await db.fetchAll(
            "SELECT s.* FROM admin_site a JOIN sites s ON a.site_id = s.id WHERE a.admin_id = ?",
            [adminId]
        );

        res.json({
            success: true,
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                verified: admin.verified
            },
            permissions: permissions.map(p => p.permission_key),
            sites: sites
        });

    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/is-logged-in
router.get('/is-logged-in', async (req, res) => {
    try {
        const adminId = req.query.admin_id || req.headers['x-admin-id'];
        
        if (!adminId) {
            return res.json({ isLoggedIn: false });
        }

        const admin = await db.fetchOne(
            "SELECT id FROM admins WHERE id = ? LIMIT 1",
            [adminId]
        );

        res.json({ isLoggedIn: !!admin });

    } catch (error) {
        console.error('Is logged in error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/current-admin
router.get('/current-admin', async (req, res) => {
    try {
        const adminId = req.query.admin_id || req.headers['x-admin-id'];
        
        if (!adminId) {
            return res.status(401).json({ error: 'No admin ID provided' });
        }

        const admin = await db.fetchOne(
            "SELECT id, email, name, verified FROM admins WHERE id = ? LIMIT 1",
            [adminId]
        );

        if (!admin) {
            return res.status(401).json({ error: 'Invalid admin ID' });
        }

        res.json({
            success: true,
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                verified: admin.verified
            }
        });

    } catch (error) {
        console.error('Current admin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 