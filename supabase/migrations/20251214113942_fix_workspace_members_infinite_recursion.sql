/*
  # Correcao de Recursao Infinita em workspace_members

  ## Problema
  As politicas RLS de workspace_members usavam funcoes que consultavam
  a propria tabela workspace_members, causando recursao infinita.

  ## Solucao
  1. Recriar funcoes com SECURITY DEFINER para ignorar RLS
  2. Remover politicas duplicadas e problematicas
  3. Criar politicas simples e eficientes

  ## Mudancas
  - Funcao is_workspace_member: recriada com SECURITY DEFINER
  - Funcao is_workspace_admin: recriada com SECURITY DEFINER
  - Politicas duplicadas removidas
  - Novas politicas simplificadas
*/

-- Remover todas as politicas existentes de workspace_members
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can delete members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can insert members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can update members" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;

-- Recriar funcao is_workspace_member com SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Recriar funcao is_workspace_admin com SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Criar politicas simples para workspace_members
-- SELECT: usuario pode ver membros de workspaces que pertence
CREATE POLICY "workspace_members_select_policy"
  ON workspace_members
  FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

-- INSERT: apenas admins/owners podem adicionar membros
CREATE POLICY "workspace_members_insert_policy"
  ON workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_admin(workspace_id));

-- UPDATE: apenas admins/owners podem atualizar membros
CREATE POLICY "workspace_members_update_policy"
  ON workspace_members
  FOR UPDATE
  TO authenticated
  USING (is_workspace_admin(workspace_id))
  WITH CHECK (is_workspace_admin(workspace_id));

-- DELETE: apenas admins/owners podem remover membros (exceto a si mesmo)
CREATE POLICY "workspace_members_delete_policy"
  ON workspace_members
  FOR DELETE
  TO authenticated
  USING (is_workspace_admin(workspace_id) AND user_id != auth.uid());
