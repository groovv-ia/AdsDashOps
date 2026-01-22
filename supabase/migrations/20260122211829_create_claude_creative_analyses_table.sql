/*
  # Create Claude AI Creative Analyses Table

  1. New Tables
    - `claude_creative_analyses`
      - `id` (uuid, primary key) - Unique identifier
      - `workspace_id` (uuid, foreign key) - Reference to workspace
      - `creative_id` (uuid, foreign key) - Reference to meta_ad_creatives
      - `ad_id` (text) - Meta Ad ID for quick lookups
      - `analysis_type` (text) - Type: 'image', 'video', 'carousel'
      - `model_used` (text) - Claude model used (e.g., 'claude-3-5-sonnet-20241022')
      - `overall_score` (integer) - Overall quality score (0-100)
      - `visual_analysis` (jsonb) - Visual elements analysis
      - `copy_analysis` (jsonb) - Text/copy analysis
      - `psychological_analysis` (jsonb) - Emotional and psychological triggers
      - `first_impression` (jsonb) - First 3-second impression analysis
      - `placement_suitability` (jsonb) - Suitability for different placements
      - `aida_analysis` (jsonb) - AIDA framework analysis (Attention, Interest, Desire, Action)
      - `recommendations` (jsonb) - Array of improvement recommendations
      - `strengths` (jsonb) - Array of identified strengths
      - `weaknesses` (jsonb) - Array of identified weaknesses
      - `video_frames_analyzed` (jsonb) - For videos: timestamps and frames analyzed
      - `confidence_score` (integer) - AI confidence in analysis (0-100)
      - `processing_time_ms` (integer) - Time taken to analyze in milliseconds
      - `tokens_used` (integer) - Number of tokens consumed
      - `estimated_cost` (decimal) - Estimated cost of analysis in USD
      - `raw_response` (jsonb) - Full raw response from Claude API
      - `error_message` (text) - Error message if analysis failed
      - `analyzed_at` (timestamptz) - When analysis was performed
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `claude_creative_analyses` table
    - Add policies for authenticated users based on workspace ownership

  3. Indexes
    - Index on workspace_id for filtering
    - Index on creative_id for lookups
    - Index on ad_id for quick access
    - Index on overall_score for sorting
    - Unique constraint on (workspace_id, creative_id) to prevent duplicates

  4. Notes
    - Stores comprehensive AI analysis results from Claude 3.5 Sonnet
    - Supports image, video (with frame analysis), and carousel types
    - Includes cost tracking for analysis operations
    - Full raw response stored for debugging and re-analysis
*/

-- Create the claude_creative_analyses table
CREATE TABLE IF NOT EXISTS claude_creative_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  creative_id uuid NOT NULL REFERENCES meta_ad_creatives(id) ON DELETE CASCADE,
  ad_id text NOT NULL,
  analysis_type text NOT NULL CHECK (analysis_type IN ('image', 'video', 'carousel')),
  model_used text NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
  overall_score integer CHECK (overall_score >= 0 AND overall_score <= 100),
  visual_analysis jsonb DEFAULT '{}'::jsonb,
  copy_analysis jsonb DEFAULT '{}'::jsonb,
  psychological_analysis jsonb DEFAULT '{}'::jsonb,
  first_impression jsonb DEFAULT '{}'::jsonb,
  placement_suitability jsonb DEFAULT '{}'::jsonb,
  aida_analysis jsonb DEFAULT '{}'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  strengths jsonb DEFAULT '[]'::jsonb,
  weaknesses jsonb DEFAULT '[]'::jsonb,
  video_frames_analyzed jsonb DEFAULT '[]'::jsonb,
  confidence_score integer CHECK (confidence_score >= 0 AND confidence_score <= 100),
  processing_time_ms integer,
  tokens_used integer,
  estimated_cost decimal(10, 6),
  raw_response jsonb DEFAULT '{}'::jsonb,
  error_message text,
  analyzed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Unique constraint to prevent duplicate analyses per creative
  CONSTRAINT unique_workspace_creative_analysis UNIQUE (workspace_id, creative_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_claude_analyses_workspace_id 
  ON claude_creative_analyses(workspace_id);

CREATE INDEX IF NOT EXISTS idx_claude_analyses_creative_id 
  ON claude_creative_analyses(creative_id);

CREATE INDEX IF NOT EXISTS idx_claude_analyses_ad_id 
  ON claude_creative_analyses(ad_id);

CREATE INDEX IF NOT EXISTS idx_claude_analyses_score 
  ON claude_creative_analyses(overall_score DESC);

CREATE INDEX IF NOT EXISTS idx_claude_analyses_analyzed_at 
  ON claude_creative_analyses(analyzed_at DESC);

-- Enable Row Level Security
ALTER TABLE claude_creative_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view analyses from their workspace
CREATE POLICY "Users can view workspace creative analyses"
  ON claude_creative_analyses
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can insert analyses for their workspace
CREATE POLICY "Users can create workspace creative analyses"
  ON claude_creative_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can update analyses in their workspace
CREATE POLICY "Users can update workspace creative analyses"
  ON claude_creative_analyses
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
CREATE POLICY "Users can delete workspace creative analyses"
  ON claude_creative_analyses
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_claude_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_claude_analyses_updated_at ON claude_creative_analyses;

CREATE TRIGGER trigger_update_claude_analyses_updated_at
  BEFORE UPDATE ON claude_creative_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_claude_analyses_updated_at();

-- Comments for documentation
COMMENT ON TABLE claude_creative_analyses IS 'Stores AI analysis results from Claude 3.5 Sonnet for ad creatives';
COMMENT ON COLUMN claude_creative_analyses.analysis_type IS 'Type of creative analyzed: image, video, or carousel';
COMMENT ON COLUMN claude_creative_analyses.model_used IS 'Claude model version used for analysis';
COMMENT ON COLUMN claude_creative_analyses.overall_score IS 'Overall quality score from 0-100';
COMMENT ON COLUMN claude_creative_analyses.confidence_score IS 'AI confidence in the analysis from 0-100';
COMMENT ON COLUMN claude_creative_analyses.tokens_used IS 'Number of API tokens consumed for this analysis';
COMMENT ON COLUMN claude_creative_analyses.estimated_cost IS 'Estimated cost in USD for this analysis';
COMMENT ON COLUMN claude_creative_analyses.video_frames_analyzed IS 'For videos: array of frame timestamps and analysis';
