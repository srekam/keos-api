-- Migration: 001_add_new_columns.sql
-- Description: Add new columns to existing tables
-- Date: 2025-01-27

-- Add new columns to sites table
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS website VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add new columns to devices table
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS model VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS warranty_expiry DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS maintenance_notes TEXT DEFAULT NULL;

-- Add new columns to admins table
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS login_count INT DEFAULT 0;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sites_created_by ON sites(created_by);
CREATE INDEX IF NOT EXISTS idx_devices_model ON devices(model);
CREATE INDEX IF NOT EXISTS idx_admins_department ON admins(department); 