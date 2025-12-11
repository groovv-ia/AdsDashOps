/*
  # Create Sync Logs Table (Fixed)
  
  ## Overview
  This migration creates a comprehensive sync logging system to track all data synchronization
  operations with external advertising platforms (Meta, Google Ads, TikTok, etc.).
  
  ## 1. New Tables
  
  ### sync_logs
  Tracks each sync operation with detailed status and metrics
  - `id` (uuid, primary key) - Unique identifier for the sync operation
  - `user_id` (uuid, foreign key) - User who owns this sync
  - `client_id` (uuid, foreign key) - Client associated with this sync
  - `connection_id` (uuid, foreign key) - Data connection used for sync
  - `oauth_token_id` (uuid, foreign key) - OAuth token used
  - `platform` (text) - Platform name: 'meta', 'google', 'tiktok'
  - `account_id` (text) - External platform account ID
  - `account_name` (text) - Display name of the account
  - `sync_type` (text) - Type of sync: 'manual', 'scheduled', 'automatic'
  - `status` (text) - Status: 'pending', 'in_progress', 'completed', 'failed', 'partial'
  - `started_at` (timestamptz) - When the sync started
  - `completed_at` (timestamptz) - When the sync finished
  - `campaigns_synced` (integer) - Number of campaigns processed
  - `ad_sets_synced` (integer) - Number of ad sets processed
  - `ads_synced` (integer) - Number of ads processed
  - `metrics_synced` (integer) - Number of metric records created/updated
  - `errors` (jsonb) - Array of error objects
  - `metadata` (jsonb) - Additional sync metadata
  - `created_at` (timestamptz) - Record creation timestamp
*/

-- Drop existing table if it exists (for clean migration)
DROP TABLE IF EXISTS sync_logs CASCADE;

-- Create sync_logs table
CREATE TABLE sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES data_connections(id) ON DELETE SET NULL,
  oauth_token_id uuid REFERENCES oauth_tokens(id) ON DELETE SET NULL,
  platform text NOT NULL,
  account_id text,
  account_name text,
  sync_type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  campaigns_synced integer DEFAULT 0,
  ad_sets_synced integer DEFAULT 0,
  ads_synced integer DEFAULT 0,
  metrics_synced integer DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Constraints
  CONSTRAINT sync_logs_platform_check CHECK (platform IN ('meta', 'google', 'tiktok', 'other')),
  CONSTRAINT sync_logs_sync_type_check CHECK (sync_type IN ('manual', 'scheduled', 'automatic')),
  CONSTRAINT sync_logs_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'partial')),
  CONSTRAINT sync_logs_counts_positive CHECK (
    campaigns_synced >= 0 AND 
    ad_sets_synced >= 0 AND 
    ads_synced >= 0 AND 
    metrics_synced >= 0
  )
);

-- Create indexes for performance
CREATE INDEX idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX idx_sync_logs_client_id ON sync_logs(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_sync_logs_connection_id ON sync_logs(connection_id) WHERE connection_id IS NOT NULL;
CREATE INDEX idx_sync_logs_oauth_token_id ON sync_logs(oauth_token_id) WHERE oauth_token_id IS NOT NULL;
CREATE INDEX idx_sync_logs_platform ON sync_logs(platform);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_started_at ON sync_logs(started_at DESC);
CREATE INDEX idx_sync_logs_user_status ON sync_logs(user_id, status);
CREATE INDEX idx_sync_logs_client_status ON sync_logs(client_id, status) WHERE client_id IS NOT NULL;
CREATE INDEX idx_sync_logs_user_platform_date ON sync_logs(user_id, platform, started_at DESC);

-- Enable Row Level Security
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own sync logs"
  ON sync_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = sync_logs.client_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own sync logs"
  ON sync_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      client_id IS NULL
      OR EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_id
        AND c.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own sync logs"
  ON sync_logs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sync logs"
  ON sync_logs
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());