/*
  # Schema Completo para Meta Ads System User
  
  Este migration completa o schema para suportar a arquitetura de System User
  do Meta Ads com sincronização automatizada.
  
  ## Novas Tabelas
  
  1. `workspace_members` - Membros de cada workspace com roles
     - `id` (uuid, pk)
     - `workspace_id` (uuid, fk para workspaces)
     - `user_id` (uuid, fk para auth.users)
     - `role` (text: owner/admin/member)
  
  2. `meta_entities_cache` - Cache de entidades Meta (campaigns, adsets, ads)
     - `id` (uuid, pk)
     - `workspace_id` (uuid, fk)
     - `meta_ad_account_id` (text)
     - `entity_type` (text: campaign/adset/ad)
     - `entity_id` (text)
     - `name`, `effective_status`, `campaign_id`, `adset_id`
  
  3. `meta_sync_state` - Estado/watermark de sincronização por conta
     - `id` (uuid, pk)
     - `workspace_id` (uuid, fk)
     - `client_id` (uuid, fk)
     - `meta_ad_account_id` (text)
     - `last_daily_date_synced`, `last_intraday_synced_at`
  
  4. `meta_insights_raw` - Camada RAW auditável de insights
     - `id` (uuid, pk)
     - `workspace_id`, `client_id`, `meta_ad_account_id`
     - `level`, `entity_id`, `date_start`, `date_stop`
     - `payload` (jsonb com dados brutos da API)
  
  ## Modificações
  
  - Adiciona colunas faltantes em `meta_sync_jobs`
  - Adiciona índices para performance
  - Adiciona função helper `is_workspace_member`
  
  ## Segurança
  
  - RLS habilitado em todas as novas tabelas
  - Políticas baseadas em membership do workspace
*/

-- ============================================
-- 1. TABELA: workspace_members
-- Controla quem pode acessar cada workspace
-- ============================================
CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(workspace_id, user_id)
);

-- Índices para workspace_members
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);

-- ============================================
-- 2. TABELA: meta_entities_cache
-- Cache de campaigns, adsets e ads do Meta
-- ============================================
CREATE TABLE IF NOT EXISTS meta_entities_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  meta_ad_account_id text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('campaign', 'adset', 'ad')),
  entity_id text NOT NULL,
  name text,
  effective_status text,
  campaign_id text,
  adset_id text,
  objective text,
  daily_budget numeric,
  lifetime_budget numeric,
  extra_data jsonb DEFAULT '{}',
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(workspace_id, meta_ad_account_id, entity_type, entity_id)
);

-- Índices para meta_entities_cache
CREATE INDEX IF NOT EXISTS idx_meta_entities_cache_workspace ON meta_entities_cache(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_entities_cache_account ON meta_entities_cache(meta_ad_account_id);
CREATE INDEX IF NOT EXISTS idx_meta_entities_cache_type ON meta_entities_cache(entity_type);
CREATE INDEX IF NOT EXISTS idx_meta_entities_cache_entity ON meta_entities_cache(entity_id);
CREATE INDEX IF NOT EXISTS idx_meta_entities_cache_campaign ON meta_entities_cache(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meta_entities_cache_adset ON meta_entities_cache(adset_id) WHERE adset_id IS NOT NULL;

-- ============================================
-- 3. TABELA: meta_sync_state
-- Estado/watermark de sincronização por conta
-- ============================================
CREATE TABLE IF NOT EXISTS meta_sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  meta_ad_account_id text NOT NULL,
  last_daily_date_synced date,
  last_intraday_synced_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  sync_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(workspace_id, meta_ad_account_id)
);

-- Índices para meta_sync_state
CREATE INDEX IF NOT EXISTS idx_meta_sync_state_workspace ON meta_sync_state(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_sync_state_client ON meta_sync_state(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meta_sync_state_account ON meta_sync_state(meta_ad_account_id);

-- ============================================
-- 4. TABELA: meta_insights_raw
-- Camada RAW auditável de insights
-- ============================================
CREATE TABLE IF NOT EXISTS meta_insights_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  meta_ad_account_id text NOT NULL,
  level text NOT NULL CHECK (level IN ('account', 'campaign', 'adset', 'ad')),
  entity_id text NOT NULL,
  date_start date NOT NULL,
  date_stop date NOT NULL,
  payload jsonb NOT NULL,
  fetched_at timestamptz DEFAULT now(),
  
  UNIQUE(workspace_id, meta_ad_account_id, level, entity_id, date_start, date_stop, fetched_at)
);

-- Índices para meta_insights_raw
CREATE INDEX IF NOT EXISTS idx_meta_insights_raw_workspace ON meta_insights_raw(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_insights_raw_client ON meta_insights_raw(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meta_insights_raw_account ON meta_insights_raw(meta_ad_account_id);
CREATE INDEX IF NOT EXISTS idx_meta_insights_raw_level_entity ON meta_insights_raw(level, entity_id);
CREATE INDEX IF NOT EXISTS idx_meta_insights_raw_date ON meta_insights_raw(date_start, date_stop);
CREATE INDEX IF NOT EXISTS idx_meta_insights_raw_fetched ON meta_insights_raw(fetched_at);

-- ============================================
-- 5. AJUSTES NA TABELA meta_sync_jobs
-- Adiciona colunas faltantes
-- ============================================
DO $$
BEGIN
  -- Adiciona coluna client_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meta_sync_jobs' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE meta_sync_jobs ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
  
  -- Adiciona coluna meta_ad_account_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meta_sync_jobs' AND column_name = 'meta_ad_account_id'
  ) THEN
    ALTER TABLE meta_sync_jobs ADD COLUMN meta_ad_account_id text;
  END IF;
  
  -- Adiciona coluna level se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meta_sync_jobs' AND column_name = 'level'
  ) THEN
    ALTER TABLE meta_sync_jobs ADD COLUMN level text DEFAULT 'campaign' CHECK (level IN ('account', 'campaign', 'adset', 'ad'));
  END IF;
  
  -- Adiciona coluna fetched_rows se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meta_sync_jobs' AND column_name = 'fetched_rows'
  ) THEN
    ALTER TABLE meta_sync_jobs ADD COLUMN fetched_rows integer DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 6. AJUSTES NA TABELA meta_insights_daily
-- Adiciona coluna action_values_json
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meta_insights_daily' AND column_name = 'action_values_json'
  ) THEN
    ALTER TABLE meta_insights_daily ADD COLUMN action_values_json jsonb DEFAULT '{}';
  END IF;
  
  -- Adiciona coluna frequency
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meta_insights_daily' AND column_name = 'frequency'
  ) THEN
    ALTER TABLE meta_insights_daily ADD COLUMN frequency numeric DEFAULT 0;
  END IF;
  
  -- Adiciona coluna unique_clicks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meta_insights_daily' AND column_name = 'unique_clicks'
  ) THEN
    ALTER TABLE meta_insights_daily ADD COLUMN unique_clicks bigint DEFAULT 0;
  END IF;
END $$;

-- Índice único para upsert em meta_insights_daily
CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_insights_daily_upsert 
ON meta_insights_daily(workspace_id, meta_ad_account_id, level, entity_id, date);

-- ============================================
-- 7. FUNÇÃO HELPER: is_workspace_member
-- Verifica se o usuário é membro do workspace
-- ============================================
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

-- ============================================
-- 8. FUNÇÃO HELPER: is_workspace_admin
-- Verifica se o usuário é admin/owner do workspace
-- ============================================
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
-- 9. FUNÇÃO: get_user_workspace_id
-- Retorna o workspace_id do usuário atual
-- ============================================
CREATE OR REPLACE FUNCTION get_user_workspace_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT id FROM workspaces WHERE owner_id = auth.uid() LIMIT 1),
    (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() LIMIT 1)
  );
$$;

-- ============================================
-- 10. RLS: workspace_members
-- ============================================
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_select"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_insert"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_admin(workspace_id));

CREATE POLICY "workspace_members_update"
  ON workspace_members FOR UPDATE
  TO authenticated
  USING (is_workspace_admin(workspace_id))
  WITH CHECK (is_workspace_admin(workspace_id));

CREATE POLICY "workspace_members_delete"
  ON workspace_members FOR DELETE
  TO authenticated
  USING (is_workspace_admin(workspace_id));

-- ============================================
-- 11. RLS: meta_entities_cache
-- ============================================
ALTER TABLE meta_entities_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_entities_cache_select"
  ON meta_entities_cache FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "meta_entities_cache_insert"
  ON meta_entities_cache FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "meta_entities_cache_update"
  ON meta_entities_cache FOR UPDATE
  TO authenticated
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "meta_entities_cache_delete"
  ON meta_entities_cache FOR DELETE
  TO authenticated
  USING (is_workspace_admin(workspace_id));

-- ============================================
-- 12. RLS: meta_sync_state
-- ============================================
ALTER TABLE meta_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_sync_state_select"
  ON meta_sync_state FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "meta_sync_state_insert"
  ON meta_sync_state FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "meta_sync_state_update"
  ON meta_sync_state FOR UPDATE
  TO authenticated
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "meta_sync_state_delete"
  ON meta_sync_state FOR DELETE
  TO authenticated
  USING (is_workspace_admin(workspace_id));

-- ============================================
-- 13. RLS: meta_insights_raw
-- ============================================
ALTER TABLE meta_insights_raw ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_insights_raw_select"
  ON meta_insights_raw FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "meta_insights_raw_insert"
  ON meta_insights_raw FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "meta_insights_raw_delete"
  ON meta_insights_raw FOR DELETE
  TO authenticated
  USING (is_workspace_admin(workspace_id));

-- ============================================
-- 14. INSERIR OWNER COMO MEMBRO DO WORKSPACE
-- Para workspaces existentes sem membros
-- ============================================
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT w.id, w.owner_id, 'owner'
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm
  WHERE wm.workspace_id = w.id AND wm.user_id = w.owner_id
)
ON CONFLICT (workspace_id, user_id) DO NOTHING;
