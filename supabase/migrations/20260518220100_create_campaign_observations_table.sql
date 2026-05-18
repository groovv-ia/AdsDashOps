/*
  # Criar tabela campaign_observations

  ## Resumo
  Tabela para armazenar observacoes qualitativas do gestor e analises de IA por campanha.

  ## Novas Tabelas
  - `campaign_observations`
    - `id` (uuid, PK)
    - `campaign_id` (text) — ID da campanha no Meta Ads
    - `meta_ad_account_id` (text) — ID da conta de anuncios
    - `user_id` (uuid, FK auth.users) — quem criou/editou
    - `workspace_id` (uuid, FK workspaces) — isolamento por workspace
    - `manager_notes` (text) — texto livre escrito pelo gestor
    - `ai_analysis` (jsonb) — resultado estruturado da analise de IA
    - `ai_generated_at` (timestamptz) — quando a IA gerou a ultima analise
    - `created_at` / `updated_at` (timestamptz)

  ## Seguranca
  - RLS habilitado
  - Usuarios autenticados so acessam registros do proprio workspace
  - Politicas separadas para SELECT, INSERT, UPDATE, DELETE

  ## Performance
  - Index em campaign_id para lookup rapido
  - Index em workspace_id para isolamento
  - Unique constraint em (campaign_id, workspace_id) — uma observacao por campanha por workspace
*/

CREATE TABLE IF NOT EXISTS campaign_observations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       text NOT NULL,
  meta_ad_account_id text NOT NULL DEFAULT '',
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id      uuid NOT NULL,
  manager_notes     text NOT NULL DEFAULT '',
  ai_analysis       jsonb,
  ai_generated_at   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Unique: uma observacao por campanha por workspace
CREATE UNIQUE INDEX IF NOT EXISTS campaign_observations_campaign_workspace_idx
  ON campaign_observations (campaign_id, workspace_id);

-- Index para consultas por workspace
CREATE INDEX IF NOT EXISTS campaign_observations_workspace_idx
  ON campaign_observations (workspace_id);

-- Index para consultas por user
CREATE INDEX IF NOT EXISTS campaign_observations_user_idx
  ON campaign_observations (user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_campaign_observations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaign_observations_updated_at ON campaign_observations;
CREATE TRIGGER campaign_observations_updated_at
  BEFORE UPDATE ON campaign_observations
  FOR EACH ROW EXECUTE FUNCTION update_campaign_observations_updated_at();

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE campaign_observations ENABLE ROW LEVEL SECURITY;

-- SELECT: membro do workspace pode ler
CREATE POLICY "Members can read own workspace campaign observations"
  ON campaign_observations FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- INSERT: apenas usuario autenticado, vinculado ao proprio user_id
CREATE POLICY "Authenticated users can insert campaign observations"
  ON campaign_observations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- UPDATE: usuario que criou OU outro membro do mesmo workspace
CREATE POLICY "Workspace members can update campaign observations"
  ON campaign_observations FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- DELETE: somente o criador do registro
CREATE POLICY "Creator can delete own campaign observations"
  ON campaign_observations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
