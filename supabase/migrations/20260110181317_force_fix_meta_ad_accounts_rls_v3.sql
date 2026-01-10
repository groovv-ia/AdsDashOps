/*
  # Forçar Correção Completa das Políticas RLS - Meta Ad Accounts V3
  
  ## Problema
  Usuários continuam enfrentando bloqueio de RLS ao tentar acessar meta_ad_accounts
  mesmo após a migration de correção ter sido aplicada.
  
  ## Causa Raiz
  - Tokens JWT antigos emitidos antes da atualização das políticas
  - Políticas antigas ainda ativas que não usam is_workspace_member()
  
  ## Solução
  1. Remover TODAS as políticas existentes de meta_ad_accounts
  2. Recriar políticas corretas usando is_workspace_member()
  3. Garantir que as funções helper existem e estão corretas
  4. Adicionar índices para performance
  
  ## Tabelas Afetadas
  - `meta_ad_accounts` - Políticas RLS corrigidas completamente
  
  ## Segurança
  - Mantém RLS habilitado
  - Usa funções SECURITY DEFINER para verificar membership
  - Apenas usuários autenticados podem acessar dados do seu workspace
*/

-- ============================================
-- 1. FUNÇÕES HELPER: Garantir que existem e estão corretas
-- ============================================

-- Função: is_workspace_member
-- Verifica se o usuário é membro OU owner do workspace
CREATE OR REPLACE FUNCTION is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    -- Verifica se é membro através de workspace_members
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
  )
  OR EXISTS (
    -- Verifica se é owner direto do workspace
    SELECT 1 FROM workspaces
    WHERE id = p_workspace_id
    AND owner_id = auth.uid()
  );
$$;

-- Função: is_workspace_admin
-- Verifica se o usuário é admin/owner do workspace
CREATE OR REPLACE FUNCTION is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    -- Verifica se é admin ou owner através de workspace_members
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
  OR EXISTS (
    -- Verifica se é owner direto do workspace
    SELECT 1 FROM workspaces
    WHERE id = p_workspace_id
    AND owner_id = auth.uid()
  );
$$;

-- ============================================
-- 2. META_AD_ACCOUNTS: Remover TODAS as políticas antigas
-- ============================================

DO $$
DECLARE
  r RECORD;
  dropped_count integer := 0;
BEGIN
  -- Remove todas as políticas existentes de meta_ad_accounts
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'meta_ad_accounts'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON meta_ad_accounts', r.policyname);
    dropped_count := dropped_count + 1;
    RAISE NOTICE '  Política removida: %', r.policyname;
  END LOOP;
  
  RAISE NOTICE '✓ Total de % políticas antigas removidas', dropped_count;
END $$;

-- ============================================
-- 3. META_AD_ACCOUNTS: Criar novas políticas corretas
-- ============================================

-- SELECT: Usuários podem ver ad accounts de workspaces onde são membros
CREATE POLICY "Users can view workspace meta ad accounts"
  ON meta_ad_accounts
  FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

-- INSERT: Usuários podem inserir ad accounts em workspaces onde são membros
CREATE POLICY "Users can insert workspace meta ad accounts"
  ON meta_ad_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(workspace_id));

-- UPDATE: Usuários podem atualizar ad accounts em workspaces onde são membros
CREATE POLICY "Users can update workspace meta ad accounts"
  ON meta_ad_accounts
  FOR UPDATE
  TO authenticated
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

-- DELETE: Apenas admins podem deletar ad accounts
CREATE POLICY "Users can delete workspace meta ad accounts"
  ON meta_ad_accounts
  FOR DELETE
  TO authenticated
  USING (is_workspace_admin(workspace_id));

-- ============================================
-- 4. ÍNDICES: Garantir que existem para performance
-- ============================================

-- Índices para workspace_members (usado pelas funções RLS)
CREATE INDEX IF NOT EXISTS idx_workspace_members_lookup 
  ON workspace_members(workspace_id, user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id 
  ON workspace_members(user_id);

-- Índices para workspaces (usado pelas funções RLS)
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_lookup 
  ON workspaces(id, owner_id);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id 
  ON workspaces(owner_id);

-- Índices para meta_ad_accounts
CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_workspace_id 
  ON meta_ad_accounts(workspace_id);

CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_meta_ad_account_id 
  ON meta_ad_accounts(meta_ad_account_id);

-- ============================================
-- 5. VERIFICAÇÃO: Log do que foi feito
-- ============================================

DO $$
DECLARE
  policies_count integer;
  accounts_count integer;
  members_count integer;
  workspaces_count integer;
BEGIN
  -- Conta políticas de meta_ad_accounts
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE tablename = 'meta_ad_accounts';
  
  -- Conta registros
  SELECT COUNT(*) INTO accounts_count FROM meta_ad_accounts;
  SELECT COUNT(*) INTO workspaces_count FROM workspaces;
  SELECT COUNT(*) INTO members_count FROM workspace_members;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '        ✓ CORREÇÃO RLS APLICADA COM SUCESSO           ';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Políticas RLS ativas: %', policies_count;
  RAISE NOTICE '';
  
  -- Verifica se as funções existem
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_workspace_member') THEN
    RAISE NOTICE '✓ Função is_workspace_member() criada/atualizada';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_workspace_admin') THEN
    RAISE NOTICE '✓ Função is_workspace_admin() criada/atualizada';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Estatísticas do banco:';
  RAISE NOTICE '  - Workspaces: %', workspaces_count;
  RAISE NOTICE '  - Membros: %', members_count;
  RAISE NOTICE '  - Ad Accounts: %', accounts_count;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '              AÇÃO NECESSÁRIA DO USUÁRIO               ';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'O sistema tentará renovar o token JWT automaticamente.';
  RAISE NOTICE 'Se o problema persistir após 30 segundos:';
  RAISE NOTICE '';
  RAISE NOTICE '  1. Faça logout do sistema';
  RAISE NOTICE '  2. Faça login novamente';
  RAISE NOTICE '  3. As novas permissões serão aplicadas';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
