/*
  # Adicionar Constraint UNIQUE para google_insights_daily

  1. Alteracoes
    - Adiciona constraint UNIQUE na combinacao de campos usada no upsert:
      - workspace_id
      - customer_id
      - campaign_id
      - ad_group_id (nullable)
      - ad_id (nullable)
      - keyword_id (nullable)
      - date
    - Isso permite que o upsert na edge function funcione corretamente

  2. Nota
    - Usamos COALESCE para lidar com valores NULL nos campos opcionais
    - O indice unico criado permite identificar metricas duplicadas
*/

-- Remove constraint antiga se existir
ALTER TABLE google_insights_daily
DROP CONSTRAINT IF EXISTS google_insights_daily_unique_metric;

-- Cria indice unico que trata NULLs corretamente usando COALESCE
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_insights_daily_unique_metric
ON google_insights_daily (
  workspace_id,
  customer_id,
  campaign_id,
  COALESCE(ad_group_id, ''),
  COALESCE(ad_id, ''),
  COALESCE(keyword_id, ''),
  date
);

-- Constraint alternativa usando NULLS NOT DISTINCT (PostgreSQL 15+)
-- Se a versao do Postgres suportar, isso e mais limpo
DO $$
BEGIN
  -- Tenta criar constraint com NULLS NOT DISTINCT
  BEGIN
    ALTER TABLE google_insights_daily
    ADD CONSTRAINT google_insights_daily_unique_metric
    UNIQUE NULLS NOT DISTINCT (workspace_id, customer_id, campaign_id, ad_group_id, ad_id, keyword_id, date);
  EXCEPTION WHEN others THEN
    -- Se falhar (versao antiga), ignora pois ja temos o indice acima
    RAISE NOTICE 'NULLS NOT DISTINCT not supported, using index instead';
  END;
END $$;