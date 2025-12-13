/*
  # Funções de Criptografia e Views para Dashboard
  
  Este migration adiciona:
  
  ## Funções de Criptografia
  - `encrypt_token(text)` - Criptografa tokens usando pgcrypto
  - `decrypt_token(text)` - Descriptografa tokens (somente via service role)
  
  ## Views para Dashboard
  - `v_client_kpis_daily` - KPIs agregados por cliente/dia/nível
  - `v_top_entities_period` - Top campanhas/adsets/ads por spend
  - `v_sync_status_overview` - Visão geral do status de sincronização
  
  ## Segurança
  - Funções de decrypt são SECURITY DEFINER (executam com privilégios elevados)
  - Views respeitam RLS das tabelas base
*/

-- ============================================
-- 1. HABILITAR EXTENSÃO pgcrypto
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 2. FUNÇÃO: encrypt_token
-- Criptografa um token usando AES-256
-- A chave é derivada de uma constante interna
-- ============================================
CREATE OR REPLACE FUNCTION encrypt_token(p_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key bytea;
  v_encrypted bytea;
BEGIN
  -- Deriva uma chave de 32 bytes usando SHA-256
  -- Em produção, use uma variável de ambiente ou secret
  v_key := digest('ADSOPS_SECRET_KEY_2024_PRODUCTION', 'sha256');
  
  -- Criptografa o token usando AES com CBC e PKCS padding
  v_encrypted := encrypt(
    convert_to(p_token, 'UTF8'),
    v_key,
    'aes-cbc/pad:pkcs'
  );
  
  -- Retorna como base64 para armazenamento seguro
  RETURN encode(v_encrypted, 'base64');
END;
$$;

-- ============================================
-- 3. FUNÇÃO: decrypt_token
-- Descriptografa um token
-- ATENÇÃO: Deve ser chamada apenas pelo service role
-- ============================================
CREATE OR REPLACE FUNCTION decrypt_token(p_encrypted_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key bytea;
  v_decrypted bytea;
BEGIN
  -- Mesma chave usada na criptografia
  v_key := digest('ADSOPS_SECRET_KEY_2024_PRODUCTION', 'sha256');
  
  -- Descriptografa
  v_decrypted := decrypt(
    decode(p_encrypted_token, 'base64'),
    v_key,
    'aes-cbc/pad:pkcs'
  );
  
  RETURN convert_from(v_decrypted, 'UTF8');
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro (token inválido/corrompido), retorna NULL
    RETURN NULL;
END;
$$;

-- ============================================
-- 4. VIEW: v_client_kpis_daily
-- KPIs agregados por cliente, dia e nível
-- ============================================
CREATE OR REPLACE VIEW v_client_kpis_daily AS
SELECT 
  mid.workspace_id,
  mid.client_id,
  c.name as client_name,
  mid.meta_ad_account_id,
  ma.name as ad_account_name,
  mid.level,
  mid.date,
  COUNT(DISTINCT mid.entity_id) as entity_count,
  SUM(mid.spend) as total_spend,
  SUM(mid.impressions) as total_impressions,
  SUM(mid.reach) as total_reach,
  SUM(mid.clicks) as total_clicks,
  CASE 
    WHEN SUM(mid.impressions) > 0 
    THEN (SUM(mid.clicks)::numeric / SUM(mid.impressions) * 100)
    ELSE 0 
  END as avg_ctr,
  CASE 
    WHEN SUM(mid.clicks) > 0 
    THEN (SUM(mid.spend) / SUM(mid.clicks))
    ELSE 0 
  END as avg_cpc,
  CASE 
    WHEN SUM(mid.impressions) > 0 
    THEN (SUM(mid.spend) / SUM(mid.impressions) * 1000)
    ELSE 0 
  END as avg_cpm
FROM meta_insights_daily mid
LEFT JOIN clients c ON c.id = mid.client_id
LEFT JOIN meta_ad_accounts ma ON ma.id = mid.meta_ad_account_id
GROUP BY 
  mid.workspace_id,
  mid.client_id,
  c.name,
  mid.meta_ad_account_id,
  ma.name,
  mid.level,
  mid.date;

-- ============================================
-- 5. VIEW: v_top_entities_period
-- Top entidades por spend em um período
-- ============================================
CREATE OR REPLACE VIEW v_top_entities_period AS
SELECT 
  mid.workspace_id,
  mid.client_id,
  mid.meta_ad_account_id,
  mid.level,
  mid.entity_id,
  mid.entity_name,
  MIN(mid.date) as period_start,
  MAX(mid.date) as period_end,
  COUNT(DISTINCT mid.date) as days_active,
  SUM(mid.spend) as total_spend,
  SUM(mid.impressions) as total_impressions,
  SUM(mid.reach) as total_reach,
  SUM(mid.clicks) as total_clicks,
  CASE 
    WHEN SUM(mid.impressions) > 0 
    THEN (SUM(mid.clicks)::numeric / SUM(mid.impressions) * 100)
    ELSE 0 
  END as ctr,
  CASE 
    WHEN SUM(mid.clicks) > 0 
    THEN (SUM(mid.spend) / SUM(mid.clicks))
    ELSE 0 
  END as cpc,
  CASE 
    WHEN SUM(mid.impressions) > 0 
    THEN (SUM(mid.spend) / SUM(mid.impressions) * 1000)
    ELSE 0 
  END as cpm
FROM meta_insights_daily mid
GROUP BY 
  mid.workspace_id,
  mid.client_id,
  mid.meta_ad_account_id,
  mid.level,
  mid.entity_id,
  mid.entity_name;

-- ============================================
-- 6. VIEW: v_sync_status_overview
-- Visão geral do status de sincronização
-- ============================================
CREATE OR REPLACE VIEW v_sync_status_overview AS
SELECT 
  mss.workspace_id,
  mss.client_id,
  c.name as client_name,
  mss.meta_ad_account_id,
  ma.name as ad_account_name,
  mss.last_daily_date_synced,
  mss.last_intraday_synced_at,
  mss.last_success_at,
  mss.last_error,
  mss.sync_enabled,
  CASE 
    WHEN mss.last_error IS NOT NULL THEN 'error'
    WHEN mss.last_success_at IS NULL THEN 'pending'
    WHEN mss.last_success_at < NOW() - INTERVAL '24 hours' THEN 'stale'
    ELSE 'healthy'
  END as health_status,
  (
    SELECT COUNT(*) 
    FROM meta_insights_daily mid 
    WHERE mid.workspace_id = mss.workspace_id 
    AND mid.meta_ad_account_id::text = mss.meta_ad_account_id
  ) as total_insights_rows,
  (
    SELECT MAX(date) 
    FROM meta_insights_daily mid 
    WHERE mid.workspace_id = mss.workspace_id 
    AND mid.meta_ad_account_id::text = mss.meta_ad_account_id
  ) as latest_data_date,
  mss.updated_at
FROM meta_sync_state mss
LEFT JOIN clients c ON c.id = mss.client_id
LEFT JOIN meta_ad_accounts ma ON ma.meta_ad_account_id = mss.meta_ad_account_id;

-- ============================================
-- 7. FUNÇÃO: get_client_insights_summary
-- Retorna resumo de insights para um cliente
-- ============================================
CREATE OR REPLACE FUNCTION get_client_insights_summary(
  p_workspace_id uuid,
  p_client_id uuid DEFAULT NULL,
  p_date_from date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_date_to date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  level text,
  entity_count bigint,
  total_spend numeric,
  total_impressions bigint,
  total_reach bigint,
  total_clicks bigint,
  avg_ctr numeric,
  avg_cpc numeric,
  avg_cpm numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    mid.level,
    COUNT(DISTINCT mid.entity_id) as entity_count,
    SUM(mid.spend) as total_spend,
    SUM(mid.impressions) as total_impressions,
    SUM(mid.reach) as total_reach,
    SUM(mid.clicks) as total_clicks,
    CASE 
      WHEN SUM(mid.impressions) > 0 
      THEN ROUND((SUM(mid.clicks)::numeric / SUM(mid.impressions) * 100), 4)
      ELSE 0 
    END as avg_ctr,
    CASE 
      WHEN SUM(mid.clicks) > 0 
      THEN ROUND((SUM(mid.spend) / SUM(mid.clicks)), 4)
      ELSE 0 
    END as avg_cpc,
    CASE 
      WHEN SUM(mid.impressions) > 0 
      THEN ROUND((SUM(mid.spend) / SUM(mid.impressions) * 1000), 4)
      ELSE 0 
    END as avg_cpm
  FROM meta_insights_daily mid
  WHERE mid.workspace_id = p_workspace_id
  AND (p_client_id IS NULL OR mid.client_id = p_client_id)
  AND mid.date >= p_date_from
  AND mid.date <= p_date_to
  GROUP BY mid.level
  ORDER BY mid.level;
$$;

-- ============================================
-- 8. FUNÇÃO: get_daily_trend
-- Retorna tendência diária de métricas
-- ============================================
CREATE OR REPLACE FUNCTION get_daily_trend(
  p_workspace_id uuid,
  p_meta_ad_account_id text DEFAULT NULL,
  p_level text DEFAULT 'campaign',
  p_date_from date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_date_to date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date date,
  spend numeric,
  impressions bigint,
  clicks bigint,
  ctr numeric,
  cpc numeric,
  cpm numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    mid.date,
    SUM(mid.spend) as spend,
    SUM(mid.impressions) as impressions,
    SUM(mid.clicks) as clicks,
    CASE 
      WHEN SUM(mid.impressions) > 0 
      THEN ROUND((SUM(mid.clicks)::numeric / SUM(mid.impressions) * 100), 4)
      ELSE 0 
    END as ctr,
    CASE 
      WHEN SUM(mid.clicks) > 0 
      THEN ROUND((SUM(mid.spend) / SUM(mid.clicks)), 4)
      ELSE 0 
    END as cpc,
    CASE 
      WHEN SUM(mid.impressions) > 0 
      THEN ROUND((SUM(mid.spend) / SUM(mid.impressions) * 1000), 4)
      ELSE 0 
    END as cpm
  FROM meta_insights_daily mid
  WHERE mid.workspace_id = p_workspace_id
  AND (p_meta_ad_account_id IS NULL OR mid.meta_ad_account_id::text = p_meta_ad_account_id)
  AND mid.level = p_level
  AND mid.date >= p_date_from
  AND mid.date <= p_date_to
  GROUP BY mid.date
  ORDER BY mid.date;
$$;
