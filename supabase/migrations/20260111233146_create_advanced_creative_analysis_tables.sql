/*
  # Tabelas para Análise Avançada de Criativos com IA

  1. Novas Tabelas
    - `carousel_analyses` - Análises completas de carrosséis
    - `carousel_slide_analyses` - Análises individuais de cada slide
    - `video_analyses` - Análises de vídeos
    - `video_frame_analyses` - Análises de frames específicos
    - `aida_copy_analyses` - Análises de copy usando framework AIDA
    - `ab_test_suggestions` - Sugestões de testes A/B geradas pela IA
    - `ab_tests_tracking` - Tracking de testes A/B implementados

  2. Security
    - Enable RLS on all tables
    - Add policies for workspace members to access their data
*/

-- Tabela de análises de carrosséis
CREATE TABLE IF NOT EXISTS carousel_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  ad_id text NOT NULL,
  meta_ad_account_id text NOT NULL,
  overall_score numeric(5,2) DEFAULT 0,
  storytelling_score numeric(5,2) DEFAULT 0,
  coherence_score numeric(5,2) DEFAULT 0,
  slide_count integer DEFAULT 0,
  analysis_data jsonb DEFAULT '{}'::jsonb,
  model_used text DEFAULT 'gpt-4o',
  tokens_used integer DEFAULT 0,
  analyzed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Tabela de análises de slides individuais
CREATE TABLE IF NOT EXISTS carousel_slide_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_analysis_id uuid NOT NULL REFERENCES carousel_analyses(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slide_number integer NOT NULL,
  image_url text,
  slide_score numeric(5,2) DEFAULT 0,
  visual_analysis jsonb DEFAULT '{}'::jsonb,
  copy_analysis jsonb DEFAULT '{}'::jsonb,
  insights jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Tabela de análises de vídeos
CREATE TABLE IF NOT EXISTS video_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  ad_id text NOT NULL,
  meta_ad_account_id text NOT NULL,
  overall_score numeric(5,2) DEFAULT 0,
  hook_score numeric(5,2) DEFAULT 0,
  retention_score numeric(5,2) DEFAULT 0,
  cta_score numeric(5,2) DEFAULT 0,
  video_duration_seconds integer DEFAULT 0,
  analysis_data jsonb DEFAULT '{}'::jsonb,
  model_used text DEFAULT 'gpt-4o',
  tokens_used integer DEFAULT 0,
  analyzed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Tabela de análises de frames de vídeo
CREATE TABLE IF NOT EXISTS video_frame_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_analysis_id uuid NOT NULL REFERENCES video_analyses(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  timestamp_seconds integer NOT NULL,
  frame_url text,
  frame_score numeric(5,2) DEFAULT 0,
  insights jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Tabela de análises de copy usando framework AIDA
CREATE TABLE IF NOT EXISTS aida_copy_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  ad_id text NOT NULL,
  meta_ad_account_id text NOT NULL,
  overall_score numeric(5,2) DEFAULT 0,
  attention_score numeric(5,2) DEFAULT 0,
  interest_score numeric(5,2) DEFAULT 0,
  desire_score numeric(5,2) DEFAULT 0,
  action_score numeric(5,2) DEFAULT 0,
  analysis_data jsonb DEFAULT '{}'::jsonb,
  model_used text DEFAULT 'gpt-4o',
  tokens_used integer DEFAULT 0,
  analyzed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Tabela de sugestões de testes A/B
CREATE TABLE IF NOT EXISTS ab_test_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  ad_id text NOT NULL,
  meta_ad_account_id text NOT NULL,
  test_type text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  hypothesis text NOT NULL,
  variant_description text NOT NULL,
  what_to_change text NOT NULL,
  expected_outcome text NOT NULL,
  expected_impact_percentage text,
  metrics_to_track jsonb DEFAULT '[]'::jsonb,
  implementation_difficulty text DEFAULT 'medium',
  status text DEFAULT 'suggested',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de tracking de testes A/B
CREATE TABLE IF NOT EXISTS ab_tests_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_suggestion_id uuid NOT NULL REFERENCES ab_test_suggestions(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  implementation_date date,
  variant_ad_id text,
  test_start_date date,
  test_end_date date,
  control_metrics jsonb DEFAULT '{}'::jsonb,
  variant_metrics jsonb DEFAULT '{}'::jsonb,
  result_data jsonb DEFAULT '{}'::jsonb,
  conclusion text,
  winner text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_carousel_analyses_workspace ON carousel_analyses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_carousel_analyses_ad ON carousel_analyses(ad_id);
CREATE INDEX IF NOT EXISTS idx_carousel_slide_analyses_carousel ON carousel_slide_analyses(carousel_analysis_id);
CREATE INDEX IF NOT EXISTS idx_video_analyses_workspace ON video_analyses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_video_analyses_ad ON video_analyses(ad_id);
CREATE INDEX IF NOT EXISTS idx_video_frame_analyses_video ON video_frame_analyses(video_analysis_id);
CREATE INDEX IF NOT EXISTS idx_aida_copy_analyses_workspace ON aida_copy_analyses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_aida_copy_analyses_ad ON aida_copy_analyses(ad_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_suggestions_workspace ON ab_test_suggestions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_suggestions_ad ON ab_test_suggestions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_suggestions_status ON ab_test_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_tracking_suggestion ON ab_tests_tracking(ab_suggestion_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_tracking_workspace ON ab_tests_tracking(workspace_id);

-- Enable Row Level Security
ALTER TABLE carousel_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_slide_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_frame_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE aida_copy_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests_tracking ENABLE ROW LEVEL SECURITY;

-- Policies para carousel_analyses
CREATE POLICY "Users can view carousel analyses in their workspace"
  ON carousel_analyses FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert carousel analyses in their workspace"
  ON carousel_analyses FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update carousel analyses in their workspace"
  ON carousel_analyses FOR UPDATE
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

CREATE POLICY "Users can delete carousel analyses in their workspace"
  ON carousel_analyses FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policies para carousel_slide_analyses
CREATE POLICY "Users can view carousel slide analyses in their workspace"
  ON carousel_slide_analyses FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert carousel slide analyses in their workspace"
  ON carousel_slide_analyses FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policies para video_analyses
CREATE POLICY "Users can view video analyses in their workspace"
  ON video_analyses FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert video analyses in their workspace"
  ON video_analyses FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update video analyses in their workspace"
  ON video_analyses FOR UPDATE
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

CREATE POLICY "Users can delete video analyses in their workspace"
  ON video_analyses FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policies para video_frame_analyses
CREATE POLICY "Users can view video frame analyses in their workspace"
  ON video_frame_analyses FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert video frame analyses in their workspace"
  ON video_frame_analyses FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policies para aida_copy_analyses
CREATE POLICY "Users can view AIDA analyses in their workspace"
  ON aida_copy_analyses FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert AIDA analyses in their workspace"
  ON aida_copy_analyses FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update AIDA analyses in their workspace"
  ON aida_copy_analyses FOR UPDATE
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

CREATE POLICY "Users can delete AIDA analyses in their workspace"
  ON aida_copy_analyses FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policies para ab_test_suggestions
CREATE POLICY "Users can view AB test suggestions in their workspace"
  ON ab_test_suggestions FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert AB test suggestions in their workspace"
  ON ab_test_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update AB test suggestions in their workspace"
  ON ab_test_suggestions FOR UPDATE
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

CREATE POLICY "Users can delete AB test suggestions in their workspace"
  ON ab_test_suggestions FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policies para ab_tests_tracking
CREATE POLICY "Users can view AB tests tracking in their workspace"
  ON ab_tests_tracking FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert AB tests tracking in their workspace"
  ON ab_tests_tracking FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update AB tests tracking in their workspace"
  ON ab_tests_tracking FOR UPDATE
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

CREATE POLICY "Users can delete AB tests tracking in their workspace"
  ON ab_tests_tracking FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
