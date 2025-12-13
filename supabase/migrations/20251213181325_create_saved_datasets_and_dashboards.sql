/*
  # Create Saved Data Sets and Dynamic Dashboard Tables
  
  ## Summary
  This migration creates the structure for dynamic dashboards with:
  - Permanent storage of extracted data sets
  - Auto-generated dashboard configurations
  - Scheduled periodic re-extractions
  
  ## 1. New Tables
  
  ### saved_data_sets
  Stores extracted data permanently for dashboard visualization
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Owner of the data set
  - `client_id` (uuid, foreign key, nullable) - Associated client
  - `connection_id` (uuid, foreign key, nullable) - Source connection
  - `name` (text) - User-friendly name for the data set
  - `description` (text, nullable) - Optional description
  - `platform` (text) - Source platform (meta, google, tiktok)
  - `extraction_config` (jsonb) - Configuration used for extraction
  - `data` (jsonb) - The actual extracted data
  - `columns_meta` (jsonb) - Metadata about columns
  - `date_range_start` (date) - Start of data range
  - `date_range_end` (date) - End of data range
  - `record_count` (integer) - Number of records
  
  ### dashboard_instances
  Stores dashboard configurations with widgets and layout
  - Auto-generated dashboards from data sets
  - Widget configurations for KPIs, charts, tables
  
  ### scheduled_extractions
  Stores scheduled periodic re-extraction jobs
  - Frequency: daily, weekly, monthly
  - Automatic data refresh
  
  ## 2. Security
  - RLS enabled on all tables
  - Users can only access their own data
*/

-- ==============================================
-- TABLE: saved_data_sets
-- Stores extracted data permanently
-- ==============================================

CREATE TABLE IF NOT EXISTS saved_data_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  connection_id uuid REFERENCES oauth_tokens(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  platform text NOT NULL,
  extraction_config jsonb NOT NULL DEFAULT '{}',
  data jsonb NOT NULL DEFAULT '[]',
  columns_meta jsonb NOT NULL DEFAULT '{}',
  date_range_start date,
  date_range_end date,
  record_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE saved_data_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own data sets"
  ON saved_data_sets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own data sets"
  ON saved_data_sets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data sets"
  ON saved_data_sets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own data sets"
  ON saved_data_sets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_data_sets_user_id ON saved_data_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_data_sets_client_id ON saved_data_sets(client_id);
CREATE INDEX IF NOT EXISTS idx_saved_data_sets_platform ON saved_data_sets(platform);
CREATE INDEX IF NOT EXISTS idx_saved_data_sets_created_at ON saved_data_sets(created_at DESC);

-- ==============================================
-- TABLE: dashboard_instances
-- Stores dashboard configurations
-- ==============================================

CREATE TABLE IF NOT EXISTS dashboard_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_set_id uuid NOT NULL REFERENCES saved_data_sets(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  auto_generated boolean NOT NULL DEFAULT true,
  layout_config jsonb NOT NULL DEFAULT '{"columns": 2, "gap": 16}',
  widgets jsonb NOT NULL DEFAULT '[]',
  filters jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE dashboard_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own dashboards"
  ON dashboard_instances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own dashboards"
  ON dashboard_instances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dashboards"
  ON dashboard_instances FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own dashboards"
  ON dashboard_instances FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_instances_user_id ON dashboard_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_instances_data_set_id ON dashboard_instances(data_set_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_instances_is_active ON dashboard_instances(is_active);
CREATE INDEX IF NOT EXISTS idx_dashboard_instances_created_at ON dashboard_instances(created_at DESC);

-- ==============================================
-- TABLE: scheduled_extractions
-- Stores scheduled periodic re-extraction jobs
-- ==============================================

CREATE TABLE IF NOT EXISTS scheduled_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_set_id uuid NOT NULL REFERENCES saved_data_sets(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES oauth_tokens(id) ON DELETE CASCADE,
  extraction_config jsonb NOT NULL DEFAULT '{}',
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  preferred_hour integer NOT NULL DEFAULT 6 CHECK (preferred_hour >= 0 AND preferred_hour <= 23),
  preferred_day integer CHECK (preferred_day >= 0 AND preferred_day <= 31),
  next_run_at timestamptz NOT NULL,
  last_run_at timestamptz,
  last_run_status text CHECK (last_run_status IN ('success', 'error')),
  last_run_error text,
  is_active boolean NOT NULL DEFAULT true,
  notify_on_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE scheduled_extractions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own schedules"
  ON scheduled_extractions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own schedules"
  ON scheduled_extractions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON scheduled_extractions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
  ON scheduled_extractions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_extractions_user_id ON scheduled_extractions(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_extractions_data_set_id ON scheduled_extractions(data_set_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_extractions_next_run ON scheduled_extractions(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_extractions_is_active ON scheduled_extractions(is_active);

-- ==============================================
-- TRIGGERS: Update updated_at timestamps
-- ==============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_saved_data_sets_updated_at ON saved_data_sets;
CREATE TRIGGER update_saved_data_sets_updated_at
  BEFORE UPDATE ON saved_data_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dashboard_instances_updated_at ON dashboard_instances;
CREATE TRIGGER update_dashboard_instances_updated_at
  BEFORE UPDATE ON dashboard_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_extractions_updated_at ON scheduled_extractions;
CREATE TRIGGER update_scheduled_extractions_updated_at
  BEFORE UPDATE ON scheduled_extractions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
