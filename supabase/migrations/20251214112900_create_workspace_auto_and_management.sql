/*
  # Criacao Automatica de Workspace e Funcoes de Gerenciamento
  
  Este migration adiciona:
  
  ## 1. Trigger para criacao automatica de workspace
  - Quando um novo usuario se registra, um workspace padrao e criado
  - O usuario e automaticamente adicionado como 'owner' do workspace
  - O nome do workspace e baseado no email ou nome do usuario
  
  ## 2. Funcao para criar workspaces adicionais
  - Usuarios podem criar multiplos workspaces
  - Cada workspace pode ter membros diferentes
  
  ## 3. Funcao para obter workspace do usuario
  - Retorna o workspace ativo do usuario
  - Usado em todas as operacoes que requerem workspace_id
  
  ## 4. Backfill para usuarios existentes
  - Cria workspaces para usuarios que ainda nao possuem
  
  ## Seguranca
  - RLS habilitado em workspaces e workspace_members
  - Usuarios so podem ver/editar seus proprios workspaces
*/

-- ============================================
-- 1. FUNCAO: Criar workspace para usuario
-- ============================================
CREATE OR REPLACE FUNCTION create_workspace_for_user(
  p_user_id uuid,
  p_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_workspace_name text;
  v_user_email text;
BEGIN
  -- Busca email do usuario se nome nao fornecido
  IF p_name IS NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    v_workspace_name := COALESCE(
      split_part(v_user_email, '@', 1) || '''s Workspace',
      'Meu Workspace'
    );
  ELSE
    v_workspace_name := p_name;
  END IF;

  -- Cria o workspace
  INSERT INTO workspaces (name, owner_id)
  VALUES (v_workspace_name, p_user_id)
  RETURNING id INTO v_workspace_id;

  -- Adiciona usuario como owner do workspace
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, p_user_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN v_workspace_id;
END;
$$;

-- ============================================
-- 2. FUNCAO: Handle new user - atualizada para criar workspace
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  -- Cria o perfil do usuario
  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Falha ao criar perfil para usuario %: %', NEW.id, SQLERRM;
  END;

  -- Cria workspace para o usuario
  BEGIN
    v_workspace_id := create_workspace_for_user(NEW.id, NULL);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Falha ao criar workspace para usuario %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- ============================================
-- 3. RLS para workspaces (se nao existir)
-- ============================================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Remove politicas existentes para recriar
DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they are member of" ON workspaces;
DROP POLICY IF EXISTS "Users can insert own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can delete own workspaces" ON workspaces;

-- Politica: Usuarios podem ver workspaces onde sao membros
CREATE POLICY "Users can view workspaces they are member of"
  ON workspaces
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Politica: Usuarios podem criar workspaces como owner
CREATE POLICY "Users can insert own workspaces"
  ON workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Politica: Owners podem atualizar seus workspaces
CREATE POLICY "Users can update own workspaces"
  ON workspaces
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Politica: Owners podem deletar seus workspaces
CREATE POLICY "Users can delete own workspaces"
  ON workspaces
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================
-- 4. RLS para workspace_members
-- ============================================
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Remove politicas existentes para recriar
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can insert members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can update members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can delete members" ON workspace_members;

-- Politica: Usuarios podem ver membros dos workspaces onde sao membros
CREATE POLICY "Users can view workspace members"
  ON workspace_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Politica: Owners/admins podem adicionar membros
CREATE POLICY "Workspace owners can insert members"
  ON workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_members.workspace_id
      AND w.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Politica: Owners/admins podem atualizar membros
CREATE POLICY "Workspace owners can update members"
  ON workspace_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_members.workspace_id
      AND w.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_members.workspace_id
      AND w.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Politica: Owners podem remover membros (exceto a si mesmo)
CREATE POLICY "Workspace owners can delete members"
  ON workspace_members
  FOR DELETE
  TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_members.workspace_id
        AND w.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
      )
    )
    AND workspace_members.user_id != auth.uid()
  );

-- ============================================
-- 5. FUNCAO: Obter workspace padrao do usuario
-- ============================================
CREATE OR REPLACE FUNCTION get_user_default_workspace(p_user_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
BEGIN
  -- Usa auth.uid() se nao fornecido
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Busca workspace onde usuario e owner (preferencia)
  SELECT id INTO v_workspace_id
  FROM workspaces
  WHERE owner_id = v_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  -- Se nao encontrou como owner, busca como membro
  IF v_workspace_id IS NULL THEN
    SELECT workspace_id INTO v_workspace_id
    FROM workspace_members
    WHERE user_id = v_user_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  RETURN v_workspace_id;
END;
$$;

-- ============================================
-- 6. BACKFILL: Cria workspaces para usuarios existentes
-- ============================================
DO $$
DECLARE
  r RECORD;
  v_workspace_id uuid;
BEGIN
  -- Para cada usuario que nao tem workspace
  FOR r IN 
    SELECT au.id, au.email
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM workspaces w WHERE w.owner_id = au.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM workspace_members wm WHERE wm.user_id = au.id
    )
  LOOP
    BEGIN
      v_workspace_id := create_workspace_for_user(r.id, NULL);
      RAISE NOTICE 'Workspace criado para usuario %: %', r.email, v_workspace_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Falha ao criar workspace para usuario %: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- ============================================
-- 7. INDICES para performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_created_at ON workspaces(created_at);
