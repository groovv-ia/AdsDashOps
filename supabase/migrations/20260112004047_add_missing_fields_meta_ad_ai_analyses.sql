/*
  # Adiciona campos faltantes na tabela meta_ad_ai_analyses

  ## Mudanças
  
  1. Novos Campos
    - `performance_correlation` (jsonb) - Correlação entre elementos do criativo e performance
    - `ab_test_suggestions` (jsonb array) - Sugestões de testes A/B
    - `competitive_analysis` (text) - Análise competitiva
    - `audience_insights` (text) - Insights sobre o público-alvo
    - `strategic_recommendations` (text) - Recomendações estratégicas de alto nível

  ## Notas
  - Adiciona campos que a IA gera mas não estavam sendo salvos
  - Usa JSONB para estruturas complexas (performance_correlation, ab_test_suggestions)
  - Usa TEXT para análises narrativas (competitive_analysis, audience_insights, strategic_recommendations)
  - Todos os campos são opcionais para manter compatibilidade
*/

-- Adiciona campo de correlação com performance (análise detalhada de como elementos do criativo impactam métricas)
ALTER TABLE meta_ad_ai_analyses 
ADD COLUMN IF NOT EXISTS performance_correlation jsonb DEFAULT NULL;

-- Adiciona campo de sugestões de testes A/B (array de objetos com testes sugeridos)
ALTER TABLE meta_ad_ai_analyses 
ADD COLUMN IF NOT EXISTS ab_test_suggestions jsonb DEFAULT '[]'::jsonb;

-- Adiciona campo de análise competitiva (texto narrativo)
ALTER TABLE meta_ad_ai_analyses 
ADD COLUMN IF NOT EXISTS competitive_analysis text DEFAULT NULL;

-- Adiciona campo de insights sobre público-alvo (texto narrativo)
ALTER TABLE meta_ad_ai_analyses 
ADD COLUMN IF NOT EXISTS audience_insights text DEFAULT NULL;

-- Adiciona campo de recomendações estratégicas (texto narrativo)
ALTER TABLE meta_ad_ai_analyses 
ADD COLUMN IF NOT EXISTS strategic_recommendations text DEFAULT NULL;

-- Adiciona índice para buscas por análises com performance correlation
CREATE INDEX IF NOT EXISTS idx_meta_ad_ai_analyses_has_performance 
  ON meta_ad_ai_analyses((performance_correlation IS NOT NULL))
  WHERE performance_correlation IS NOT NULL;