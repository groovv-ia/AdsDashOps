/*
  # Correção de Recursão Infinita em Políticas RLS

  ## Problema Identificado
  As políticas da tabela `client_users` faziam referência à tabela `clients`,
  que por sua vez tinha uma política que referenciava `client_users`,
  criando um loop infinito de verificação de permissões.

  ## Solução
  1. Remover política problemática da tabela `clients` que causa a recursão
  2. Reescrever políticas de `client_users` para usar verificações diretas
     sem dependências circulares
  3. Criar função auxiliar SECURITY DEFINER para evitar recursão

  ## Alterações
  - Remove política "Client users can view their client profile" de `clients`
  - Recria políticas de `client_users` com verificações simplificadas
  - Adiciona função auxiliar para verificar workspace membership sem RLS
*/

-- Passo 1: Criar função auxiliar SECURITY DEFINER para verificar membership
-- Esta função bypassa RLS e evita recursão
CREATE OR REPLACE FUNCTION public.check_workspace_membership_for_client(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM clients c
    JOIN workspaces w ON c.workspace_id = w.id
    JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE c.id = p_client_id 
    AND wm.user_id = auth.uid()
  );
$$;

-- Passo 2: Remover política problemática que causa recursão em clients
DROP POLICY IF EXISTS "Client users can view their client profile" ON clients;

-- Passo 3: Remover políticas existentes de client_users
DROP POLICY IF EXISTS "Agency users can view client users" ON client_users;
DROP POLICY IF EXISTS "Agency users can create client users" ON client_users;
DROP POLICY IF EXISTS "Agency users can update client users" ON client_users;
DROP POLICY IF EXISTS "Agency users can delete client users" ON client_users;
DROP POLICY IF EXISTS "Client users can view own record" ON client_users;

-- Passo 4: Recriar políticas de client_users usando a função auxiliar

-- Política SELECT: Usuários da agência podem ver client_users de seus clientes
CREATE POLICY "Agency can view client users"
ON client_users
FOR SELECT
TO authenticated
USING (
  public.check_workspace_membership_for_client(client_id)
);

-- Política SELECT adicional: Usuários de cliente podem ver seu próprio registro
CREATE POLICY "Client users view own"
ON client_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política INSERT: Usuários da agência podem criar client_users
CREATE POLICY "Agency can create client users"
ON client_users
FOR INSERT
TO authenticated
WITH CHECK (
  public.check_workspace_membership_for_client(client_id)
);

-- Política UPDATE: Usuários da agência podem atualizar client_users
CREATE POLICY "Agency can update client users"
ON client_users
FOR UPDATE
TO authenticated
USING (public.check_workspace_membership_for_client(client_id))
WITH CHECK (public.check_workspace_membership_for_client(client_id));

-- Política DELETE: Usuários da agência podem deletar client_users
CREATE POLICY "Agency can delete client users"
ON client_users
FOR DELETE
TO authenticated
USING (public.check_workspace_membership_for_client(client_id));

-- Passo 5: Criar nova política para clients permitir visualização por client_users
-- Usando uma abordagem sem recursão (via user_id direto)
CREATE POLICY "Client users view assigned client"
ON clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_users cu
    WHERE cu.client_id = clients.id
    AND cu.user_id = auth.uid()
    AND cu.is_active = true
  )
);
