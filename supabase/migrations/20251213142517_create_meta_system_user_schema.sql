/*
  # Schema para Sistema de Agência com Meta System User

  ## Novas Tabelas
  
  1. **workspaces**
     - `id` (uuid, primary key)
     - `name` (text) - Nome da agência
     - `owner_id` (uuid) - ID do usuário dono
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
  
  2. **meta_connections**
     - `id` (uuid, primary key)
     - `workspace_id` (uuid, foreign key)
     - `business_manager_id` (text) - ID do Business Manager
     - `access_token_encrypted` (text) - Token criptografado do System User
     - `granted_scopes` (text[]) - Escopos concedidos
     - `status` (text) - connected | invalid | revoked
     - `last_validated_at` (timestamptz)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
  
  3. **meta_ad_accounts**
     - `id` (uuid, primary key)
     - `workspace_id` (uuid, foreign key)
     - `meta_ad_account_id` (text) - ID da conta Meta (act_*)
     - `name` (text)
     - `currency` (text)
     - `timezone` (text)
     - `account_status` (text)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
  
  4. **client_meta_ad_accounts**
     - `id` (uuid, primary key)
     - `client_id` (uuid, foreign key)
     - `meta_ad_account_id` (uuid, foreign key)
     - `status` (text) - active | inactive
     - `created_at` (timestamptz)
  
  5. **meta_sync_jobs**
     - `id` (uuid, primary key)
     - `workspace_id` (uuid, foreign key)
     - `job_type` (text) - backfill | daily | fast
     - `date_from` (date)
     - `date_to` (date)
     - `status` (text) - pending | running | completed | failed
     - `progress_percentage` (integer)
     - `error_message` (text)
     - `started_at` (timestamptz)
     - `ended_at` (timestamptz)
     - `created_at` (timestamptz)
  
  6. **meta_insights_daily**
     - `id` (uuid, primary key)
     - `workspace_id` (uuid, foreign key)
     - `client_id` (uuid, foreign key)
     - `meta_ad_account_id` (uuid, foreign key)
     - `level` (text) - account | campaign | adset | ad
     - `entity_id` (text) - ID da entidade (campanha, adset, ad)
     - `entity_name` (text)
     - `date` (date)
     - `spend` (numeric)
     - `impressions` (bigint)
     - `reach` (bigint)
     - `clicks` (bigint)
     - `ctr` (numeric)
     - `cpc` (numeric)
     - `cpm` (numeric)
     - `actions_json` (jsonb)
     - `created_at` (timestamptz)

  ## Segurança
  - RLS habilitado em todas as tabelas
  - Usuários só acessam dados do próprio workspace
  - Tokens sempre criptografados
*/

-- Criar tabela workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela meta_connections
CREATE TABLE IF NOT EXISTS meta_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_manager_id text NOT NULL,
  access_token_encrypted text NOT NULL,
  granted_scopes text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'invalid', 'revoked')),
  last_validated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela meta_ad_accounts
CREATE TABLE IF NOT EXISTS meta_ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  meta_ad_account_id text NOT NULL UNIQUE,
  name text NOT NULL,
  currency text DEFAULT 'USD',
  timezone text DEFAULT 'UTC',
  account_status text DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela client_meta_ad_accounts (vínculo)
CREATE TABLE IF NOT EXISTS client_meta_ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  meta_ad_account_id uuid NOT NULL REFERENCES meta_ad_accounts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, meta_ad_account_id)
);

-- Criar tabela meta_sync_jobs
CREATE TABLE IF NOT EXISTS meta_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('backfill', 'daily', 'fast')),
  date_from date NOT NULL,
  date_to date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress_percentage integer DEFAULT 0,
  error_message text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela meta_insights_daily
CREATE TABLE IF NOT EXISTS meta_insights_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  meta_ad_account_id uuid NOT NULL REFERENCES meta_ad_accounts(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('account', 'campaign', 'adset', 'ad')),
  entity_id text NOT NULL,
  entity_name text,
  date date NOT NULL,
  spend numeric(12, 2) DEFAULT 0,
  impressions bigint DEFAULT 0,
  reach bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  ctr numeric(5, 2) DEFAULT 0,
  cpc numeric(8, 2) DEFAULT 0,
  cpm numeric(8, 2) DEFAULT 0,
  actions_json jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(meta_ad_account_id, level, entity_id, date)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_meta_connections_workspace ON meta_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_workspace ON meta_ad_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_meta_id ON meta_ad_accounts(meta_ad_account_id);
CREATE INDEX IF NOT EXISTS idx_client_meta_ad_accounts_client ON client_meta_ad_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_meta_ad_accounts_account ON client_meta_ad_accounts(meta_ad_account_id);
CREATE INDEX IF NOT EXISTS idx_meta_sync_jobs_workspace ON meta_sync_jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_sync_jobs_status ON meta_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_meta_insights_workspace ON meta_insights_daily(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_insights_client ON meta_insights_daily(client_id);
CREATE INDEX IF NOT EXISTS idx_meta_insights_account ON meta_insights_daily(meta_ad_account_id);
CREATE INDEX IF NOT EXISTS idx_meta_insights_date ON meta_insights_daily(date);
CREATE INDEX IF NOT EXISTS idx_meta_insights_level ON meta_insights_daily(level);

-- Habilitar RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_insights_daily ENABLE ROW LEVEL SECURITY;

-- Policies para workspaces
CREATE POLICY "Users can view own workspace"
  ON workspaces FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create own workspace"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own workspace"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policies para meta_connections
CREATE POLICY "Users can view own workspace connections"
  ON meta_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = meta_connections.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create connections in own workspace"
  ON meta_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = meta_connections.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own workspace connections"
  ON meta_connections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = meta_connections.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = meta_connections.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

-- Policies para meta_ad_accounts
CREATE POLICY "Users can view own workspace ad accounts"
  ON meta_ad_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = meta_ad_accounts.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create ad accounts in own workspace"
  ON meta_ad_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = meta_ad_accounts.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own workspace ad accounts"
  ON meta_ad_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = meta_ad_accounts.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = meta_ad_accounts.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

-- Policies para client_meta_ad_accounts
CREATE POLICY "Users can view own client ad account links"
  ON client_meta_ad_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_meta_ad_accounts.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create client ad account links"
  ON client_meta_ad_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_meta_ad_accounts.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own client ad account links"
  ON client_meta_ad_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_meta_ad_accounts.client_id
      AND clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_meta_ad_accounts.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own client ad account links"
  ON client_meta_ad_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_meta_ad_accounts.client_id
      AND clients.user_id = auth.uid()
    )
  );

-- Policies para meta_sync_jobs
CREATE POLICY "Users can view own workspace sync jobs"
  ON meta_sync_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = meta_sync_jobs.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sync jobs in own workspace"
  ON meta_sync_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = meta_sync_jobs.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own workspace sync jobs"
  ON meta_sync_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = meta_sync_jobs.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = meta_sync_jobs.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

-- Policies para meta_insights_daily
CREATE POLICY "Users can view own workspace insights"
  ON meta_insights_daily FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = meta_insights_daily.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert insights"
  ON meta_insights_daily FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = meta_insights_daily.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

-- Adicionar coluna workspace_id na tabela clients se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_clients_workspace ON clients(workspace_id);
  END IF;
END $$;
