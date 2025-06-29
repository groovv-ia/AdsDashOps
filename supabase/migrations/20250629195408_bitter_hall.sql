/*
  # Sistema de Insights com IA

  1. Novas Tabelas
    - `ai_insights` - Armazena insights gerados pela IA
    - `ai_analysis_history` - Histórico de análises realizadas
    - `ai_recommendations` - Recomendações específicas da IA

  2. Segurança
    - Habilitar RLS em todas as tabelas
    - Políticas para usuários autenticados acessarem apenas seus dados

  3. Funcionalidades
    - Armazenamento de insights de IA
    - Histórico de análises
    - Tracking de implementação de recomendações
    - Métricas de efetividade dos insights
*/

-- Tabela de insights gerados pela IA
CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campaign_id text REFERENCES campaigns(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('performance', 'optimization', 'trend', 'recommendation', 'alert')),
  title text NOT NULL,
  description text NOT NULL,
  impact text NOT NULL CHECK (impact IN ('high', 'medium', 'low')),
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  actionable boolean NOT NULL DEFAULT true,
  recommendations jsonb DEFAULT '[]',
  metrics_analyzed text[] NOT NULL,
  metadata jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'implemented', 'dismissed', 'expired')),
  implemented_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de histórico de análises
CREATE TABLE IF NOT EXISTS ai_analysis_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis_type text NOT NULL CHECK (analysis_type IN ('campaign_performance', 'portfolio_optimization', 'anomaly_detection', 'market_insights')),
  input_data jsonb NOT NULL,
  output_data jsonb NOT NULL,
  insights_generated integer DEFAULT 0,
  processing_time_ms integer,
  model_version text,
  api_cost numeric DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Tabela de recomendações específicas
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id uuid REFERENCES ai_insights(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recommendation_text text NOT NULL,
  priority integer NOT NULL DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  estimated_impact text CHECK (estimated_impact IN ('high', 'medium', 'low')),
  implementation_effort text CHECK (implementation_effort IN ('easy', 'medium', 'hard')),
  category text NOT NULL CHECK (category IN ('budget', 'targeting', 'creative', 'bidding', 'scheduling')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  implemented_at timestamptz,
  results_tracked boolean DEFAULT false,
  performance_impact jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para ai_insights
CREATE POLICY "Users can manage their own AI insights"
  ON ai_insights
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para ai_analysis_history
CREATE POLICY "Users can view their own analysis history"
  ON ai_analysis_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analysis history"
  ON ai_analysis_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para ai_recommendations
CREATE POLICY "Users can manage their own AI recommendations"
  ON ai_recommendations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_campaign_id ON ai_insights(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_status ON ai_insights(status);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_history_user_id ON ai_analysis_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_history_type ON ai_analysis_history(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_history_created_at ON ai_analysis_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_insight_id ON ai_recommendations(insight_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_status ON ai_recommendations(status);

-- Triggers para atualizar updated_at
CREATE TRIGGER update_ai_insights_updated_at
  BEFORE UPDATE ON ai_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_recommendations_updated_at
  BEFORE UPDATE ON ai_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para limpar insights expirados
CREATE OR REPLACE FUNCTION cleanup_expired_ai_insights()
RETURNS void AS $$
BEGIN
  UPDATE ai_insights 
  SET status = 'expired'
  WHERE expires_at IS NOT NULL 
    AND expires_at < now()
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Função para calcular efetividade dos insights
CREATE OR REPLACE FUNCTION calculate_insight_effectiveness(insight_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  total_recommendations integer;
  implemented_recommendations integer;
  avg_impact numeric;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    AVG(CASE 
      WHEN performance_impact->>'improvement_percentage' IS NOT NULL 
      THEN (performance_impact->>'improvement_percentage')::numeric 
      ELSE 0 
    END)
  INTO total_recommendations, implemented_recommendations, avg_impact
  FROM ai_recommendations 
  WHERE insight_id = insight_uuid;

  result := jsonb_build_object(
    'total_recommendations', total_recommendations,
    'implemented_recommendations', implemented_recommendations,
    'implementation_rate', 
      CASE 
        WHEN total_recommendations > 0 
        THEN ROUND((implemented_recommendations::numeric / total_recommendations) * 100, 2)
        ELSE 0 
      END,
    'average_impact', COALESCE(avg_impact, 0)
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;