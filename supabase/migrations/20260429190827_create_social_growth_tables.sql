/*
  # Create Social Growth Metrics Tables

  ## Summary
  Creates a complete schema to track social media growth indicators for Instagram and Facebook
  pages connected to workspaces.

  ## New Tables

  ### social_page_connections
  Stores linked Facebook Pages and Instagram Business accounts per workspace/client.
  - id (uuid, PK)
  - workspace_id (uuid, FK workspaces)
  - client_id (uuid, nullable FK clients)
  - platform (text) - 'instagram' | 'facebook'
  - page_id (text) - Facebook Page ID or Instagram Account ID
  - page_name (text) - Display name
  - instagram_account_id (text, nullable) - Instagram Business Account ID when platform=facebook
  - instagram_username (text, nullable)
  - access_token_encrypted (text) - Encrypted token for API calls
  - is_active (boolean) - Whether this connection should be synced
  - last_synced_at (timestamptz, nullable)
  - created_at / updated_at (timestamptz)

  ### social_growth_metrics
  Daily time-series metrics fetched from Graph API.
  - id (uuid, PK)
  - workspace_id (uuid, FK)
  - client_id (uuid, nullable)
  - platform (text)
  - account_id (text) - page_id or instagram_account_id
  - date (date)
  - followers_count (bigint)
  - following_count (bigint)
  - posts_count (bigint)
  - reach (bigint)
  - impressions (bigint)
  - profile_views (bigint)
  - website_clicks (bigint)
  - likes (bigint)
  - comments (bigint)
  - shares (bigint)
  - saves (bigint)
  - engagement_rate (numeric)
  - raw_json (jsonb) - Raw API response for future use
  - created_at (timestamptz)
  - UNIQUE(workspace_id, platform, account_id, date)

  ### social_growth_goals
  Growth goals per account, can be AI-suggested or manually created.
  - id (uuid, PK)
  - workspace_id (uuid, FK)
  - client_id (uuid, nullable)
  - platform (text)
  - account_id (text)
  - metric_name (text) - e.g. 'followers_count', 'engagement_rate'
  - current_value (numeric)
  - target_value (numeric)
  - target_date (date)
  - ai_suggested (boolean) - Whether suggested by AI
  - ai_reasoning (text, nullable) - AI explanation for the goal
  - status (text) - 'active' | 'achieved' | 'missed'
  - created_at / updated_at (timestamptz)

  ### social_ai_insights
  Cached AI analyses to avoid redundant API calls.
  - id (uuid, PK)
  - workspace_id (uuid, FK)
  - account_id (text)
  - platform (text)
  - period_start (date)
  - period_end (date)
  - analysis_json (jsonb) - Full AI response
  - model_used (text)
  - tokens_used (int)
  - created_at (timestamptz)

  ### social_sync_jobs
  Log of each sync execution for monitoring.
  - id (uuid, PK)
  - workspace_id (uuid, FK)
  - account_id (text)
  - platform (text)
  - started_at (timestamptz)
  - ended_at (timestamptz, nullable)
  - status (text) - 'running' | 'success' | 'error'
  - records_synced (int)
  - error_message (text, nullable)

  ## Security
  - RLS enabled on all tables
  - All policies scope data to authenticated users via workspace membership
  - No public access policies

  ## Notes
  1. All tables use workspace_id for multi-tenant isolation
  2. UNIQUE constraint on metrics prevents duplicate daily records (upsert-safe)
  3. access_token_encrypted reuses existing encrypt_token/decrypt_token RPC functions
  4. engagement_rate stored as numeric(10,6) for precision
*/

-- ============================================================
-- Table: social_page_connections
-- ============================================================
CREATE TABLE IF NOT EXISTS social_page_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (platform IN ('instagram', 'facebook')),
  page_id text NOT NULL,
  page_name text NOT NULL DEFAULT '',
  instagram_account_id text,
  instagram_username text,
  access_token_encrypted text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, platform, page_id)
);

ALTER TABLE social_page_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace social connections"
  ON social_page_connections FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own workspace social connections"
  ON social_page_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own workspace social connections"
  ON social_page_connections FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own workspace social connections"
  ON social_page_connections FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- Table: social_growth_metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS social_growth_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (platform IN ('instagram', 'facebook')),
  account_id text NOT NULL,
  date date NOT NULL,
  followers_count bigint NOT NULL DEFAULT 0,
  following_count bigint NOT NULL DEFAULT 0,
  posts_count bigint NOT NULL DEFAULT 0,
  reach bigint NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  profile_views bigint NOT NULL DEFAULT 0,
  website_clicks bigint NOT NULL DEFAULT 0,
  likes bigint NOT NULL DEFAULT 0,
  comments bigint NOT NULL DEFAULT 0,
  shares bigint NOT NULL DEFAULT 0,
  saves bigint NOT NULL DEFAULT 0,
  engagement_rate numeric(10,6) NOT NULL DEFAULT 0,
  raw_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, platform, account_id, date)
);

ALTER TABLE social_growth_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace social metrics"
  ON social_growth_metrics FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own workspace social metrics"
  ON social_growth_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own workspace social metrics"
  ON social_growth_metrics FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_social_growth_metrics_workspace ON social_growth_metrics (workspace_id);
CREATE INDEX IF NOT EXISTS idx_social_growth_metrics_account_date ON social_growth_metrics (account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_social_growth_metrics_platform ON social_growth_metrics (platform);

-- ============================================================
-- Table: social_growth_goals
-- ============================================================
CREATE TABLE IF NOT EXISTS social_growth_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (platform IN ('instagram', 'facebook')),
  account_id text NOT NULL,
  metric_name text NOT NULL,
  current_value numeric NOT NULL DEFAULT 0,
  target_value numeric NOT NULL DEFAULT 0,
  target_date date NOT NULL,
  ai_suggested boolean NOT NULL DEFAULT false,
  ai_reasoning text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'missed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE social_growth_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace social goals"
  ON social_growth_goals FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own workspace social goals"
  ON social_growth_goals FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own workspace social goals"
  ON social_growth_goals FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own workspace social goals"
  ON social_growth_goals FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_social_growth_goals_workspace ON social_growth_goals (workspace_id);
CREATE INDEX IF NOT EXISTS idx_social_growth_goals_account ON social_growth_goals (account_id, status);

-- ============================================================
-- Table: social_ai_insights
-- ============================================================
CREATE TABLE IF NOT EXISTS social_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('instagram', 'facebook')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  analysis_json jsonb NOT NULL DEFAULT '{}',
  model_used text NOT NULL DEFAULT '',
  tokens_used int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE social_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace social ai insights"
  ON social_ai_insights FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own workspace social ai insights"
  ON social_ai_insights FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_social_ai_insights_workspace ON social_ai_insights (workspace_id);
CREATE INDEX IF NOT EXISTS idx_social_ai_insights_account ON social_ai_insights (account_id, created_at DESC);

-- ============================================================
-- Table: social_sync_jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS social_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('instagram', 'facebook')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
  records_synced int NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE social_sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace social sync jobs"
  ON social_sync_jobs FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own workspace social sync jobs"
  ON social_sync_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own workspace social sync jobs"
  ON social_sync_jobs FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_social_sync_jobs_workspace ON social_sync_jobs (workspace_id);
