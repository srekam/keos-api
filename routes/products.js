const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

// Validation middleware
const validateProduct = [
    body('name').notEmpty().trim(),
    body('product_category_id').isInt({ min: 1 }),
    body('description').optional().trim(),
    body('price').isFloat({ min: 0 }),
    body('unit').optional().trim(),
    body('image_url').optional().trim(),
    body('track_stock').optional().isBoolean(),
    body('is_service').optional().isBoolean(),
    body('require_serial').optional().isBoolean(),
    body('active').optional().isBoolean()
];

const validateCategory = [
    body('name').notEmpty().trim(),
    body('type').optional().isIn(['AMENITY', 'SERVICE', 'FOOD', 'OTHER']),
    body('active').optional().isBoolean()
];

// ============================
// PRODUCT CATEGORY ROUTES
// ============================

// GET /api/products/categories - Get all product categories
router.get('/categories', async (req, res) => {
    try {
        const { site_id, active_only } = req.query;
        let sql = "SELECT * FROM product_category";
        let params = [];
        
        if (site_id) {
            sql += " WHERE site_id = ?";
            params.push(site_id);
            
            if (active_only === 'true') {
                sql += " AND active = 1";
            }
        } else if (active_only === 'true') {
            sql += " WHERE active = 1";
        }
        
        sql += " ORDER BY name ASC";
        const categories = await db.fetchAll(sql, params);
        
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Get product categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/products/categories/:id - Get category by ID
router.get('/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { site_id } = req.query;
        
        let sql = "SELECT * FROM product_category WHERE id = ?";
        let params = [id];
        
        if (site_id) {
            sql += " AND site_id = ?";
            params.push(site_id);
        }
        
        const category = await db.fetchOne(sql, params);
        
        if (!category) {
            return res.status(404).json({ error: 'Product category not found' });
        }
        
        res.json({ success: true, data: category });
    } catch (error) {
        console.error('Get product category by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/products/categories - Create new category
router.post('/categories', validateCategory, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, type = 'AMENITY', active = true, site_id } = req.body;

        const result = await db.execute(`
            INSERT INTO product_category (site_id, name, type, active)
            VALUES (?, ?, ?, ?)
        `, [site_id, name, type, active ? 1 : 0]);

        const newCategory = await db.fetchOne("SELECT * FROM product_category WHERE id = ?", [result.last_insert_id]);
        
        res.status(201).json({ success: true, data: newCategory });
    } catch (error) {
        console.error('Create product category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/products/categories/:id - Update category
router.put('/categories/:id', validateCategory, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { name, type = 'AMENITY', active = true, site_id } = req.body;

        await db.execute(`
            UPDATE product_category 
            SET name = ?, type = ?, active = ?
            WHERE id = ? AND site_id = ?
        `, [name, type, active ? 1 : 0, id, site_id]);

        const updatedCategory = await db.fetchOne("SELECT * FROM product_category WHERE id = ?", [id]);
        
        if (!updatedCategory) {
            return res.status(404).json({ error: 'Product category not found' });
        }
        
        res.json({ success: true, data: updatedCategory });
    } catch (error) {
        console.error('Update product category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/products/categories/:id - Delete category
router.delete('/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { site_id } = req.query;

        let sql = "DELETE FROM product_category WHERE id = ?";
        let params = [id];
        
        if (site_id) {
            sql += " AND site_id = ?";
            params.push(site_id);
        }

        await db.execute(sql, params);

        res.json({ success: true, message: 'Product category deleted successfully' });
    } catch (error) {
        console.error('Delete product category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/products/categories/search/:siteId - Search categories
router.get('/categories/search/:siteId', async (req, res) => {
    try {
        const { siteId } = req.params;
        const { q = '' } = req.query;
        
        let sql = "SELECT id, name FROM product_category WHERE site_id = ? AND active = 1";
        let params = [siteId];
        
        if (q !== '') {
            sql += " AND name LIKE ?";
            params.push(`%${q}%`);
        }
        
        sql += " ORDER BY name ASC";
        const categories = await db.fetchAll(sql, params);
        
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Search product categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================
// PRODUCT ROUTES
// ============================

// GET /api/products - Get all products
router.get('/', async (req, res) => {
    try {
        const { site_id, active_only } = req.query;
        let sql = `
            SELECT p.*, c.name as category_name, c.type as category_type
            FROM product p
            LEFT JOIN product_category c ON p.product_category_id = c.id
        `;
        let params = [];
        
        if (site_id) {
            sql += " WHERE p.site_id = ?";
            params.push(site_id);
            
            if (active_only === 'true') {
                sql += " AND p.active = 1";
            }
        } else if (active_only === 'true') {
            sql += " WHERE p.active = 1";
        }
        
        sql += " ORDER BY p.name ASC";
        const products = await db.fetchAll(sql, params);
        
        res.json({ success: true, data: products });
    } catch (error) {
        console.error('Get all products error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/products/:id - Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { site_id } = req.query;
        
        let sql = `
            SELECT p.*, c.name as category_name, c.type as category_type
            FROM product p
            LEFT JOIN product_category c ON p.product_category_id = c.id
            WHERE p.id = ?
        `;
        let params = [id];
        
        if (site_id) {
            sql += " AND p.site_id = ?";
            params.push(site_id);
        }
        
        const product = await db.fetchOne(sql, params);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json({ success: true, data: product });
    } catch (error) {
        console.error('Get product by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/products - Create new product
router.post('/', validateProduct, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const data = req.body;

        const result = await db.execute(`
            INSERT INTO product
                (site_id, product_category_id, name, description, price, unit, image_url, track_stock, is_service, require_serial, active)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.site_id, data.product_category_id, data.name, data.description || '',
            data.price, data.unit || '', data.image_url || '', data.track_stock ? 1 : 0,
            data.is_service ? 1 : 0, data.require_serial ? 1 : 0, data.active !== undefined ? (data.active ? 1 : 0) : 1
        ]);

        const newProduct = await db.fetchOne(`
            SELECT p.*, c.name as category_name, c.type as category_type
            FROM product p
            LEFT JOIN product_category c ON p.product_category_id = c.id
            WHERE p.id = ?
        `, [result.last_insert_id]);

        res.status(201).json({ success: true, data: newProduct });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/products/:id - Update product
router.put('/:id', validateProduct, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const data = req.body;

        await db.execute(`
            UPDATE product SET
                product_category_id = ?, name = ?, description = ?, price = ?, unit = ?,
                image_url = ?, track_stock = ?, is_service = ?, require_serial = ?, active = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND site_id = ?
        `, [
            data.product_category_id, data.name, data.description || '', data.price, data.unit || '',
            data.image_url || '', data.track_stock ? 1 : 0, data.is_service ? 1 : 0,
            data.require_serial ? 1 : 0, data.active !== undefined ? (data.active ? 1 : 0) : 1, id, data.site_id
        ]);

        const updatedProduct = await db.fetchOne(`
            SELECT p.*, c.name as category_name, c.type as category_type
            FROM product p
            LEFT JOIN product_category c ON p.product_category_id = c.id
            WHERE p.id = ?
        `, [id]);

        if (!updatedProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ success: true, data: updatedProduct });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { site_id } = req.query;

        let sql = "DELETE FROM product WHERE id = ?";
        let params = [id];
        
        if (site_id) {
            sql += " AND site_id = ?";
            params.push(site_id);
        }

        await db.execute(sql, params);

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 