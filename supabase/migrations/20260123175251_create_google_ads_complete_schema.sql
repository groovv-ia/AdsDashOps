/*
  # Esquema Completo Google Ads - Campanhas, Ad Groups, Anuncios e Palavras-chave

  1. Novas Tabelas
    - `google_campaigns`: Armazena campanhas do Google Ads
      - `id` (uuid, primary key) - ID interno
      - `workspace_id` (uuid) - Referencia ao workspace
      - `account_id` (uuid) - Referencia a conta Google Ads
      - `customer_id` (text) - Customer ID do Google Ads
      - `campaign_id` (text) - ID da campanha no Google Ads
      - `name` (text) - Nome da campanha
      - `status` (text) - ENABLED, PAUSED, REMOVED
      - `advertising_channel_type` (text) - SEARCH, DISPLAY, VIDEO, etc.
      - `bidding_strategy_type` (text) - Estrategia de lance
      - `budget_amount_micros` (bigint) - Orcamento em micros
      - `start_date` (date) - Data de inicio
      - `end_date` (date) - Data de fim
      - `created_at`, `updated_at` (timestamps)
    
    - `google_ad_groups`: Armazena grupos de anuncios
      - `id` (uuid, primary key) - ID interno
      - `workspace_id` (uuid) - Referencia ao workspace
      - `account_id` (uuid) - Referencia a conta
      - `campaign_id` (text) - ID da campanha pai
      - `ad_group_id` (text) - ID do ad group no Google Ads
      - `name` (text) - Nome do grupo
      - `status` (text) - ENABLED, PAUSED, REMOVED
      - `type` (text) - Tipo do ad group
      - `cpc_bid_micros` (bigint) - Lance CPC em micros
      - `target_cpa_micros` (bigint) - CPA alvo em micros
      - `created_at`, `updated_at` (timestamps)
    
    - `google_ads`: Armazena anuncios individuais
      - `id` (uuid, primary key) - ID interno
      - `workspace_id` (uuid) - Referencia ao workspace
      - `account_id` (uuid) - Referencia a conta
      - `campaign_id` (text) - ID da campanha
      - `ad_group_id` (text) - ID do ad group
      - `ad_id` (text) - ID do anuncio no Google Ads
      - `name` (text) - Nome/titulo do anuncio
      - `status` (text) - ENABLED, PAUSED, REMOVED
      - `type` (text) - Tipo do anuncio (RESPONSIVE_SEARCH, etc.)
      - `final_urls` (jsonb) - URLs finais
      - `headlines` (jsonb) - Titulos (RSA)
      - `descriptions` (jsonb) - Descricoes (RSA)
      - `created_at`, `updated_at` (timestamps)
    
    - `google_keywords`: Armazena palavras-chave
      - `id` (uuid, primary key) - ID interno
      - `workspace_id` (uuid) - Referencia ao workspace
      - `account_id` (uuid) - Referencia a conta
      - `campaign_id` (text) - ID da campanha
      - `ad_group_id` (text) - ID do ad group
      - `keyword_id` (text) - ID da keyword no Google Ads
      - `text` (text) - Texto da palavra-chave
      - `match_type` (text) - EXACT, PHRASE, BROAD
      - `status` (text) - ENABLED, PAUSED, REMOVED
      - `quality_score` (integer) - Quality Score (1-10)
      - `cpc_bid_micros` (bigint) - Lance CPC em micros
      - `created_at`, `updated_at` (timestamps)

  2. Alteracoes
    - Adiciona campos de keyword na tabela google_insights_daily

  3. Seguranca
    - RLS habilitado em todas as tabelas
    - Policies para owners e membros do workspace
    
  4. Indices
    - Indices otimizados para consultas frequentes
*/

-- =====================================================
-- TABELA: google_campaigns
-- =====================================================
CREATE TABLE IF NOT EXISTS google_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id uuid REFERENCES google_ad_accounts(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  campaign_id text NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'ENABLED',
  advertising_channel_type text,
  bidding_strategy_type text,
  budget_amount_micros bigint DEFAULT 0,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, customer_id, campaign_id)
);

-- Indices para google_campaigns
CREATE INDEX IF NOT EXISTS idx_google_campaigns_workspace ON google_campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_google_campaigns_account ON google_campaigns(account_id);
CREATE INDEX IF NOT EXISTS idx_google_campaigns_customer ON google_campaigns(customer_id);
CREATE INDEX IF NOT EXISTS idx_google_campaigns_status ON google_campaigns(status);

-- RLS para google_campaigns
ALTER TABLE google_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "google_campaigns_select_policy" ON google_campaigns
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "google_campaigns_insert_policy" ON google_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "google_campaigns_update_policy" ON google_campaigns
  FOR UPDATE TO authenticated
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

CREATE POLICY "google_campaigns_delete_policy" ON google_campaigns
  FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- TABELA: google_ad_groups
-- =====================================================
CREATE TABLE IF NOT EXISTS google_ad_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id uuid REFERENCES google_ad_accounts(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  campaign_id text NOT NULL,
  ad_group_id text NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'ENABLED',
  type text,
  cpc_bid_micros bigint DEFAULT 0,
  target_cpa_micros bigint,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, customer_id, ad_group_id)
);

-- Indices para google_ad_groups
CREATE INDEX IF NOT EXISTS idx_google_ad_groups_workspace ON google_ad_groups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_google_ad_groups_campaign ON google_ad_groups(campaign_id);
CREATE INDEX IF NOT EXISTS idx_google_ad_groups_status ON google_ad_groups(status);

-- RLS para google_ad_groups
ALTER TABLE google_ad_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "google_ad_groups_select_policy" ON google_ad_groups
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "google_ad_groups_insert_policy" ON google_ad_groups
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "google_ad_groups_update_policy" ON google_ad_groups
  FOR UPDATE TO authenticated
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

CREATE POLICY "google_ad_groups_delete_policy" ON google_ad_groups
  FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- TABELA: google_ads
-- =====================================================
CREATE TABLE IF NOT EXISTS google_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id uuid REFERENCES google_ad_accounts(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  campaign_id text NOT NULL,
  ad_group_id text NOT NULL,
  ad_id text NOT NULL,
  name text,
  status text DEFAULT 'ENABLED',
  type text,
  final_urls jsonb DEFAULT '[]'::jsonb,
  headlines jsonb DEFAULT '[]'::jsonb,
  descriptions jsonb DEFAULT '[]'::jsonb,
  path1 text,
  path2 text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, customer_id, ad_id)
);

-- Indices para google_ads
CREATE INDEX IF NOT EXISTS idx_google_ads_workspace ON google_ads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_campaign ON google_ads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_ad_group ON google_ads(ad_group_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_status ON google_ads(status);

-- RLS para google_ads
ALTER TABLE google_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "google_ads_select_policy" ON google_ads
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "google_ads_insert_policy" ON google_ads
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "google_ads_update_policy" ON google_ads
  FOR UPDATE TO authenticated
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

CREATE POLICY "google_ads_delete_policy" ON google_ads
  FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- TABELA: google_keywords
-- =====================================================
CREATE TABLE IF NOT EXISTS google_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id uuid REFERENCES google_ad_accounts(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  campaign_id text NOT NULL,
  ad_group_id text NOT NULL,
  keyword_id text NOT NULL,
  text text NOT NULL,
  match_type text DEFAULT 'BROAD',
  status text DEFAULT 'ENABLED',
  quality_score integer,
  cpc_bid_micros bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, customer_id, keyword_id)
);

-- Indices para google_keywords
CREATE INDEX IF NOT EXISTS idx_google_keywords_workspace ON google_keywords(workspace_id);
CREATE INDEX IF NOT EXISTS idx_google_keywords_campaign ON google_keywords(campaign_id);
CREATE INDEX IF NOT EXISTS idx_google_keywords_ad_group ON google_keywords(ad_group_id);
CREATE INDEX IF NOT EXISTS idx_google_keywords_status ON google_keywords(status);
CREATE INDEX IF NOT EXISTS idx_google_keywords_quality ON google_keywords(quality_score);

-- RLS para google_keywords
ALTER TABLE google_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "google_keywords_select_policy" ON google_keywords
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "google_keywords_insert_policy" ON google_keywords
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "google_keywords_update_policy" ON google_keywords
  FOR UPDATE TO authenticated
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

CREATE POLICY "google_keywords_delete_policy" ON google_keywords
  FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- ALTERACOES: google_insights_daily
-- Adiciona campos para metricas de keywords
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_insights_daily' AND column_name = 'keyword_id'
  ) THEN
    ALTER TABLE google_insights_daily ADD COLUMN keyword_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_insights_daily' AND column_name = 'keyword_text'
  ) THEN
    ALTER TABLE google_insights_daily ADD COLUMN keyword_text text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_insights_daily' AND column_name = 'ad_name'
  ) THEN
    ALTER TABLE google_insights_daily ADD COLUMN ad_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_insights_daily' AND column_name = 'device'
  ) THEN
    ALTER TABLE google_insights_daily ADD COLUMN device text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_insights_daily' AND column_name = 'network'
  ) THEN
    ALTER TABLE google_insights_daily ADD COLUMN network text;
  END IF;
END $$;

-- Indice para keyword_id
CREATE INDEX IF NOT EXISTS idx_google_insights_keyword ON google_insights_daily(keyword_id);

-- =====================================================
-- FUNCAO: Atualiza updated_at automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_google_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS trigger_google_campaigns_updated_at ON google_campaigns;
CREATE TRIGGER trigger_google_campaigns_updated_at
  BEFORE UPDATE ON google_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_google_updated_at();

DROP TRIGGER IF EXISTS trigger_google_ad_groups_updated_at ON google_ad_groups;
CREATE TRIGGER trigger_google_ad_groups_updated_at
  BEFORE UPDATE ON google_ad_groups
  FOR EACH ROW EXECUTE FUNCTION update_google_updated_at();

DROP TRIGGER IF EXISTS trigger_google_ads_updated_at ON google_ads;
CREATE TRIGGER trigger_google_ads_updated_at
  BEFORE UPDATE ON google_ads
  FOR EACH ROW EXECUTE FUNCTION update_google_updated_at();

DROP TRIGGER IF EXISTS trigger_google_keywords_updated_at ON google_keywords;
CREATE TRIGGER trigger_google_keywords_updated_at
  BEFORE UPDATE ON google_keywords
  FOR EACH ROW EXECUTE FUNCTION update_google_updated_at();
