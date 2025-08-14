const mysql = require('mysql2/promise');

class Database {
    constructor() {
        this.connection = null;
        this.config = {
            host: process.env.DB_HOST || 'hotel_db',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || 'root',
            database: process.env.DB_NAME || 'hotel_portal',
            charset: 'utf8mb4',
            timezone: '+07:00',
            connectionLimit: 10,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true
        };
    }

    async connect() {
        try {
            if (!this.connection) {
                this.connection = await mysql.createConnection(this.config);
                console.log('✅ Database connected successfully');
            }
            return this.connection;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
            console.log('🔌 Database disconnected');
        }
    }

    isConnected() {
        return this.connection !== null;
    }

    async query(sql, params = []) {
        try {
            const connection = await this.connect();
            const [rows] = await connection.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Query error:', error);
            throw error;
        }
    }

    async fetchAll(sql, params = []) {
        return await this.query(sql, params);
    }

    async fetchOne(sql, params = []) {
        const rows = await this.query(sql, params);
        return rows.length > 0 ? rows[0] : null;
    }

    async execute(sql, params = []) {
        try {
            const connection = await this.connect();
            const [result] = await connection.execute(sql, params);
            return {
                affected_rows: result.affectedRows,
                last_insert_id: result.insertId
            };
        } catch (error) {
            console.error('Execute error:', error);
            throw error;
        }
    }

    async transaction(callback) {
        const connection = await this.connect();
        try {
            await connection.beginTransaction();
            const result = await callback(this);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        }
    }

    // Helper method for pagination
    async paginate(sql, params = [], page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const countSql = sql.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as total FROM');
        const countSqlClean = countSql.replace(/ORDER BY.*$/, '');
        
        const [totalResult] = await this.query(countSqlClean, params);
        const total = totalResult.total;
        
        const dataSql = `${sql} LIMIT ${limit} OFFSET ${offset}`;
        const data = await this.query(dataSql, params);
        
        return {
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
}

// Create singleton instance
const db = new Database();

// Initialize database connection on startup
(async () => {
    try {
        await db.connect();
    } catch (error) {
        console.error('Failed to connect to database on startup:', error.message);
    }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await db.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await db.disconnect();
    process.exit(0);
});

module.exports = db; 