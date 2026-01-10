/*
  # Create Setup Progress Tracking Table

  1. New Tables
    - `setup_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `workspace_id` (uuid, references workspaces)
      - `steps_completed` (jsonb array) - tracks which steps are done
      - `setup_completed` (boolean) - indicates if full setup is done
      - `completed_at` (timestamptz) - when setup was completed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `setup_progress` table
    - Add policy for users to read/write their own setup progress
  
  3. Indexes
    - Index on user_id for fast lookups
    - Index on workspace_id for workspace-level queries
*/

-- Create setup_progress table
CREATE TABLE IF NOT EXISTS setup_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  steps_completed jsonb DEFAULT '[]'::jsonb,
  setup_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_setup_progress_user_id ON setup_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_setup_progress_workspace_id ON setup_progress(workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_setup_progress_user_workspace ON setup_progress(user_id, workspace_id);

-- Enable RLS
ALTER TABLE setup_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own setup progress
CREATE POLICY "Users can view own setup progress"
  ON setup_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own setup progress
CREATE POLICY "Users can create own setup progress"
  ON setup_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own setup progress
CREATE POLICY "Users can update own setup progress"
  ON setup_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own setup progress
CREATE POLICY "Users can delete own setup progress"
  ON setup_progress
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_setup_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on every update
CREATE TRIGGER setup_progress_updated_at
  BEFORE UPDATE ON setup_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_setup_progress_updated_at();