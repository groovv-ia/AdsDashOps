/*
  # Update OAuth Tokens for Multi-Account Support
  
  ## Overview
  This migration enhances the oauth_tokens table to support multiple Meta ad accounts
  per connection. Each Meta Business Manager can have multiple ad accounts, and users
  should be able to connect multiple accounts simultaneously.
  
  ## 1. Schema Changes
  
  ### oauth_tokens table modifications
  - Add `client_id` (uuid, foreign key) - Links token to a specific client
  - Add `account_id` (text) - The Meta ad account ID (e.g., act_123456789)
  - Add `account_name` (text) - Display name of the Meta ad account
  - Add `is_active` (boolean) - Whether this account connection is active
  - Add `last_sync_at` (timestamptz) - Timestamp of last successful sync
  - Add `sync_frequency` (text) - Sync schedule: 'manual', 'hourly', 'daily', 'weekly'
  - Remove UNIQUE constraint on connection_id to allow multiple accounts per connection
  
  ## 2. Data Migration
  - Add client_id to existing oauth_tokens (assign to default client)
  - Set default values for new fields
  
  ## 3. Security
  - Update RLS policies to include client ownership checks
  
  ## 4. Indexes
  - Add indexes for client_id and account_id lookups
  - Add composite index for user queries
*/

-- Add new columns to oauth_tokens table
DO $$
BEGIN
  -- Add client_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'oauth_tokens' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE oauth_tokens ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
  
  -- Add account_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'oauth_tokens' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE oauth_tokens ADD COLUMN account_id text;
  END IF;
  
  -- Add account_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'oauth_tokens' AND column_name = 'account_name'
  ) THEN
    ALTER TABLE oauth_tokens ADD COLUMN account_name text;
  END IF;
  
  -- Add is_active column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'oauth_tokens' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE oauth_tokens ADD COLUMN is_active boolean DEFAULT true;
  END IF;
  
  -- Add last_sync_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'oauth_tokens' AND column_name = 'last_sync_at'
  ) THEN
    ALTER TABLE oauth_tokens ADD COLUMN last_sync_at timestamptz;
  END IF;
  
  -- Add sync_frequency column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'oauth_tokens' AND column_name = 'sync_frequency'
  ) THEN
    ALTER TABLE oauth_tokens ADD COLUMN sync_frequency text DEFAULT 'daily';
  END IF;
END $$;

-- Remove UNIQUE constraint on connection_id if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'oauth_tokens_connection_id_key'
  ) THEN
    ALTER TABLE oauth_tokens DROP CONSTRAINT oauth_tokens_connection_id_key;
  END IF;
END $$;

-- Migrate existing oauth_tokens to default client
DO $$
DECLARE
  token_record RECORD;
  default_client_id uuid;
  connection_user_id uuid;
BEGIN
  -- Loop through oauth_tokens that don't have a client_id yet
  FOR token_record IN 
    SELECT ot.id, ot.connection_id, dc.user_id
    FROM oauth_tokens ot
    LEFT JOIN data_connections dc ON dc.id = ot.connection_id
    WHERE ot.client_id IS NULL
  LOOP
    -- Find or create default client for this user
    SELECT id INTO default_client_id 
    FROM clients 
    WHERE user_id = token_record.user_id 
    LIMIT 1;
    
    -- If no client exists, create one
    IF default_client_id IS NULL AND token_record.user_id IS NOT NULL THEN
      INSERT INTO clients (user_id, name, description, is_active)
      VALUES (
        token_record.user_id,
        'Main Client',
        'Default client created during migration',
        true
      )
      RETURNING id INTO default_client_id;
    END IF;
    
    -- Update the oauth_token with client_id
    IF default_client_id IS NOT NULL THEN
      UPDATE oauth_tokens 
      SET client_id = default_client_id,
          is_active = true,
          sync_frequency = 'daily'
      WHERE id = token_record.id;
    END IF;
  END LOOP;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_client_id ON oauth_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_account_id ON oauth_tokens(account_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_is_active ON oauth_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_client_active ON oauth_tokens(client_id, is_active);

-- Add check constraint for sync_frequency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'oauth_tokens_sync_frequency_check'
  ) THEN
    ALTER TABLE oauth_tokens 
    ADD CONSTRAINT oauth_tokens_sync_frequency_check 
    CHECK (sync_frequency IN ('manual', 'hourly', 'daily', 'weekly'));
  END IF;
END $$;

-- Update RLS policies to include client ownership
DROP POLICY IF EXISTS "Users can view own tokens" ON oauth_tokens;
CREATE POLICY "Users can view own tokens"
  ON oauth_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM data_connections dc
      WHERE dc.id = oauth_tokens.connection_id
      AND dc.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = oauth_tokens.client_id
      AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own tokens" ON oauth_tokens;
CREATE POLICY "Users can insert own tokens"
  ON oauth_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM data_connections dc
      WHERE dc.id = oauth_tokens.connection_id
      AND dc.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = oauth_tokens.client_id
      AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own tokens" ON oauth_tokens;
CREATE POLICY "Users can update own tokens"
  ON oauth_tokens
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM data_connections dc
      WHERE dc.id = oauth_tokens.connection_id
      AND dc.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = oauth_tokens.client_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM data_connections dc
      WHERE dc.id = oauth_tokens.connection_id
      AND dc.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = oauth_tokens.client_id
      AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own tokens" ON oauth_tokens;
CREATE POLICY "Users can delete own tokens"
  ON oauth_tokens
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM data_connections dc
      WHERE dc.id = oauth_tokens.connection_id
      AND dc.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = oauth_tokens.client_id
      AND c.user_id = auth.uid()
    )
  );