/*
  # Corrigir RLS da tabela meta_ad_creatives para incluir membros do workspace

  1. Problema Identificado
    - As políticas RLS atuais só verificam se o usuário é owner do workspace
    - Usuários que são membros (workspace_members) não conseguem acessar os criativos
    - Isso causa falha no carregamento dos criativos na interface

  2. Solução
    - Atualizar todas as políticas para verificar tanto ownership quanto membership
    - Usar função get_user_workspace_id() quando disponível
    - Garantir que membros do workspace tenham acesso aos criativos

  3. Políticas Atualizadas
    - SELECT: Permitir leitura para owners e membros
    - INSERT: Permitir criação para owners e membros
    - UPDATE: Permitir atualização para owners e membros
    - DELETE: Permitir exclusão para owners e membros

  4. Segurança
    - Mantém isolamento entre workspaces
    - Usuários só acessam criativos dos workspaces aos quais pertencem
    - Políticas restritivas por padrão (authenticated users apenas)
*/

-- Remove políticas antigas
DROP POLICY IF EXISTS "Users can view workspace ad creatives" ON meta_ad_creatives;
DROP POLICY IF EXISTS "Users can create workspace ad creatives" ON meta_ad_creatives;
DROP POLICY IF EXISTS "Users can update workspace ad creatives" ON meta_ad_creatives;
DROP POLICY IF EXISTS "Users can delete workspace ad creatives" ON meta_ad_creatives;

-- Política de SELECT: usuários podem visualizar criativos de workspaces que possuem ou são membros
CREATE POLICY "Users can view workspace ad creatives"
  ON meta_ad_creatives
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      -- Workspaces onde o usuário é owner
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      -- Workspaces onde o usuário é membro
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Política de INSERT: usuários podem criar criativos em workspaces que possuem ou são membros
CREATE POLICY "Users can create workspace ad creatives"
  ON meta_ad_creatives
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Política de UPDATE: usuários podem atualizar criativos de workspaces que possuem ou são membros
CREATE POLICY "Users can update workspace ad creatives"
  ON meta_ad_creatives
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Política de DELETE: usuários podem deletar criativos de workspaces que possuem ou são membros
CREATE POLICY "Users can delete workspace ad creatives"
  ON meta_ad_creatives
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Cria índice para otimizar as queries de RLS (se ainda não existir)
CREATE INDEX IF NOT EXISTS idx_meta_ad_creatives_workspace_id 
  ON meta_ad_creatives(workspace_id);

-- Cria índice para otimizar busca por ad_id
CREATE INDEX IF NOT EXISTS idx_meta_ad_creatives_ad_id 
  ON meta_ad_creatives(ad_id);

-- Cria índice composto para busca por workspace + ad
CREATE INDEX IF NOT EXISTS idx_meta_ad_creatives_workspace_ad 
  ON meta_ad_creatives(workspace_id, ad_id);
