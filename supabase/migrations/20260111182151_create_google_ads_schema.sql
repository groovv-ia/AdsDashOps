/*
  # Google Ads Integration Schema
  
  1. New Tables
    - `google_connections` - Stores Google Ads connection configuration per workspace
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, references workspaces)
      - `developer_token` (text, encrypted) - Google Ads API Developer Token
      - `customer_id` (text) - Main MCC or Customer ID
      - `login_customer_id` (text, optional) - Login customer ID for MCC access
      - `status` (text) - Connection status: active, inactive, error
      - `last_validated_at` (timestamptz) - Last successful validation
      - `error_message` (text) - Last error message if any
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `google_ad_accounts` - Google Ads accounts linked to workspace
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, references workspaces)
      - `connection_id` (uuid, references google_connections)
      - `customer_id` (text) - Google Ads Customer ID
      - `name` (text) - Account name
      - `currency_code` (text) - Account currency
      - `timezone` (text) - Account timezone
      - `status` (text) - Account status
      - `is_manager` (boolean) - Whether it's an MCC account
      - `is_selected` (boolean) - Whether selected for sync
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `google_sync_jobs` - Synchronization job history
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, references workspaces)
      - `account_id` (uuid, references google_ad_accounts)
      - `status` (text) - pending, running, completed, failed
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `progress` (integer) - Progress percentage 0-100
      - `current_phase` (text) - Current sync phase
      - `items_processed` (integer) - Number of items processed
      - `items_total` (integer) - Total items to process
      - `error_message` (text)
      - `sync_type` (text) - full, incremental
      - `date_range_start` (date)
      - `date_range_end` (date)
      - `created_at` (timestamptz)
    
    - `google_insights_daily` - Daily metrics from Google Ads
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, references workspaces)
      - `account_id` (uuid, references google_ad_accounts)
      - `customer_id` (text) - Google Ads Customer ID
      - `campaign_id` (text)
      - `campaign_name` (text)
      - `ad_group_id` (text)
      - `ad_group_name` (text)
      - `ad_id` (text)
      - `date` (date) - Metrics date
      - `impressions` (bigint)
      - `clicks` (bigint)
      - `cost` (numeric) - Cost in micros converted to decimal
      - `conversions` (numeric)
      - `conversion_value` (numeric)
      - `ctr` (numeric) - Click-through rate
      - `cpc` (numeric) - Cost per click
      - `cpm` (numeric) - Cost per mille
      - `roas` (numeric) - Return on ad spend
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for workspace members to access their data
  
  3. Indexes
    - Indexes on workspace_id for all tables
    - Composite indexes for common query patterns
*/

-- ===========================================
-- Table: google_connections
-- ===========================================
CREATE TABLE IF NOT EXISTS google_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  developer_token text NOT NULL,
  customer_id text NOT NULL,
  login_customer_id text,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  last_validated_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Enable RLS
ALTER TABLE google_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_connections
CREATE POLICY "Users can view google_connections for their workspaces"
  ON google_connections FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert google_connections for their workspaces"
  ON google_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Users can update google_connections for their workspaces"
  ON google_connections FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Users can delete google_connections for their workspaces"
  ON google_connections FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Index for google_connections
CREATE INDEX IF NOT EXISTS idx_google_connections_workspace_id ON google_connections(workspace_id);

-- ===========================================
-- Table: google_ad_accounts
-- ===========================================
CREATE TABLE IF NOT EXISTS google_ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES google_connections(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  name text NOT NULL,
  currency_code text DEFAULT 'USD',
  timezone text DEFAULT 'America/Sao_Paulo',
  status text DEFAULT 'ENABLED',
  is_manager boolean DEFAULT false,
  is_selected boolean DEFAULT false,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, customer_id)
);

-- Enable RLS
ALTER TABLE google_ad_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_ad_accounts
CREATE POLICY "Users can view google_ad_accounts for their workspaces"
  ON google_ad_accounts FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert google_ad_accounts for their workspaces"
  ON google_ad_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Users can update google_ad_accounts for their workspaces"
  ON google_ad_accounts FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Users can delete google_ad_accounts for their workspaces"
  ON google_ad_accounts FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Indexes for google_ad_accounts
CREATE INDEX IF NOT EXISTS idx_google_ad_accounts_workspace_id ON google_ad_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_google_ad_accounts_connection_id ON google_ad_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_google_ad_accounts_customer_id ON google_ad_accounts(customer_id);

-- ===========================================
-- Table: google_sync_jobs
-- ===========================================
CREATE TABLE IF NOT EXISTS google_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id uuid REFERENCES google_ad_accounts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_phase text,
  items_processed integer DEFAULT 0,
  items_total integer DEFAULT 0,
  error_message text,
  sync_type text DEFAULT 'full' CHECK (sync_type IN ('full', 'incremental')),
  date_range_start date,
  date_range_end date,
  campaigns_synced integer DEFAULT 0,
  ad_groups_synced integer DEFAULT 0,
  ads_synced integer DEFAULT 0,
  metrics_synced integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE google_sync_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_sync_jobs
CREATE POLICY "Users can view google_sync_jobs for their workspaces"
  ON google_sync_jobs FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert google_sync_jobs for their workspaces"
  ON google_sync_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Users can update google_sync_jobs for their workspaces"
  ON google_sync_jobs FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Indexes for google_sync_jobs
CREATE INDEX IF NOT EXISTS idx_google_sync_jobs_workspace_id ON google_sync_jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_google_sync_jobs_account_id ON google_sync_jobs(account_id);
CREATE INDEX IF NOT EXISTS idx_google_sync_jobs_status ON google_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_google_sync_jobs_created_at ON google_sync_jobs(created_at DESC);

-- ===========================================
-- Table: google_insights_daily
-- ===========================================
CREATE TABLE IF NOT EXISTS google_insights_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id uuid REFERENCES google_ad_accounts(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  campaign_id text,
  campaign_name text,
  ad_group_id text,
  ad_group_name text,
  ad_id text,
  date date NOT NULL,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  cost numeric(18,6) DEFAULT 0,
  conversions numeric(18,6) DEFAULT 0,
  conversion_value numeric(18,6) DEFAULT 0,
  ctr numeric(10,6) DEFAULT 0,
  cpc numeric(18,6) DEFAULT 0,
  cpm numeric(18,6) DEFAULT 0,
  roas numeric(10,4) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE google_insights_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_insights_daily
CREATE POLICY "Users can view google_insights_daily for their workspaces"
  ON google_insights_daily FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert google_insights_daily for their workspaces"
  ON google_insights_daily FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Users can update google_insights_daily for their workspaces"
  ON google_insights_daily FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Users can delete google_insights_daily for their workspaces"
  ON google_insights_daily FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Indexes for google_insights_daily
CREATE INDEX IF NOT EXISTS idx_google_insights_daily_workspace_id ON google_insights_daily(workspace_id);
CREATE INDEX IF NOT EXISTS idx_google_insights_daily_account_id ON google_insights_daily(account_id);
CREATE INDEX IF NOT EXISTS idx_google_insights_daily_date ON google_insights_daily(date);
CREATE INDEX IF NOT EXISTS idx_google_insights_daily_campaign_id ON google_insights_daily(campaign_id);
CREATE INDEX IF NOT EXISTS idx_google_insights_daily_composite ON google_insights_daily(workspace_id, account_id, date);

-- Unique constraint to prevent duplicate metrics
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_insights_daily_unique 
  ON google_insights_daily(workspace_id, customer_id, campaign_id, ad_group_id, COALESCE(ad_id, ''), date);

-- ===========================================
-- Function to update updated_at timestamp
-- ===========================================
CREATE OR REPLACE FUNCTION update_google_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_google_connections_updated_at ON google_connections;
CREATE TRIGGER update_google_connections_updated_at
  BEFORE UPDATE ON google_connections
  FOR EACH ROW EXECUTE FUNCTION update_google_updated_at();

DROP TRIGGER IF EXISTS update_google_ad_accounts_updated_at ON google_ad_accounts;
CREATE TRIGGER update_google_ad_accounts_updated_at
  BEFORE UPDATE ON google_ad_accounts
  FOR EACH ROW EXECUTE FUNCTION update_google_updated_at();

DROP TRIGGER IF EXISTS update_google_insights_daily_updated_at ON google_insights_daily;
CREATE TRIGGER update_google_insights_daily_updated_at
  BEFORE UPDATE ON google_insights_daily
  FOR EACH ROW EXECUTE FUNCTION update_google_updated_at();