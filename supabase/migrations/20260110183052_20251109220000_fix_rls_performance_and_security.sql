/*
  # Fix RLS Performance and Security Issues

  ## Descrição
  Corrige problemas de performance e segurança nas políticas RLS e otimiza o banco de dados.

  ## Mudanças

  ### 1. RLS Performance Optimization
  - Atualiza todas as políticas RLS para usar (select auth.uid()) ao invés de auth.uid()
  - Isso evita re-avaliação da função para cada linha, melhorando performance significativamente
  - Afeta tabelas: meta_accounts, selected_campaigns, sync_logs

  ### 2. Remove Unused Indexes
  - Remove índices que não estão sendo utilizados para liberar espaço e reduzir overhead
  - Mantém apenas índices essenciais para queries frequentes

  ### 3. Fix Function Search Path
  - Corrige search_path da função update_updated_at_column para ser imutável
  - Adiciona SECURITY DEFINER e schema qualificado

  ## Tabelas Afetadas
  - meta_accounts
  - selected_campaigns
  - sync_logs
  - Várias outras tabelas com índices não utilizados

  ## Notas Importantes
  - Mudanças melhoram performance em escala
  - Mantém mesma funcionalidade de segurança
  - Remove overhead desnecessário de índices não utilizados
*/

-- ============================================================================
-- 1. OTIMIZAR POLÍTICAS RLS - META_ACCOUNTS
-- ============================================================================

-- Drop políticas existentes
DROP POLICY IF EXISTS "Users can view own meta accounts" ON meta_accounts;
DROP POLICY IF EXISTS "Users can insert own meta accounts" ON meta_accounts;
DROP POLICY IF EXISTS "Users can update own meta accounts" ON meta_accounts;
DROP POLICY IF EXISTS "Users can delete own meta accounts" ON meta_accounts;

-- Recriar com otimização de performance usando (select auth.uid())
CREATE POLICY "Users can view own meta accounts"
  ON meta_accounts FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own meta accounts"
  ON meta_accounts FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own meta accounts"
  ON meta_accounts FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own meta accounts"
  ON meta_accounts FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- 2. OTIMIZAR POLÍTICAS RLS - SELECTED_CAMPAIGNS
-- ============================================================================

-- Drop políticas existentes
DROP POLICY IF EXISTS "Users can view own selected campaigns" ON selected_campaigns;
DROP POLICY IF EXISTS "Users can insert own selected campaigns" ON selected_campaigns;
DROP POLICY IF EXISTS "Users can update own selected campaigns" ON selected_campaigns;
DROP POLICY IF EXISTS "Users can delete own selected campaigns" ON selected_campaigns;

-- Recriar com otimização de performance
CREATE POLICY "Users can view own selected campaigns"
  ON selected_campaigns FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own selected campaigns"
  ON selected_campaigns FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own selected campaigns"
  ON selected_campaigns FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own selected campaigns"
  ON selected_campaigns FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- 3. OTIMIZAR POLÍTICAS RLS - SYNC_LOGS
-- ============================================================================

-- Drop políticas existentes
DROP POLICY IF EXISTS "Users can view own sync logs" ON sync_logs;
DROP POLICY IF EXISTS "Users can insert own sync logs" ON sync_logs;
DROP POLICY IF EXISTS "Users can update own sync logs" ON sync_logs;

-- Recriar com otimização de performance
CREATE POLICY "Users can view own sync logs"
  ON sync_logs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own sync logs"
  ON sync_logs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own sync logs"
  ON sync_logs FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- 4. REMOVER ÍNDICES NÃO UTILIZADOS
-- ============================================================================

-- Índices relacionados a api_credentials
DROP INDEX IF EXISTS idx_api_credentials_user_platform;

-- Índices relacionados a oauth_tokens
DROP INDEX IF EXISTS idx_oauth_tokens_expires;
DROP INDEX IF EXISTS idx_oauth_tokens_user_id;
DROP INDEX IF EXISTS idx_oauth_tokens_is_active;

-- Índices relacionados a sync_jobs
DROP INDEX IF EXISTS idx_sync_jobs_status;
DROP INDEX IF EXISTS idx_sync_jobs_created;
DROP INDEX IF EXISTS idx_sync_jobs_user_id;

-- Índices relacionados a sync_logs
DROP INDEX IF EXISTS idx_sync_logs_user_id;
DROP INDEX IF EXISTS idx_sync_logs_platform;
DROP INDEX IF EXISTS idx_sync_logs_status;
DROP INDEX IF EXISTS idx_sync_logs_started_at;
DROP INDEX IF EXISTS idx_sync_logs_user_platform;

-- Índices relacionados a meta_accounts
DROP INDEX IF EXISTS idx_meta_accounts_user_id;
DROP INDEX IF EXISTS idx_meta_accounts_account_id;

-- Índices relacionados a selected_campaigns
DROP INDEX IF EXISTS idx_selected_campaigns_user_id;
DROP INDEX IF EXISTS idx_selected_campaigns_meta_account_id;
DROP INDEX IF EXISTS idx_selected_campaigns_campaign_id;

-- Índices relacionados a audience_insights
DROP INDEX IF EXISTS idx_audience_insights_user_id;

-- Índices relacionados a ai_recommendations
DROP INDEX IF EXISTS idx_ai_recommendations_insight_id_fk;

-- Índices relacionados a ad_creatives
DROP INDEX IF EXISTS idx_ad_creatives_user_id;

-- Índices relacionados a conversion_events
DROP INDEX IF EXISTS idx_conversion_events_user_id;

-- ============================================================================
-- 5. RECRIAR ÍNDICES ESSENCIAIS
-- ============================================================================

-- Manter apenas índices compostos essenciais que otimizam queries reais
-- Índice composto para meta_accounts (user + account lookup)
CREATE INDEX IF NOT EXISTS idx_meta_accounts_user_account
  ON meta_accounts(user_id, account_id);

-- Índice composto para selected_campaigns (user + connection lookup)
CREATE INDEX IF NOT EXISTS idx_selected_campaigns_user_connection
  ON selected_campaigns(user_id, connection_id);

-- Índice para sync_logs (user + platform + status) - queries de histórico
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_platform_status
  ON sync_logs(user_id, platform, status);

-- ============================================================================
-- 6. CORRIGIR FUNÇÃO update_updated_at_column
-- ============================================================================

-- Drop função existente
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Recriar com search_path seguro e schema qualificado
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recriar trigger para meta_accounts
DROP TRIGGER IF EXISTS update_meta_accounts_updated_at ON meta_accounts;
CREATE TRIGGER update_meta_accounts_updated_at
  BEFORE UPDATE ON meta_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. ADICIONAR COMENTÁRIOS DE DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON POLICY "Users can view own meta accounts" ON meta_accounts IS
  'Otimizado com (select auth.uid()) para melhor performance em escala';

COMMENT ON POLICY "Users can view own selected campaigns" ON selected_campaigns IS
  'Otimizado com (select auth.uid()) para melhor performance em escala';

COMMENT ON POLICY "Users can view own sync logs" ON sync_logs IS
  'Otimizado com (select auth.uid()) para melhor performance em escala';

COMMENT ON FUNCTION public.update_updated_at_column() IS
  'Função segura com search_path imutável para atualizar timestamps automaticamente';