/*
  # Rollback Multi-Connections Setup

  Esta migração reverte as alterações da migração 20251214104212
  que causaram problemas na conexão Meta Ads.

  1. Remove view e índices novos
  2. Reverte políticas RLS
  3. Restaura estrutura anterior
  4. Mantém dados importantes
*/

-- =====================================================
-- 1. REMOVER VIEW E ÍNDICES
-- =====================================================

DROP VIEW IF EXISTS v_ad_accounts_catalog;

DROP INDEX IF EXISTS idx_client_meta_unique_workspace_account;
DROP INDEX IF EXISTS idx_client_meta_ad_accounts_client;

-- =====================================================
-- 2. REMOVER CONSTRAINTS NOVOS
-- =====================================================

ALTER TABLE client_meta_ad_accounts DROP CONSTRAINT IF EXISTS fk_client_meta_ad_accounts_workspace;
ALTER TABLE client_meta_ad_accounts DROP CONSTRAINT IF EXISTS fk_client_meta_ad_accounts_connection;

-- =====================================================
-- 3. REVERTER POLÍTICAS RLS
-- =====================================================

DROP POLICY IF EXISTS "Users can view workspace client ad accounts" ON client_meta_ad_accounts;
DROP POLICY IF EXISTS "Users can insert workspace client ad accounts" ON client_meta_ad_accounts;
DROP POLICY IF EXISTS "Users can update workspace client ad accounts" ON client_meta_ad_accounts;
DROP POLICY IF EXISTS "Users can delete workspace client ad accounts" ON client_meta_ad_accounts;

-- Restaura políticas anteriores baseadas em user_id
CREATE POLICY "Users can view their client ad accounts"
  ON client_meta_ad_accounts FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert their client ad accounts"
  ON client_meta_ad_accounts FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their client ad accounts"
  ON client_meta_ad_accounts FOR UPDATE TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their client ad accounts"
  ON client_meta_ad_accounts FOR DELETE TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  );

-- =====================================================
-- 4. TORNAR COLUNAS OPCIONAIS
-- =====================================================

-- Remove NOT NULL das colunas adicionadas
ALTER TABLE client_meta_ad_accounts ALTER COLUMN workspace_id DROP NOT NULL;
ALTER TABLE client_meta_ad_accounts ALTER COLUMN connection_id DROP NOT NULL;

-- =====================================================
-- 5. RECRIAR ÍNDICES ÚTEIS (NÃO ÚNICOS)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_client_meta_ad_accounts_workspace
  ON client_meta_ad_accounts(workspace_id);

CREATE INDEX IF NOT EXISTS idx_client_meta_ad_accounts_connection
  ON client_meta_ad_accounts(connection_id);

CREATE INDEX IF NOT EXISTS idx_client_meta_ad_accounts_client_lookup
  ON client_meta_ad_accounts(client_id);

-- =====================================================
-- 6. GARANTIR QUE TABELAS ESSENCIAIS EXISTEM
-- =====================================================

-- Verifica se meta_connections existe e tem os campos necessários
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'meta_connections'
  ) THEN
    CREATE TABLE meta_connections (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name text NOT NULL,
      business_manager_id text,
      system_user_token_encrypted text,
      status text DEFAULT 'disconnected',
      is_default boolean DEFAULT false,
      granted_scopes text[],
      last_validated_at timestamptz,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    ALTER TABLE meta_connections ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view workspace meta connections"
      ON meta_connections FOR SELECT TO authenticated
      USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

    CREATE POLICY "Users can insert workspace meta connections"
      ON meta_connections FOR INSERT TO authenticated
      WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

    CREATE POLICY "Users can update workspace meta connections"
      ON meta_connections FOR UPDATE TO authenticated
      USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
      WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

    CREATE POLICY "Users can delete workspace meta connections"
      ON meta_connections FOR DELETE TO authenticated
      USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- Verifica se meta_ad_accounts existe e tem os campos necessários
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'meta_ad_accounts'
  ) THEN
    CREATE TABLE meta_ad_accounts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      meta_ad_account_id text UNIQUE NOT NULL,
      name text NOT NULL,
      currency text DEFAULT 'USD',
      timezone_name text DEFAULT 'UTC',
      account_status text DEFAULT 'ACTIVE',
      primary_connection_id uuid REFERENCES meta_connections(id) ON DELETE SET NULL,
      last_synced_at timestamptz,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    ALTER TABLE meta_ad_accounts ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view workspace meta ad accounts"
      ON meta_ad_accounts FOR SELECT TO authenticated
      USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

    CREATE POLICY "Users can insert workspace meta ad accounts"
      ON meta_ad_accounts FOR INSERT TO authenticated
      WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

    CREATE POLICY "Users can update workspace meta ad accounts"
      ON meta_ad_accounts FOR UPDATE TO authenticated
      USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
      WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

    CREATE POLICY "Users can delete workspace meta ad accounts"
      ON meta_ad_accounts FOR DELETE TO authenticated
      USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
  END IF;
END $$;
