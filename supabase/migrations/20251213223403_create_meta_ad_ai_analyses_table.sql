/*
  # Create Meta Ad AI Analyses Table

  1. New Tables
    - `meta_ad_ai_analyses`
      - `id` (uuid, primary key) - Unique identifier for the analysis
      - `workspace_id` (uuid, foreign key) - Reference to workspace
      - `ad_id` (text) - Meta Ad ID being analyzed
      - `meta_ad_account_id` (text) - Meta Ad Account ID
      - `creative_score` (integer) - Score for visual/creative analysis (0-100)
      - `copy_score` (integer) - Score for copy/text analysis (0-100)
      - `overall_score` (integer) - Overall combined score (0-100)
      - `visual_analysis` (jsonb) - Detailed visual analysis results
      - `copy_analysis` (jsonb) - Detailed copy analysis results
      - `recommendations` (jsonb) - Array of improvement recommendations
      - `image_url` (text) - URL of image analyzed
      - `model_used` (text) - AI model used for analysis
      - `tokens_used` (integer) - Number of tokens consumed
      - `analyzed_at` (timestamptz) - When the analysis was performed
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on `meta_ad_ai_analyses` table
    - Add policies for authenticated users to manage their workspace analyses

  3. Indexes
    - Index on workspace_id for filtering
    - Index on ad_id for lookups
    - Composite index on (workspace_id, ad_id) for common queries
*/

-- Create the meta_ad_ai_analyses table
CREATE TABLE IF NOT EXISTS meta_ad_ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  ad_id text NOT NULL,
  meta_ad_account_id text NOT NULL,
  creative_score integer CHECK (creative_score >= 0 AND creative_score <= 100),
  copy_score integer CHECK (copy_score >= 0 AND copy_score <= 100),
  overall_score integer CHECK (overall_score >= 0 AND overall_score <= 100),
  visual_analysis jsonb DEFAULT '{}'::jsonb,
  copy_analysis jsonb DEFAULT '{}'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  image_url text,
  model_used text DEFAULT 'gpt-4-vision-preview',
  tokens_used integer DEFAULT 0,
  analyzed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_ad_ai_analyses_workspace_id 
  ON meta_ad_ai_analyses(workspace_id);

CREATE INDEX IF NOT EXISTS idx_meta_ad_ai_analyses_ad_id 
  ON meta_ad_ai_analyses(ad_id);

CREATE INDEX IF NOT EXISTS idx_meta_ad_ai_analyses_workspace_ad 
  ON meta_ad_ai_analyses(workspace_id, ad_id);

-- Enable Row Level Security
ALTER TABLE meta_ad_ai_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view analyses from their workspace
CREATE POLICY "Users can view workspace ad analyses"
  ON meta_ad_ai_analyses
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can insert analyses for their workspace
CREATE POLICY "Users can create workspace ad analyses"
  ON meta_ad_ai_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can update analyses in their workspace
CREATE POLICY "Users can update workspace ad analyses"
  ON meta_ad_ai_analyses
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can delete analyses from their workspace
CREATE POLICY "Users can delete workspace ad analyses"
  ON meta_ad_ai_analyses
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );
