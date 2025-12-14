/*
  # Criacao da tabela meta_metrics_ai_analyses

  1. Nova Tabela
    - `meta_metrics_ai_analyses`
      - `id` (uuid, primary key) - Identificador unico da analise
      - `workspace_id` (uuid, foreign key) - Referencia ao workspace do usuario
      - `entity_id` (text) - ID da entidade analisada (ad, adset, campaign)
      - `entity_name` (text) - Nome da entidade para exibicao
      - `entity_level` (text) - Nivel da entidade: ad, adset, campaign, account
      - `analysis_period` (jsonb) - Periodo analisado com start_date e end_date
      - `performance_scores` (jsonb) - Scores de performance (overall, efficiency, cost, etc)
      - `executive_summary` (text) - Resumo executivo da analise
      - `overall_diagnosis` (text) - Diagnostico geral da performance
      - `trends` (jsonb) - Array de tendencias identificadas
      - `anomalies` (jsonb) - Array de anomalias detectadas
      - `benchmark_comparisons` (jsonb) - Comparacoes com benchmarks
      - `insights` (jsonb) - Array de insights detalhados
      - `recommendations` (jsonb) - Array de recomendacoes de otimizacao
      - `short_term_forecast` (text) - Previsao de curto prazo
      - `priority_areas` (jsonb) - Array de areas de atencao prioritaria
      - `model_used` (text) - Modelo de IA utilizado
      - `tokens_used` (integer) - Tokens consumidos na analise
      - `analyzed_at` (timestamptz) - Data/hora da analise
      - `created_at` (timestamptz) - Data de criacao do registro

  2. Security
    - Habilita RLS na tabela
    - Cria politica para usuarios autenticados lerem apenas dados do proprio workspace
    - Cria politica para usuarios autenticados inserirem apenas no proprio workspace
    - Cria politica para usuarios autenticados deletarem apenas do proprio workspace

  3. Indices
    - Indice em entity_id para buscas rapidas
    - Indice em workspace_id para filtragem por workspace
    - Indice em analyzed_at para ordenacao por data
    - Indice composto em entity_id + entity_level para consultas especificas
*/

-- Cria a tabela de analises de metricas com IA
CREATE TABLE IF NOT EXISTS meta_metrics_ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_id text NOT NULL,
  entity_name text NOT NULL,
  entity_level text NOT NULL CHECK (entity_level IN ('ad', 'adset', 'campaign', 'account')),
  analysis_period jsonb NOT NULL DEFAULT '{}',
  performance_scores jsonb NOT NULL DEFAULT '{}',
  executive_summary text NOT NULL DEFAULT '',
  overall_diagnosis text NOT NULL DEFAULT '',
  trends jsonb NOT NULL DEFAULT '[]',
  anomalies jsonb NOT NULL DEFAULT '[]',
  benchmark_comparisons jsonb NOT NULL DEFAULT '[]',
  insights jsonb NOT NULL DEFAULT '[]',
  recommendations jsonb NOT NULL DEFAULT '[]',
  short_term_forecast text,
  priority_areas jsonb NOT NULL DEFAULT '[]',
  model_used text NOT NULL DEFAULT 'gpt-4o',
  tokens_used integer NOT NULL DEFAULT 0,
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilita Row Level Security
ALTER TABLE meta_metrics_ai_analyses ENABLE ROW LEVEL SECURITY;

-- Politica para SELECT: usuarios podem ver apenas analises do proprio workspace
CREATE POLICY "Users can view own workspace metrics analyses"
  ON meta_metrics_ai_analyses
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Politica para INSERT: usuarios podem inserir apenas no proprio workspace
CREATE POLICY "Users can insert metrics analyses in own workspace"
  ON meta_metrics_ai_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Politica para DELETE: usuarios podem deletar apenas do proprio workspace
CREATE POLICY "Users can delete own workspace metrics analyses"
  ON meta_metrics_ai_analyses
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Indices para performance de consultas
CREATE INDEX IF NOT EXISTS idx_meta_metrics_ai_analyses_entity_id
  ON meta_metrics_ai_analyses(entity_id);

CREATE INDEX IF NOT EXISTS idx_meta_metrics_ai_analyses_workspace_id
  ON meta_metrics_ai_analyses(workspace_id);

CREATE INDEX IF NOT EXISTS idx_meta_metrics_ai_analyses_analyzed_at
  ON meta_metrics_ai_analyses(analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_meta_metrics_ai_analyses_entity_level
  ON meta_metrics_ai_analyses(entity_id, entity_level);

-- Comentarios descritivos na tabela
COMMENT ON TABLE meta_metrics_ai_analyses IS 'Armazena analises de metricas de campanhas/anuncios geradas por IA';
COMMENT ON COLUMN meta_metrics_ai_analyses.entity_level IS 'Nivel da entidade: ad (anuncio), adset (conjunto), campaign (campanha), account (conta)';
COMMENT ON COLUMN meta_metrics_ai_analyses.performance_scores IS 'Scores de performance: overall, efficiency, cost, reach, conversion, trend';
COMMENT ON COLUMN meta_metrics_ai_analyses.trends IS 'Array de tendencias identificadas com direcao, percentual e interpretacao';
COMMENT ON COLUMN meta_metrics_ai_analyses.anomalies IS 'Array de anomalias detectadas com severidade e acoes recomendadas';
COMMENT ON COLUMN meta_metrics_ai_analyses.insights IS 'Array de insights detalhados com tipo, impacto e recomendacoes';
COMMENT ON COLUMN meta_metrics_ai_analyses.recommendations IS 'Array de recomendacoes de otimizacao priorizadas';
