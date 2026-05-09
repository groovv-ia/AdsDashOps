/*
  # Corrige seguranca das funcoes is_workspace_admin e is_workspace_member

  ## Problema
  As funcoes publicas is_workspace_admin() e is_workspace_member() estao
  declaradas como SECURITY DEFINER, permitindo que usuarios autenticados
  as chamem via /rest/v1/rpc/ com privilegios elevados.

  ## Solucao
  - Converte para SECURITY INVOKER: executam com os privilegios do chamador,
    nao do owner. Correto pois so acessam tabelas publicas com auth.uid().
  - Revoga EXECUTE do role 'authenticated' para bloquear chamadas diretas via RPC.
    As funcoes continuam usaveis internamente em politicas RLS (executadas
    pelo postgres/service_role, nao pelo usuario final).

  ## Impacto
  Nenhum: as funcoes sao helpers para politicas RLS, nao endpoints publicos.
  O comportamento logico permanece identico — apenas o contexto de execucao muda.
*/

-- Recria is_workspace_admin como SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = p_workspace_id AND owner_id = auth.uid()
    UNION
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
END;
$$;

-- Recria is_workspace_member como SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = p_workspace_id AND owner_id = auth.uid()
    UNION
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
  );
END;
$$;

-- Revoga chamada direta via RPC pelo role authenticated
-- (as funcoes continuam acessiveis internamente pelo postgres para politicas RLS)
REVOKE EXECUTE ON FUNCTION public.is_workspace_admin(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid) FROM authenticated;

-- Garante que anon tambem nao tenha acesso
REVOKE EXECUTE ON FUNCTION public.is_workspace_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid) FROM anon;
