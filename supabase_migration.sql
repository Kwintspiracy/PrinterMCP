-- Normalized Schema Migration for Virtual Printer MCP
-- Run this in your Supabase SQL Editor

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text DEFAULT '📍',
  color text DEFAULT '#6e7781',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Printers table
CREATE TABLE IF NOT EXISTS printers (
  id text PRIMARY KEY,
  name text NOT NULL,
  type_id text NOT NULL,
  location_id text REFERENCES locations(id) ON DELETE SET NULL,
  
  -- Core state (frequently queried/updated)
  status text NOT NULL DEFAULT 'ready',
  paper_count integer NOT NULL DEFAULT 100,
  paper_size text NOT NULL DEFAULT 'A4',
  paper_tray_capacity integer NOT NULL DEFAULT 100,
  
  -- Complex nested data (read/written as units)
  ink_levels jsonb NOT NULL DEFAULT '{}',
  settings jsonb NOT NULL DEFAULT '{}',
  statistics jsonb NOT NULL DEFAULT '{}',
  errors jsonb NOT NULL DEFAULT '[]',
  
  -- Metadata
  version integer NOT NULL DEFAULT 1,
  last_start_time bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Print jobs table
CREATE TABLE IF NOT EXISTS print_jobs (
  id text PRIMARY KEY,
  printer_id text NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  pages integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  progress integer NOT NULL DEFAULT 0,
  quality text,
  color_mode text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_printers_location ON printers(location_id);
CREATE INDEX IF NOT EXISTS idx_printers_status ON printers(status);
CREATE INDEX IF NOT EXISTS idx_jobs_printer ON print_jobs(printer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON print_jobs(status);

-- RLS Policies (allow public access for demo)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access" ON locations;
DROP POLICY IF EXISTS "Allow public access" ON printers;
DROP POLICY IF EXISTS "Allow public access" ON print_jobs;

CREATE POLICY "Allow public access" ON locations FOR ALL USING (true);
CREATE POLICY "Allow public access" ON printers FOR ALL USING (true);
CREATE POLICY "Allow public access" ON print_jobs FOR ALL USING (true);

-- Optional: Drop old printer_state table if you don't need the data
-- DROP TABLE IF EXISTS printer_state;

-- Response Templates table (for LLM response customization)
CREATE TABLE IF NOT EXISTS response_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  name text,
  content jsonb NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_key ON response_templates(template_key, version);
CREATE INDEX IF NOT EXISTS idx_template_active ON response_templates(template_key, is_active) WHERE is_active = true;

ALTER TABLE response_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access" ON response_templates;
CREATE POLICY "Allow public access" ON response_templates FOR ALL USING (true);
