/*
  # Create Adveronix-Style Data Extraction System Tables

  This migration creates the database structure for a flexible, user-configurable
  data extraction system similar to Adveronix (Google Sheets add-on for ads data).

  ## 1. New Tables

  ### report_templates
  Stores user-saved report configurations for reuse:
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, FK) - Owner of the template
  - `name` (text) - Template name (e.g., "Performance Basica")
  - `description` (text) - Optional description
  - `level` (text) - Report level: 'campaign', 'adset', 'ad'
  - `platform` (text) - Platform: 'meta', 'google', 'tiktok'
  - `selected_fields` (text[]) - Array of selected field IDs
  - `breakdowns` (text[]) - Array of breakdown IDs
  - `filters` (jsonb) - Additional filters configuration
  - `date_preset` (text) - Default date preset
  - `sort_by` (text) - Default sort field
  - `sort_order` (text) - 'asc' or 'desc'
  - `is_default` (boolean) - If this is the default template
  - `created_at`, `updated_at` - Timestamps

  ### pixel_events
  Stores discovered pixel/conversion events from user's ad accounts:
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, FK) - Owner
  - `connection_id` (uuid, FK) - Related connection
  - `event_name` (text) - Internal event name (e.g., 'Purchase')
  - `display_name` (text) - User-friendly name (e.g., 'Compras')
  - `action_type` (text) - Meta API action_type
  - `pixel_id` (text) - Associated pixel ID
  - `is_custom` (boolean) - If it's a custom event
  - `is_enabled` (boolean) - If user wants to track this event
  - `event_count` (bigint) - Approximate event count
  - `last_seen_at` (timestamptz) - Last time event was detected

  ### extraction_history
  Logs all data extractions performed by users:
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, FK) - User who performed extraction
  - `connection_id` (uuid, FK) - Connection used
  - `template_id` (uuid, FK, nullable) - Template used (if any)
  - `template_name` (text) - Template name at time of extraction
  - `level` (text) - Report level used
  - `fields_extracted` (text[]) - Fields that were extracted
  - `breakdowns_used` (text[]) - Breakdowns applied
  - `date_start` (date) - Start of date range
  - `date_end` (date) - End of date range
  - `records_count` (integer) - Number of records extracted
  - `status` (text) - 'pending', 'running', 'completed', 'failed'
  - `error_message` (text) - Error details if failed
  - `started_at` (timestamptz) - When extraction started
  - `completed_at` (timestamptz) - When extraction finished
  - `duration_ms` (integer) - Duration in milliseconds

  ## 2. Security
  - Enable RLS on all tables
  - Users can only access their own data

  ## 3. Indexes
  - Optimized indexes for common query patterns
*/

-- ============================================
-- Table: report_templates
-- ============================================
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  level text NOT NULL DEFAULT 'campaign' CHECK (level IN ('campaign', 'adset', 'ad')),
  platform text NOT NULL DEFAULT 'meta' CHECK (platform IN ('meta', 'google', 'tiktok')),
  selected_fields text[] NOT NULL DEFAULT '{}',
  breakdowns text[] NOT NULL DEFAULT '{}',
  filters jsonb NOT NULL DEFAULT '{}',
  date_preset text DEFAULT 'last_30_days',
  sort_by text DEFAULT 'spend',
  sort_order text DEFAULT 'desc' CHECK (sort_order IN ('asc', 'desc')),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_templates
CREATE POLICY "Users can view own templates"
  ON report_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates"
  ON report_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON report_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON report_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for report_templates
CREATE INDEX IF NOT EXISTS idx_report_templates_user_id ON report_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_platform ON report_templates(platform);
CREATE INDEX IF NOT EXISTS idx_report_templates_is_default ON report_templates(user_id, is_default) WHERE is_default = true;

-- ============================================
-- Table: pixel_events
-- ============================================
CREATE TABLE IF NOT EXISTS pixel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES data_connections(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  display_name text NOT NULL,
  action_type text NOT NULL,
  pixel_id text,
  is_custom boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT true,
  event_count bigint DEFAULT 0,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, connection_id, action_type)
);

-- Enable RLS
ALTER TABLE pixel_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pixel_events
CREATE POLICY "Users can view own pixel events"
  ON pixel_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pixel events"
  ON pixel_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pixel events"
  ON pixel_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pixel events"
  ON pixel_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for pixel_events
CREATE INDEX IF NOT EXISTS idx_pixel_events_user_id ON pixel_events(user_id);
CREATE INDEX IF NOT EXISTS idx_pixel_events_connection_id ON pixel_events(connection_id);
CREATE INDEX IF NOT EXISTS idx_pixel_events_action_type ON pixel_events(action_type);
CREATE INDEX IF NOT EXISTS idx_pixel_events_is_enabled ON pixel_events(user_id, is_enabled) WHERE is_enabled = true;

-- ============================================
-- Table: extraction_history
-- ============================================
CREATE TABLE IF NOT EXISTS extraction_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES data_connections(id) ON DELETE CASCADE,
  template_id uuid REFERENCES report_templates(id) ON DELETE SET NULL,
  template_name text,
  level text NOT NULL DEFAULT 'campaign' CHECK (level IN ('campaign', 'adset', 'ad')),
  fields_extracted text[] NOT NULL DEFAULT '{}',
  breakdowns_used text[] NOT NULL DEFAULT '{}',
  conversions_included text[] NOT NULL DEFAULT '{}',
  date_start date NOT NULL,
  date_end date NOT NULL,
  records_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  export_format text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE extraction_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for extraction_history
CREATE POLICY "Users can view own extraction history"
  ON extraction_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own extraction history"
  ON extraction_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own extraction history"
  ON extraction_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own extraction history"
  ON extraction_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for extraction_history
CREATE INDEX IF NOT EXISTS idx_extraction_history_user_id ON extraction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_extraction_history_connection_id ON extraction_history(connection_id);
CREATE INDEX IF NOT EXISTS idx_extraction_history_status ON extraction_history(status);
CREATE INDEX IF NOT EXISTS idx_extraction_history_created_at ON extraction_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extraction_history_user_recent ON extraction_history(user_id, created_at DESC);

-- ============================================
-- Trigger: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to report_templates
DROP TRIGGER IF EXISTS update_report_templates_updated_at ON report_templates;
CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to pixel_events
DROP TRIGGER IF EXISTS update_pixel_events_updated_at ON pixel_events;
CREATE TRIGGER update_pixel_events_updated_at
  BEFORE UPDATE ON pixel_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Insert default templates for new users
-- ============================================
-- Note: These will be inserted via application code when user first accesses the feature
