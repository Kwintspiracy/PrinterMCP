-- ============================================
-- Virtual Printer MCP - Supabase Schema
-- Multi-Printer System with Location Support
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PRINTER_STATE TABLE (Simple key-value storage)
-- Used by SupabaseStorage adapter for single-printer mode
-- ============================================
CREATE TABLE IF NOT EXISTS printer_state (
    id TEXT PRIMARY KEY DEFAULT 'default',
    state JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row if not exists
INSERT INTO printer_state (id, state)
VALUES ('default', '{}')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- LOCATIONS TABLE
-- Stores printer locations (Home, Office, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '📍',
    color TEXT DEFAULT '#6e7681',
    default_printer_id TEXT,  -- FK to printers, set after printers exist
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRINTERS TABLE
-- Stores all virtual printers and their states
-- ============================================
CREATE TABLE IF NOT EXISTS printers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type_id TEXT NOT NULL,  -- e.g., 'hp-envy-6055e'
    location_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
    
    -- Printer status
    status TEXT DEFAULT 'ready',  -- ready, printing, paused, error, offline
    
    -- Ink levels (0-100)
    ink_cyan NUMERIC(5,2) DEFAULT 100,
    ink_magenta NUMERIC(5,2) DEFAULT 100,
    ink_yellow NUMERIC(5,2) DEFAULT 100,
    ink_black NUMERIC(5,2) DEFAULT 100,
    ink_photo_black NUMERIC(5,2),  -- Optional for some printers
    
    -- Paper
    paper_count INTEGER DEFAULT 100,
    paper_size TEXT DEFAULT 'A4',
    paper_tray_capacity INTEGER DEFAULT 100,
    
    -- Settings
    settings JSONB DEFAULT '{}',
    
    -- Statistics
    total_pages_printed INTEGER DEFAULT 0,
    total_jobs INTEGER DEFAULT 0,
    successful_jobs INTEGER DEFAULT 0,
    failed_jobs INTEGER DEFAULT 0,
    total_ink_used JSONB DEFAULT '{"cyan":0,"magenta":0,"yellow":0,"black":0}',
    
    -- Timestamps
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for default printer after printers table exists
ALTER TABLE locations 
ADD CONSTRAINT fk_default_printer 
FOREIGN KEY (default_printer_id) REFERENCES printers(id) ON DELETE SET NULL;

-- ============================================
-- PRINT_QUEUE TABLE
-- Stores print jobs for each printer
-- ============================================
CREATE TABLE IF NOT EXISTS print_queue (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    printer_id TEXT NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
    
    -- Job details
    document_name TEXT NOT NULL,
    pages INTEGER NOT NULL DEFAULT 1,
    color BOOLEAN DEFAULT false,
    quality TEXT DEFAULT 'normal',  -- draft, normal, high, photo
    paper_size TEXT DEFAULT 'A4',
    
    -- Status
    status TEXT DEFAULT 'queued',  -- queued, printing, completed, cancelled, failed
    progress INTEGER DEFAULT 0,  -- 0-100
    current_page INTEGER DEFAULT 0,
    
    -- Timestamps
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- ============================================
-- PRINTER_LOGS TABLE
-- Activity logs for each printer
-- ============================================
CREATE TABLE IF NOT EXISTS printer_logs (
    id BIGSERIAL PRIMARY KEY,
    printer_id TEXT REFERENCES printers(id) ON DELETE CASCADE,
    level TEXT DEFAULT 'info',  -- info, warning, error
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER_SETTINGS TABLE
-- Single row for user preferences
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    current_location_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
    auto_switch_enabled BOOLEAN DEFAULT true,
    theme TEXT DEFAULT 'dark',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_printers_location ON printers(location_id);
CREATE INDEX IF NOT EXISTS idx_printers_status ON printers(status);
CREATE INDEX IF NOT EXISTS idx_print_queue_printer ON print_queue(printer_id);
CREATE INDEX IF NOT EXISTS idx_print_queue_status ON print_queue(status);
CREATE INDEX IF NOT EXISTS idx_printer_logs_printer ON printer_logs(printer_id);
CREATE INDEX IF NOT EXISTS idx_printer_logs_created ON printer_logs(created_at DESC);

-- ============================================
-- FUNCTIONS for auto-updating timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trigger_locations_updated
    BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_printers_updated
    BEFORE UPDATE ON printers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_user_settings_updated
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA: Default locations and printers
-- ============================================

-- Insert default locations
INSERT INTO locations (id, name, description, icon, color, sort_order) VALUES
    ('loc-home', 'Home', 'Home printers for personal use', '🏠', '#238636', 0),
    ('loc-office', 'Office', 'Office printers for business use', '🏢', '#1f6feb', 1)
ON CONFLICT (id) DO NOTHING;

-- Insert default printers
INSERT INTO printers (id, name, type_id, location_id, ink_cyan, ink_magenta, ink_yellow, ink_black, paper_count) VALUES
    -- Home printers
    ('printer-home-envy', 'HP ENVY 6055e', 'hp-envy-6055e', 'loc-home', 75, 80, 90, 85, 150),
    ('printer-home-deskjet', 'HP DeskJet 2755e', 'hp-deskjet-2755e', 'loc-home', 60, 70, 55, 45, 100),
    ('printer-home-smarttank', 'HP Smart Tank 5101', 'hp-smart-tank-5101', 'loc-home', 95, 92, 88, 90, 200),
    -- Office printers
    ('printer-office-laserjet', 'HP LaserJet Pro', 'hp-laserjet-pro-m404dn', 'loc-office', 100, 100, 100, 85, 250),
    ('printer-office-color', 'HP Color LaserJet', 'hp-color-laserjet-pro-m454dw', 'loc-office', 70, 65, 80, 75, 200),
    ('printer-office-officejet', 'HP OfficeJet Pro 9015e', 'hp-officejet-pro-9015e', 'loc-office', 55, 60, 70, 50, 150)
ON CONFLICT (id) DO NOTHING;

-- Set default printers for each location
UPDATE locations SET default_printer_id = 'printer-home-envy' WHERE id = 'loc-home';
UPDATE locations SET default_printer_id = 'printer-office-laserjet' WHERE id = 'loc-office';

-- Initialize user settings with Home as default location
INSERT INTO user_settings (id, current_location_id, auto_switch_enabled)
VALUES ('default', 'loc-home', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (optional, enable if needed)
-- ============================================
-- ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE print_queue ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE printer_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
