/*
  # Create Clients Table and Multi-Client Architecture
  
  ## Overview
  This migration establishes the foundation for multi-client support in the advertising analytics platform.
  It allows agencies and users to manage multiple client accounts with isolated data and connections.
  
  ## 1. New Tables
  
  ### clients
  Stores client profiles for organizing campaigns and connections
  - `id` (uuid, primary key) - Unique identifier for the client
  - `user_id` (uuid, foreign key) - Owner of this client profile
  - `name` (text) - Client display name (required)
  - `description` (text) - Optional notes about the client
  - `is_active` (boolean) - Whether this client is currently active
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last modification timestamp
  
  ## 2. Security
  
  ### Row Level Security (RLS)
  - Enable RLS on clients table
  - Users can only view their own clients
  - Users can only create clients for themselves
  - Users can only update their own clients
  - Users can only delete their own clients (soft delete recommended)
  
  ## 3. Indexes
  - Index on user_id for fast client lookups per user
  - Index on is_active for filtering active clients
  
  ## 4. Default Data
  - Create a default "Main Client" for existing users with data
  - This ensures backward compatibility
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Constraints
  CONSTRAINT clients_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);
CREATE INDEX IF NOT EXISTS idx_clients_user_id_active ON clients(user_id, is_active);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients table
CREATE POLICY "Users can view own clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create default "Main Client" for existing users who have connections
DO $$
DECLARE
  user_record RECORD;
  default_client_id uuid;
BEGIN
  -- Loop through users who have data_connections
  FOR user_record IN 
    SELECT DISTINCT user_id FROM data_connections
  LOOP
    -- Check if user already has a client
    IF NOT EXISTS (SELECT 1 FROM clients WHERE user_id = user_record.user_id) THEN
      -- Create default client for this user
      INSERT INTO clients (user_id, name, description, is_active)
      VALUES (
        user_record.user_id,
        'Main Client',
        'Default client created during multi-client migration',
        true
      );
    END IF;
  END LOOP;
END $$;