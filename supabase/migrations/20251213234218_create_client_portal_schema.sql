/*
  # Create Client Portal Schema for Multi-Client Agency Model

  ## Overview
  This migration establishes the foundation for allowing agency clients to access
  a read-only portal to view their campaign data. It creates tables for managing
  client user invitations and client user associations.

  ## 1. New Tables

  ### client_invitations
  Stores pending invitations for client users to access their data portal.

  ### client_users
  Links authenticated users to specific clients for portal access.

  ## 2. Security
  - RLS enabled on all tables
  - Agency users can manage invitations and client users
  - Client users have read-only access to their data

  ## 3. Helper Functions
  - is_agency_user() - Returns true if current user is an agency member
  - get_user_type() - Returns 'agency' or 'client' based on user associations
  - get_client_ids_for_user() - Returns array of client IDs the user can access
*/

-- =============================================================================
-- CLIENT INVITATIONS TABLE
-- =============================================================================

-- Tabela para armazenar convites pendentes para usuarios de clientes
CREATE TABLE IF NOT EXISTS client_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencia ao cliente que o usuario tera acesso
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Email do usuario convidado
  email text NOT NULL,
  
  -- Token unico e seguro para o link de convite
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Usuario da agencia que enviou o convite
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Data de expiracao do convite (padrao: 7 dias)
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  
  -- Data em que o convite foi aceito (null se ainda pendente)
  accepted_at timestamptz,
  
  -- Status atual do convite
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Comentario na tabela
COMMENT ON TABLE client_invitations IS 'Armazena convites para usuarios de clientes acessarem o portal de visualizacao';

-- Indices para otimizacao de consultas
CREATE INDEX IF NOT EXISTS idx_client_invitations_token ON client_invitations(token);
CREATE INDEX IF NOT EXISTS idx_client_invitations_email ON client_invitations(email);
CREATE INDEX IF NOT EXISTS idx_client_invitations_client_id ON client_invitations(client_id);
CREATE INDEX IF NOT EXISTS idx_client_invitations_status ON client_invitations(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_client_invitations_expires_at ON client_invitations(expires_at) WHERE status = 'pending';

-- Habilita RLS
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CLIENT USERS TABLE
-- =============================================================================

-- Tabela que vincula usuarios autenticados a clientes especificos
CREATE TABLE IF NOT EXISTS client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencia ao cliente
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Referencia ao usuario autenticado
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tipo de usuario (sempre 'client' nesta tabela)
  user_type text NOT NULL DEFAULT 'client' CHECK (user_type = 'client'),
  
  -- Se o acesso esta ativo
  is_active boolean NOT NULL DEFAULT true,
  
  -- Convite que originou este acesso (para rastreabilidade)
  invitation_id uuid REFERENCES client_invitations(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Um usuario so pode estar vinculado uma vez a cada cliente
  CONSTRAINT unique_client_user UNIQUE (client_id, user_id)
);

-- Comentario na tabela
COMMENT ON TABLE client_users IS 'Vincula usuarios autenticados a clientes para acesso ao portal de visualizacao';

-- Indices para otimizacao
CREATE INDEX IF NOT EXISTS idx_client_users_user_id ON client_users(user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_client_id ON client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_active ON client_users(user_id, is_active) WHERE is_active = true;

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_client_users_updated_at ON client_users;
CREATE TRIGGER update_client_users_updated_at
  BEFORE UPDATE ON client_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilita RLS
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER FUNCTIONS (criadas apos as tabelas existirem)
-- =============================================================================

-- Funcao que verifica se o usuario atual e um membro de agencia (workspace member)
-- Retorna true se o usuario pertence a algum workspace como owner, admin ou member
CREATE OR REPLACE FUNCTION is_agency_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE user_id = auth.uid()
  );
$$;

-- Funcao que retorna o tipo do usuario: 'agency' se for membro de workspace,
-- 'client' se estiver vinculado a um cliente via client_users
CREATE OR REPLACE FUNCTION get_user_type()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM workspace_members WHERE user_id = auth.uid()) THEN 'agency'
    WHEN EXISTS (SELECT 1 FROM client_users WHERE user_id = auth.uid() AND is_active = true) THEN 'client'
    ELSE 'unknown'
  END;
$$;

-- Funcao que retorna os IDs dos clientes que o usuario atual pode acessar
-- Para usuarios de agencia: retorna todos os clientes do workspace
-- Para usuarios de cliente: retorna apenas os clientes vinculados a ele
CREATE OR REPLACE FUNCTION get_client_ids_for_user()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM workspace_members WHERE user_id = auth.uid()) THEN
      (SELECT ARRAY_AGG(c.id) FROM clients c
       INNER JOIN workspaces w ON c.workspace_id = w.id
       INNER JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE wm.user_id = auth.uid())
    ELSE
      (SELECT ARRAY_AGG(cu.client_id) FROM client_users cu
       WHERE cu.user_id = auth.uid() AND cu.is_active = true)
  END;
$$;

-- =============================================================================
-- RLS POLICIES FOR CLIENT_INVITATIONS
-- =============================================================================

-- Politica: usuarios de agencia podem ver convites dos clientes do seu workspace
CREATE POLICY "Agency users can view client invitations"
  ON client_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      INNER JOIN workspaces w ON c.workspace_id = w.id
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE c.id = client_invitations.client_id
      AND wm.user_id = auth.uid()
    )
  );

-- Politica: usuarios de agencia podem criar convites para clientes do seu workspace
CREATE POLICY "Agency users can create client invitations"
  ON client_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      INNER JOIN workspaces w ON c.workspace_id = w.id
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE c.id = client_invitations.client_id
      AND wm.user_id = auth.uid()
    )
    AND invited_by = auth.uid()
  );

-- Politica: usuarios de agencia podem atualizar convites (revogar, etc)
CREATE POLICY "Agency users can update client invitations"
  ON client_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      INNER JOIN workspaces w ON c.workspace_id = w.id
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE c.id = client_invitations.client_id
      AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      INNER JOIN workspaces w ON c.workspace_id = w.id
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE c.id = client_invitations.client_id
      AND wm.user_id = auth.uid()
    )
  );

-- Politica: usuarios de agencia podem deletar convites pendentes
CREATE POLICY "Agency users can delete client invitations"
  ON client_invitations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      INNER JOIN workspaces w ON c.workspace_id = w.id
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE c.id = client_invitations.client_id
      AND wm.user_id = auth.uid()
    )
    AND status = 'pending'
  );

-- =============================================================================
-- RLS POLICIES FOR CLIENT_USERS
-- =============================================================================

-- Politica: usuarios de agencia podem ver todos os client_users dos seus clientes
CREATE POLICY "Agency users can view client users"
  ON client_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      INNER JOIN workspaces w ON c.workspace_id = w.id
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE c.id = client_users.client_id
      AND wm.user_id = auth.uid()
    )
  );

-- Politica: usuarios de cliente podem ver apenas seu proprio registro
CREATE POLICY "Client users can view own record"
  ON client_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Politica: usuarios de agencia podem criar vinculos de usuarios
CREATE POLICY "Agency users can create client users"
  ON client_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      INNER JOIN workspaces w ON c.workspace_id = w.id
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE c.id = client_users.client_id
      AND wm.user_id = auth.uid()
    )
  );

-- Politica: usuarios de agencia podem atualizar vinculos (ativar/desativar)
CREATE POLICY "Agency users can update client users"
  ON client_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      INNER JOIN workspaces w ON c.workspace_id = w.id
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE c.id = client_users.client_id
      AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      INNER JOIN workspaces w ON c.workspace_id = w.id
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE c.id = client_users.client_id
      AND wm.user_id = auth.uid()
    )
  );

-- Politica: usuarios de agencia podem remover vinculos
CREATE POLICY "Agency users can delete client users"
  ON client_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      INNER JOIN workspaces w ON c.workspace_id = w.id
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE c.id = client_users.client_id
      AND wm.user_id = auth.uid()
    )
  );

-- =============================================================================
-- RLS POLICIES FOR CLIENT ACCESS TO EXISTING TABLES
-- =============================================================================

-- Adiciona politica para usuarios de cliente acessarem meta_insights_daily
DROP POLICY IF EXISTS "Client users can view their client insights" ON meta_insights_daily;
CREATE POLICY "Client users can view their client insights"
  ON meta_insights_daily
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT cu.client_id FROM client_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.is_active = true
    )
  );

-- Adiciona politica para usuarios de cliente acessarem campanhas
DROP POLICY IF EXISTS "Client users can view their client campaigns" ON campaigns;
CREATE POLICY "Client users can view their client campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT cu.client_id FROM client_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.is_active = true
    )
  );

-- Adiciona politica para usuarios de cliente acessarem ad_sets
DROP POLICY IF EXISTS "Client users can view their client ad sets" ON ad_sets;
CREATE POLICY "Client users can view their client ad sets"
  ON ad_sets
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT cu.client_id FROM client_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.is_active = true
    )
  );

-- Adiciona politica para usuarios de cliente acessarem ads
DROP POLICY IF EXISTS "Client users can view their client ads" ON ads;
CREATE POLICY "Client users can view their client ads"
  ON ads
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT cu.client_id FROM client_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.is_active = true
    )
  );

-- Adiciona politica para usuarios de cliente acessarem ad_metrics
DROP POLICY IF EXISTS "Client users can view their client metrics" ON ad_metrics;
CREATE POLICY "Client users can view their client metrics"
  ON ad_metrics
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT cu.client_id FROM client_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.is_active = true
    )
  );

-- Adiciona politica para usuarios de cliente verem seu proprio cliente
DROP POLICY IF EXISTS "Client users can view their client profile" ON clients;
CREATE POLICY "Client users can view their client profile"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT cu.client_id FROM client_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.is_active = true
    )
  );