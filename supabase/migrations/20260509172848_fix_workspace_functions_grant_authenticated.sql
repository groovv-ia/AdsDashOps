/*
  # Corrige permissoes das funcoes is_workspace_member e is_workspace_admin

  ## Problema
  A migration 20260509161640 converteu as funcoes para SECURITY INVOKER e revogou
  o EXECUTE do role 'authenticated'. Isso causa erro "permission denied for function
  is_workspace_member" ao tentar criar workspaces, pois as politicas RLS de
  workspace_members chamam essas funcoes — e com SECURITY INVOKER elas tentam
  consultar workspace_members recursivamente, causando falha.

  ## Solucao
  Reconverte para SECURITY DEFINER com search_path fixo (seguro).
  SECURITY DEFINER e necessario para evitar recursao infinita: as funcoes consultam
  workspace_members diretamente sem passar pelo RLS, quebrando o ciclo.
  O GRANT de EXECUTE ao 'authenticated' e necessario para que as politicas RLS
  possam chamar as funcoes durante operacoes do usuario.

  ## Mudancas
  - is_workspace_admin: SECURITY DEFINER, GRANT authenticated
  - is_workspace_member: SECURITY DEFINER, GRANT authenticated
*/

-- Recria is_workspace_admin como SECURITY DEFINER para evitar recursao RLS
CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verifica se o usuario e owner do workspace OU membro com role admin/owner
  RETURN EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = p_workspace_id AND owner_id = auth.uid()
    UNION
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
END;
$$;

-- Recria is_workspace_member como SECURITY DEFINER para evitar recursao RLS
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verifica se o usuario e owner do workspace OU qualquer membro
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

-- Revoga acesso publico antes de re-conceder (limpa estado anterior)
REVOKE EXECUTE ON FUNCTION public.is_workspace_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid) FROM PUBLIC;

-- Concede EXECUTE ao authenticated para que as politicas RLS funcionem
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated;

-- service_role tambem precisa de acesso para operacoes administrativas
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO service_role;
