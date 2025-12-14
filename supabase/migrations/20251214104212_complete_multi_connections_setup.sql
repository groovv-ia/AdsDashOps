/*
  # Completar setup de multi-conexoes

  Corrige nome da coluna timezone_name e finaliza setup
*/

-- =====================================================
-- 1. ADICIONAR workspace_id a client_meta_ad_accounts
-- =====================================================

ALTER TABLE client_meta_ad_accounts 
ADD COLUMN IF NOT EXISTS workspace_id uuid;

UPDATE client_meta_ad_accounts cma
SET workspace_id = c.workspace_id
FROM clients c
WHERE cma.client_id = c.id
AND cma.workspace_id IS NULL;

DELETE FROM client_meta_ad_accounts WHERE workspace_id IS NULL;

DO $$
BEGIN
  BEGIN
    ALTER TABLE client_meta_ad_accounts ALTER COLUMN workspace_id SET NOT NULL;
  EXCEPTION
    WHEN others THEN NULL;
  END;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_client_meta_ad_accounts_workspace'
  ) THEN
    ALTER TABLE client_meta_ad_accounts 
    ADD CONSTRAINT fk_client_meta_ad_accounts_workspace 
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- =====================================================
-- 2. ADICIONAR connection_id
-- =====================================================

ALTER TABLE client_meta_ad_accounts 
ADD COLUMN IF NOT EXISTS connection_id uuid;

UPDATE client_meta_ad_accounts cma
SET connection_id = (
  SELECT mc.id FROM meta_connections mc 
  WHERE mc.workspace_id = cma.workspace_id 
    AND mc.is_default = true 
  LIMIT 1
)
WHERE cma.connection_id IS NULL;

UPDATE client_meta_ad_accounts cma
SET connection_id = (
  SELECT mc.id FROM meta_connections mc 
  WHERE mc.workspace_id = cma.workspace_id 
  ORDER BY mc.created_at ASC
  LIMIT 1
)
WHERE connection_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_client_meta_ad_accounts_connection'
  ) THEN
    ALTER TABLE client_meta_ad_accounts 
    ADD CONSTRAINT fk_client_meta_ad_accounts_connection 
    FOREIGN KEY (connection_id) REFERENCES meta_connections(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- =====================================================
-- 3. CONVERTER meta_ad_account_id de uuid para text
-- =====================================================

DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'client_meta_ad_accounts' AND column_name = 'meta_ad_account_id';
  
  IF col_type = 'uuid' THEN
    ALTER TABLE client_meta_ad_accounts ADD COLUMN meta_ad_account_id_new text;
    
    UPDATE client_meta_ad_accounts cma
    SET meta_ad_account_id_new = ma.meta_ad_account_id
    FROM meta_ad_accounts ma
    WHERE cma.meta_ad_account_id::text = ma.id::text;
    
    ALTER TABLE client_meta_ad_accounts DROP CONSTRAINT IF EXISTS client_meta_ad_accounts_meta_ad_account_id_fkey;
    
    ALTER TABLE client_meta_ad_accounts DROP COLUMN meta_ad_account_id;
    ALTER TABLE client_meta_ad_accounts RENAME COLUMN meta_ad_account_id_new TO meta_ad_account_id;
  END IF;
END $$;

DELETE FROM client_meta_ad_accounts WHERE meta_ad_account_id IS NULL OR meta_ad_account_id = '';

-- =====================================================
-- 4. REMOVER DUPLICADOS E CRIAR INDEXES
-- =====================================================

DELETE FROM client_meta_ad_accounts cma1
USING client_meta_ad_accounts cma2
WHERE cma1.workspace_id = cma2.workspace_id 
  AND cma1.meta_ad_account_id = cma2.meta_ad_account_id
  AND cma1.created_at > cma2.created_at;

DROP INDEX IF EXISTS idx_client_meta_unique_workspace_account;
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_meta_unique_workspace_account 
  ON client_meta_ad_accounts(workspace_id, meta_ad_account_id)
  WHERE meta_ad_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_meta_ad_accounts_client 
  ON client_meta_ad_accounts(client_id);

-- =====================================================
-- 5. AJUSTAR RLS
-- =====================================================

DROP POLICY IF EXISTS "Users can view client ad accounts" ON client_meta_ad_accounts;
DROP POLICY IF EXISTS "Users can insert client ad accounts" ON client_meta_ad_accounts;
DROP POLICY IF EXISTS "Users can update client ad accounts" ON client_meta_ad_accounts;
DROP POLICY IF EXISTS "Users can delete client ad accounts" ON client_meta_ad_accounts;
DROP POLICY IF EXISTS "Users can view workspace client ad accounts" ON client_meta_ad_accounts;
DROP POLICY IF EXISTS "Users can insert workspace client ad accounts" ON client_meta_ad_accounts;
DROP POLICY IF EXISTS "Users can update workspace client ad accounts" ON client_meta_ad_accounts;
DROP POLICY IF EXISTS "Users can delete workspace client ad accounts" ON client_meta_ad_accounts;

CREATE POLICY "Users can view workspace client ad accounts"
  ON client_meta_ad_accounts FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can insert workspace client ad accounts"
  ON client_meta_ad_accounts FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update workspace client ad accounts"
  ON client_meta_ad_accounts FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can delete workspace client ad accounts"
  ON client_meta_ad_accounts FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- =====================================================
-- 6. RECRIAR VIEW de catalogo (usando timezone_name)
-- =====================================================

DROP VIEW IF EXISTS v_ad_accounts_catalog;
CREATE VIEW v_ad_accounts_catalog AS
SELECT 
  ma.id,
  ma.workspace_id,
  ma.meta_ad_account_id,
  ma.name,
  ma.currency,
  ma.timezone_name,
  ma.account_status,
  ma.primary_connection_id,
  mc.name as primary_connection_name,
  ma.last_synced_at,
  cma.client_id as bound_client_id,
  c.name as bound_client_name,
  CASE WHEN cma.id IS NOT NULL THEN true ELSE false END as client_bound,
  cma.status as binding_status,
  cma.connection_id as binding_connection_id
FROM meta_ad_accounts ma
LEFT JOIN meta_connections mc ON mc.id = ma.primary_connection_id
LEFT JOIN client_meta_ad_accounts cma ON cma.workspace_id = ma.workspace_id 
  AND cma.meta_ad_account_id = ma.meta_ad_account_id
LEFT JOIN clients c ON c.id = cma.client_id;
