/*
  # Add hierarchy columns to meta_insights_daily

  1. New Columns
    - `campaign_id` (text) - ID da campanha do Meta Ads
    - `adset_id` (text) - ID do conjunto de anúncios do Meta Ads
  
  2. Purpose
    - Permite consultar AdSets por campaign_id diretamente em meta_insights_daily
    - Permite consultar Ads por campaign_id ou adset_id diretamente em meta_insights_daily
    - Elimina dependência da tabela meta_entities_cache para hierarquia
  
  3. Important Notes
    - campaign_id será preenchido para todos os níveis (campaign, adset, ad)
    - adset_id será preenchido apenas para nível 'ad'
    - Índices serão criados para otimizar queries de hierarquia
*/

-- Adiciona coluna campaign_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_insights_daily' AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE meta_insights_daily ADD COLUMN campaign_id text;
  END IF;
END $$;

-- Adiciona coluna adset_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_insights_daily' AND column_name = 'adset_id'
  ) THEN
    ALTER TABLE meta_insights_daily ADD COLUMN adset_id text;
  END IF;
END $$;

-- Cria índice para consultas de AdSets por campanha
CREATE INDEX IF NOT EXISTS idx_meta_insights_daily_campaign_adsets 
  ON meta_insights_daily(workspace_id, level, campaign_id, date)
  WHERE level = 'adset';

-- Cria índice para consultas de Ads por campanha
CREATE INDEX IF NOT EXISTS idx_meta_insights_daily_campaign_ads 
  ON meta_insights_daily(workspace_id, level, campaign_id, date)
  WHERE level = 'ad';

-- Cria índice para consultas de Ads por AdSet
CREATE INDEX IF NOT EXISTS idx_meta_insights_daily_adset_ads 
  ON meta_insights_daily(workspace_id, level, adset_id, date)
  WHERE level = 'ad';
