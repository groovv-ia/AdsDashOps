/*
  # Modulo de Analise de Criativos - Tabelas de Suporte

  1. Novas Tabelas
    - `creative_comparisons`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, FK → workspaces)
      - `name` (text) - nome da comparacao dado pelo usuario
      - `description` (text) - descricao opcional
      - `ad_ids` (text[]) - array de ad_ids selecionados para comparacao
      - `platform` (text) - 'meta' | 'google'
      - `date_from` (date) - periodo de analise inicio
      - `date_to` (date) - periodo de analise fim
      - `filters_snapshot` (jsonb) - snapshot dos filtros aplicados no momento da criacao
      - `created_by` (uuid, FK → auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `creative_tags`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, FK → workspaces)
      - `ad_id` (text) - referencia ao anuncio
      - `tag` (text) - tag/label definida pelo usuario
      - `created_by` (uuid)
      - `created_at` (timestamptz)

  2. Seguranca
    - RLS habilitado em ambas as tabelas
    - Politicas restritas a membros do workspace autenticados
*/

-- Tabela de comparacoes de criativos
CREATE TABLE IF NOT EXISTS creative_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  ad_ids text[] NOT NULL DEFAULT '{}',
  platform text NOT NULL DEFAULT 'meta',
  date_from date,
  date_to date,
  filters_snapshot jsonb DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE creative_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view comparisons"
  ON creative_comparisons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = creative_comparisons.workspace_id
      AND wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = creative_comparisons.workspace_id
      AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can create comparisons"
  ON creative_comparisons FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = creative_comparisons.workspace_id
        AND wm.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = creative_comparisons.workspace_id
        AND w.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Creators can update own comparisons"
  ON creative_comparisons FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creators can delete own comparisons"
  ON creative_comparisons FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_creative_comparisons_workspace
  ON creative_comparisons(workspace_id);
CREATE INDEX IF NOT EXISTS idx_creative_comparisons_created_by
  ON creative_comparisons(created_by);

-- Tabela de tags de criativos (organizacao pelo usuario)
CREATE TABLE IF NOT EXISTS creative_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  ad_id text NOT NULL,
  tag text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, ad_id, tag)
);

ALTER TABLE creative_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view tags"
  ON creative_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = creative_tags.workspace_id
      AND wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = creative_tags.workspace_id
      AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can create tags"
  ON creative_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = creative_tags.workspace_id
        AND wm.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = creative_tags.workspace_id
        AND w.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Creators can delete own tags"
  ON creative_tags FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_creative_tags_workspace_ad
  ON creative_tags(workspace_id, ad_id);
CREATE INDEX IF NOT EXISTS idx_creative_tags_tag
  ON creative_tags(tag);
