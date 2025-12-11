/*
  # Add Client ID to Data Tables
  
  ## Overview
  This migration adds client_id columns to all campaign-related data tables to enable
  client-based data isolation and filtering. This allows proper multi-client support
  where each client's campaigns and metrics are kept separate.
  
  ## 1. Schema Changes
  
  ### Add client_id to:
  - `data_connections` - Links connections to clients
  - `campaigns` - Assigns campaigns to clients
  - `ad_sets` - Assigns ad sets to clients (inherits from campaign)
  - `ads` - Assigns ads to clients (inherits from ad set)
  - `ad_metrics` - Links metrics to clients (for faster queries)
  
  ## 2. Data Migration
  - Migrate existing records to default client for each user
  - Ensure referential integrity
  
  ## 3. Indexes
  - Add indexes on client_id for all tables
  - Add composite indexes for common query patterns
  
  ## 4. Security
  - Update RLS policies to filter by client ownership
*/

-- Add client_id to data_connections table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'data_connections' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE data_connections ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add client_id to campaigns table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaigns' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add client_id to ad_sets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ad_sets' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add client_id to ads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ads' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE ads ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add client_id to ad_metrics table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ad_metrics' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Migrate existing data_connections to default client
UPDATE data_connections dc
SET client_id = (
  SELECT c.id 
  FROM clients c 
  WHERE c.user_id = dc.user_id 
  LIMIT 1
)
WHERE client_id IS NULL;

-- Migrate existing campaigns to default client via their connection
UPDATE campaigns c
SET client_id = (
  SELECT dc.client_id 
  FROM data_connections dc 
  WHERE dc.id = c.connection_id 
  LIMIT 1
)
WHERE client_id IS NULL;

-- Migrate existing ad_sets to client via their campaign
UPDATE ad_sets ads
SET client_id = (
  SELECT c.client_id 
  FROM campaigns c 
  WHERE c.id = ads.campaign_id 
  LIMIT 1
)
WHERE client_id IS NULL;

-- Migrate existing ads to client via their ad_set
UPDATE ads a
SET client_id = (
  SELECT ads.client_id 
  FROM ad_sets ads 
  WHERE ads.id = a.ad_set_id 
  LIMIT 1
)
WHERE client_id IS NULL;

-- Migrate existing ad_metrics to client via their campaign
UPDATE ad_metrics am
SET client_id = (
  SELECT c.client_id 
  FROM campaigns c 
  WHERE c.id = am.campaign_id 
  LIMIT 1
)
WHERE client_id IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_connections_client_id ON data_connections(client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_client_id ON ad_sets(client_id);
CREATE INDEX IF NOT EXISTS idx_ads_client_id ON ads(client_id);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_client_id ON ad_metrics(client_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_campaigns_client_connection ON campaigns(client_id, connection_id);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_client_date ON ad_metrics(client_id, date DESC);

-- Update RLS policies for data_connections
DROP POLICY IF EXISTS "Users can view own connections" ON data_connections;
CREATE POLICY "Users can view own connections"
  ON data_connections
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = data_connections.client_id
      AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own connections" ON data_connections;
CREATE POLICY "Users can insert own connections"
  ON data_connections
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

DROP POLICY IF EXISTS "Users can update own connections" ON data_connections;
CREATE POLICY "Users can update own connections"
  ON data_connections
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
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

-- Update RLS policies for campaigns
DROP POLICY IF EXISTS "Users can view campaigns" ON campaigns;
CREATE POLICY "Users can view campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM data_connections dc
      WHERE dc.id = campaigns.connection_id
      AND dc.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = campaigns.client_id
      AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert campaigns" ON campaigns;
CREATE POLICY "Users can insert campaigns"
  ON campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM data_connections dc
      WHERE dc.id = campaigns.connection_id
      AND dc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update campaigns" ON campaigns;
CREATE POLICY "Users can update campaigns"
  ON campaigns
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM data_connections dc
      WHERE dc.id = campaigns.connection_id
      AND dc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM data_connections dc
      WHERE dc.id = campaigns.connection_id
      AND dc.user_id = auth.uid()
    )
  );

-- Update RLS policies for ad_metrics
DROP POLICY IF EXISTS "Users can view ad_metrics" ON ad_metrics;
CREATE POLICY "Users can view ad_metrics"
  ON ad_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN data_connections dc ON dc.id = c.connection_id
      WHERE c.id = ad_metrics.campaign_id
      AND dc.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM clients cl
      WHERE cl.id = ad_metrics.client_id
      AND cl.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert ad_metrics" ON ad_metrics;
CREATE POLICY "Users can insert ad_metrics"
  ON ad_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN data_connections dc ON dc.id = c.connection_id
      WHERE c.id = ad_metrics.campaign_id
      AND dc.user_id = auth.uid()
    )
  );