const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

// Validation middleware
const validateOrder = [
    body('site_id').isInt({ min: 1 }),
    body('room').notEmpty().trim(),
    body('guest_name').notEmpty().trim(),
    body('created_by').isInt({ min: 1 })
];

const validateOrderItem = [
    body('product_order_id').isInt({ min: 1 }),
    body('product_id').isInt({ min: 1 }),
    body('qty').isInt({ min: 1 }),
    body('price').isFloat({ min: 0 }),
    body('note').optional().trim()
];

// GET /api/orders - Get all orders
router.get('/', async (req, res) => {
    try {
        const { site_id, limit = 10 } = req.query;
        let sql = `
            SELECT o.*, a.name as staff
            FROM product_order o 
            LEFT JOIN admins a ON o.created_by = a.id
        `;
        let params = [];
        
        if (site_id) {
            sql += " WHERE o.site_id = ?";
            params.push(site_id);
        }
        
        sql += " ORDER BY o.created_at DESC";
        
        if (limit) {
            sql += " LIMIT ?";
            params.push(parseInt(limit));
        }
        
        const orders = await db.fetchAll(sql, params);
        
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/orders/:id - Get order by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { site_id } = req.query;
        
        let sql = `
            SELECT o.*, a.name as staff
            FROM product_order o 
            LEFT JOIN admins a ON o.created_by = a.id
            WHERE o.id = ?
        `;
        let params = [id];
        
        if (site_id) {
            sql += " AND o.site_id = ?";
            params.push(site_id);
        }
        
        const order = await db.fetchOne(sql, params);
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Get order by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/orders - Create new order
router.post('/', validateOrder, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { site_id, room, guest_name, created_by } = req.body;

        const result = await db.execute(`
            INSERT INTO product_order (site_id, room, guest_name, created_by)
            VALUES (?, ?, ?, ?)
        `, [site_id, room, guest_name, created_by]);

        const newOrder = await db.fetchOne(`
            SELECT o.*, a.name as staff
            FROM product_order o 
            LEFT JOIN admins a ON o.created_by = a.id
            WHERE o.id = ?
        `, [result.last_insert_id]);

        res.status(201).json({ success: true, data: newOrder });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, site_id } = req.body;

        let sql = "UPDATE product_order SET status = ? WHERE id = ?";
        let params = [status, id];
        
        if (site_id) {
            sql += " AND site_id = ?";
            params.push(site_id);
        }

        await db.execute(sql, params);

        const updatedOrder = await db.fetchOne(`
            SELECT o.*, a.name as staff
            FROM product_order o 
            LEFT JOIN admins a ON o.created_by = a.id
            WHERE o.id = ?
        `, [id]);

        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({ success: true, data: updatedOrder });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/orders/:id - Delete order
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { site_id } = req.query;

        let sql = "DELETE FROM product_order WHERE id = ?";
        let params = [id];
        
        if (site_id) {
            sql += " AND site_id = ?";
            params.push(site_id);
        }

        await db.execute(sql, params);

        res.json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================
// ORDER ITEMS ROUTES
// ============================

// GET /api/orders/:orderId/items - Get order items
router.get('/:orderId/items', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const items = await db.fetchAll(`
            SELECT oi.*, p.name as product_name, p.unit
            FROM product_order_item oi
            LEFT JOIN product p ON oi.product_id = p.id
            WHERE oi.product_order_id = ?
            ORDER BY oi.id ASC
        `, [orderId]);
        
        res.json({ success: true, data: items });
    } catch (error) {
        console.error('Get order items error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/orders/:orderId/items - Add order item
router.post('/:orderId/items', validateOrderItem, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { orderId } = req.params;
        const { product_id, qty, price, note = '' } = req.body;

        // Verify order exists
        const order = await db.fetchOne("SELECT id FROM product_order WHERE id = ?", [orderId]);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const result = await db.execute(`
            INSERT INTO product_order_item (product_order_id, product_id, qty, price, note)
            VALUES (?, ?, ?, ?, ?)
        `, [orderId, product_id, qty, price, note]);

        const newItem = await db.fetchOne(`
            SELECT oi.*, p.name as product_name, p.unit
            FROM product_order_item oi
            LEFT JOIN product p ON oi.product_id = p.id
            WHERE oi.id = ?
        `, [result.last_insert_id]);

        res.status(201).json({ success: true, data: newItem });
    } catch (error) {
        console.error('Add order item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/orders/:orderId/items/:itemId - Update order item
router.put('/:orderId/items/:itemId', validateOrderItem, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { orderId, itemId } = req.params;
        const { product_id, qty, price, note = '' } = req.body;

        await db.execute(`
            UPDATE product_order_item 
            SET product_id = ?, qty = ?, price = ?, note = ?
            WHERE id = ? AND product_order_id = ?
        `, [product_id, qty, price, note, itemId, orderId]);

        const updatedItem = await db.fetchOne(`
            SELECT oi.*, p.name as product_name, p.unit
            FROM product_order_item oi
            LEFT JOIN product p ON oi.product_id = p.id
            WHERE oi.id = ?
        `, [itemId]);

        if (!updatedItem) {
            return res.status(404).json({ error: 'Order item not found' });
        }

        res.json({ success: true, data: updatedItem });
    } catch (error) {
        console.error('Update order item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/orders/:orderId/items/:itemId - Delete order item
router.delete('/:orderId/items/:itemId', async (req, res) => {
    try {
        const { orderId, itemId } = req.params;

        await db.execute(`
            DELETE FROM product_order_item 
            WHERE id = ? AND product_order_id = ?
        `, [itemId, orderId]);

        res.json({ success: true, message: 'Order item deleted successfully' });
    } catch (error) {
        console.error('Delete order item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/orders/recent/:siteId - Get recent orders for site
router.get('/recent/:siteId', async (req, res) => {
    try {
        const { siteId } = req.params;
        const { limit = 10 } = req.query;
        
        const orders = await db.fetchAll(`
            SELECT o.*, a.name as staff
            FROM product_order o 
            LEFT JOIN admins a ON o.created_by = a.id
            WHERE o.site_id = ?
            ORDER BY o.created_at DESC 
            LIMIT ?
        `, [siteId, parseInt(limit)]);
        
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('Get recent orders error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 