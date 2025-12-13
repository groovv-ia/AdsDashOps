/*
  # Adiciona colunas faltantes na tabela ad_metrics

  ## Problema Identificado
  O codigo MetaSyncService.ts extrai metricas da API Meta que nao existem na tabela ad_metrics,
  causando falha silenciosa ao tentar inserir dados.

  ## Novas Colunas Adicionadas
  1. Metricas de custo:
     - `cpm` (numeric) - Custo por mil impressoes
     - `cpp` (numeric) - Custo por ponto percentual de alcance
  
  2. Valor de conversao:
     - `conversion_value` (numeric) - Valor real das conversoes (receita)
  
  3. Cliques detalhados:
     - `inline_link_clicks` (integer) - Cliques em links dentro do anuncio
     - `cost_per_inline_link_click` (numeric) - Custo por clique em link
     - `outbound_clicks` (integer) - Cliques que levam para fora do Facebook
  
  4. Dados brutos para auditoria:
     - `actions_raw` (jsonb) - Array de acoes da API Meta
     - `action_values_raw` (jsonb) - Array de valores de acoes da API Meta

  ## Indices Adicionados
  - idx_ad_metrics_campaign_date para queries de metricas por campanha e periodo

  ## Notas Importantes
  - Todas as novas colunas tem valores default para nao quebrar dados existentes
  - Os campos JSONB permitem auditoria completa dos dados recebidos da API
*/

-- Adiciona colunas de metricas de custo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'cpm'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN cpm numeric DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'cpp'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN cpp numeric DEFAULT 0;
  END IF;
END $$;

-- Adiciona coluna de valor de conversao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'conversion_value'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN conversion_value numeric DEFAULT 0;
  END IF;
END $$;

-- Adiciona colunas de cliques detalhados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'inline_link_clicks'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN inline_link_clicks integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'cost_per_inline_link_click'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN cost_per_inline_link_click numeric DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'outbound_clicks'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN outbound_clicks integer DEFAULT 0;
  END IF;
END $$;

-- Adiciona colunas JSONB para dados brutos da API (auditoria)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'actions_raw'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN actions_raw jsonb DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'action_values_raw'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN action_values_raw jsonb DEFAULT NULL;
  END IF;
END $$;

-- Adiciona indice para consultas frequentes de metricas por campanha e data
CREATE INDEX IF NOT EXISTS idx_ad_metrics_campaign_date 
ON ad_metrics (campaign_id, date DESC);

-- Adiciona comentarios nas novas colunas para documentacao
COMMENT ON COLUMN ad_metrics.cpm IS 'Custo por mil impressoes (CPM) - valor direto da API Meta';
COMMENT ON COLUMN ad_metrics.cpp IS 'Custo por ponto percentual de alcance (CPP) - valor direto da API Meta';
COMMENT ON COLUMN ad_metrics.conversion_value IS 'Valor monetario real das conversoes (receita gerada)';
COMMENT ON COLUMN ad_metrics.inline_link_clicks IS 'Cliques em links dentro do anuncio';
COMMENT ON COLUMN ad_metrics.cost_per_inline_link_click IS 'Custo medio por clique em link';
COMMENT ON COLUMN ad_metrics.outbound_clicks IS 'Cliques que levam usuarios para fora do Facebook';
COMMENT ON COLUMN ad_metrics.actions_raw IS 'Array JSON bruto de acoes da API Meta para auditoria';
COMMENT ON COLUMN ad_metrics.action_values_raw IS 'Array JSON bruto de valores de acoes da API Meta para auditoria';
