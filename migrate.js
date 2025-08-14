const fs = require('fs');
const path = require('path');
const db = require('./config/database');

class MigrationRunner {
    constructor() {
        this.migrationsPath = path.join(__dirname, 'migrations');
        this.migrationsTable = 'migrations';
    }

    async init() {
        try {
            // Create migrations table if it doesn't exist
            await db.execute(`
                CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL UNIQUE,
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status ENUM('success', 'failed') DEFAULT 'success'
                )
            `);
            console.log('✅ Migrations table initialized');
        } catch (error) {
            console.error('❌ Failed to initialize migrations table:', error.message);
            throw error;
        }
    }

    async getExecutedMigrations() {
        try {
            const migrations = await db.fetchAll(`SELECT filename FROM ${this.migrationsTable} WHERE status = 'success'`);
            return migrations.map(m => m.filename);
        } catch (error) {
            console.error('❌ Failed to get executed migrations:', error.message);
            return [];
        }
    }

    async getMigrationFiles() {
        try {
            const files = fs.readdirSync(this.migrationsPath)
                .filter(file => file.endsWith('.sql'))
                .sort();
            return files;
        } catch (error) {
            console.error('❌ Failed to read migration files:', error.message);
            return [];
        }
    }

    async executeMigration(filename) {
        const filePath = path.join(this.migrationsPath, filename);
        
        try {
            console.log(`🔄 Executing migration: ${filename}`);
            
            // Read SQL file
            const sql = fs.readFileSync(filePath, 'utf8');
            
            // Split by semicolon and execute each statement
            const statements = sql.split(';').filter(stmt => stmt.trim());
            
            for (const statement of statements) {
                if (statement.trim()) {
                    await db.execute(statement);
                }
            }
            
            // Record successful migration
            await db.execute(
                `INSERT INTO ${this.migrationsTable} (filename, status) VALUES (?, 'success')`,
                [filename]
            );
            
            console.log(`✅ Migration completed: ${filename}`);
            return true;
        } catch (error) {
            console.error(`❌ Migration failed: ${filename}`, error.message);
            
            // Record failed migration
            try {
                await db.execute(
                    `INSERT INTO ${this.migrationsTable} (filename, status) VALUES (?, 'failed')`,
                    [filename]
                );
            } catch (insertError) {
                console.error('Failed to record migration failure:', insertError.message);
            }
            
            return false;
        }
    }

    async run() {
        try {
            console.log('🚀 Starting database migrations...');
            
            await this.init();
            
            const executedMigrations = await this.getExecutedMigrations();
            const migrationFiles = await this.getMigrationFiles();
            
            const pendingMigrations = migrationFiles.filter(file => !executedMigrations.includes(file));
            
            if (pendingMigrations.length === 0) {
                console.log('✅ No pending migrations');
                return;
            }
            
            console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
            
            for (const migration of pendingMigrations) {
                const success = await this.executeMigration(migration);
                if (!success) {
                    console.error('❌ Migration failed, stopping execution');
                    process.exit(1);
                }
            }
            
            console.log('🎉 All migrations completed successfully!');
        } catch (error) {
            console.error('❌ Migration runner failed:', error.message);
            process.exit(1);
        }
    }
}

// Run migrations if this file is executed directly
if (require.main === module) {
    const runner = new MigrationRunner();
    runner.run().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}

module.exports = MigrationRunner; 