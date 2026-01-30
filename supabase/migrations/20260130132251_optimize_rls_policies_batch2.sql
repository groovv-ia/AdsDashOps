/*
  # Optimize RLS Policies - Batch 2

  Tables optimized:
    - oauth_tokens
    - clients
    - sync_logs
    - workspaces
    - meta_connections
*/

-- =====================================================
-- OAUTH_TOKENS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can delete own tokens" ON oauth_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON oauth_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON oauth_tokens;
DROP POLICY IF EXISTS "Users can view own tokens" ON oauth_tokens;

CREATE POLICY "oauth_tokens_select_own"
  ON oauth_tokens FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "oauth_tokens_insert_own"
  ON oauth_tokens FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "oauth_tokens_update_own"
  ON oauth_tokens FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "oauth_tokens_delete_own"
  ON oauth_tokens FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- CLIENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can create own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Client users view assigned client" ON clients;

CREATE POLICY "clients_select_own"
  ON clients FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "clients_insert_own"
  ON clients FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "clients_update_own"
  ON clients FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "clients_delete_own"
  ON clients FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- SYNC_LOGS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can create own sync logs" ON sync_logs;
DROP POLICY IF EXISTS "Users can delete own sync logs" ON sync_logs;

CREATE POLICY "sync_logs_insert_own"
  ON sync_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "sync_logs_delete_own"
  ON sync_logs FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- WORKSPACES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can create own workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can delete own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can insert own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update own workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can update own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view own workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they are member of" ON workspaces;

CREATE POLICY "workspaces_select_own"
  ON workspaces FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid()));

CREATE POLICY "workspaces_select_member"
  ON workspaces FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = (select auth.uid())
    )
  );

CREATE POLICY "workspaces_insert_own"
  ON workspaces FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "workspaces_update_own"
  ON workspaces FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "workspaces_delete_own"
  ON workspaces FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()));

-- =====================================================
-- META_CONNECTIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can create connections in own workspace" ON meta_connections;
DROP POLICY IF EXISTS "Users can update own workspace connections" ON meta_connections;
DROP POLICY IF EXISTS "Users can view own workspace connections" ON meta_connections;

CREATE POLICY "meta_connections_select_workspace"
  ON meta_connections FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = (select auth.uid())
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "meta_connections_insert_workspace"
  ON meta_connections FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = (select auth.uid())
    )
  );

CREATE POLICY "meta_connections_update_workspace"
  ON meta_connections FOR UPDATE TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = (select auth.uid())
    )
  );
