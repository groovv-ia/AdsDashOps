/*
  # Corrigir Políticas RLS de meta_ad_accounts
  
  ## Problema
  As políticas RLS de meta_ad_accounts só permitem acesso ao owner direto do workspace,
  não considerando membros do workspace através de workspace_members.
  
  Isso causa problemas onde:
  - Novos usuários não conseguem visualizar as ad accounts
  - Edge function salva as contas corretamente
  - Frontend não consegue ler devido ao RLS bloqueando
  
  ## Solução
  Atualizar todas as políticas RLS de meta_ad_accounts para usar a função
  `is_workspace_member()` que verifica tanto ownership quanto membership.
  
  ## Tabelas Afetadas
  - `meta_ad_accounts` - Corrige todas as 4 políticas (SELECT, INSERT, UPDATE, DELETE)
  
  ## Segurança
  - Mantém RLS habilitado
  - Usa função helper existente `is_workspace_member()`
  - Garante que apenas membros autorizados do workspace tenham acesso
*/

-- ============================================
-- 1. Remover políticas antigas de meta_ad_accounts
-- ============================================
DROP POLICY IF EXISTS "Users can view workspace meta ad accounts" ON meta_ad_accounts;
DROP POLICY IF EXISTS "Users can insert workspace meta ad accounts" ON meta_ad_accounts;
DROP POLICY IF EXISTS "Users can update workspace meta ad accounts" ON meta_ad_accounts;
DROP POLICY IF EXISTS "Users can delete workspace meta ad accounts" ON meta_ad_accounts;

-- ============================================
-- 2. Criar novas políticas usando is_workspace_member()
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
-- 3. Garantir que a função is_workspace_member existe
-- ============================================
-- Esta função foi criada em migrations anteriores, mas vamos garantir que existe

CREATE OR REPLACE FUNCTION is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = p_workspace_id
    AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
  OR EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = p_workspace_id
    AND owner_id = auth.uid()
  );
$$;

-- ============================================
-- 4. Índices para performance das funções RLS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workspace_members_lookup 
  ON workspace_members(workspace_id, user_id);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_lookup 
  ON workspaces(id, owner_id);
