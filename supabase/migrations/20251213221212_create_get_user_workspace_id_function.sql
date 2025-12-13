/*
  # Criar funcao get_user_workspace_id
  
  1. Nova Funcao
    - `get_user_workspace_id()` - Retorna o workspace_id do usuario autenticado
    
  2. Funcionalidade
    - Busca o workspace onde o usuario atual e owner
    - Retorna o UUID do workspace ou NULL se nao encontrado
    
  3. Seguranca
    - Funcao usa auth.uid() para garantir que so retorna dados do usuario autenticado
*/

-- Criar funcao para obter workspace_id do usuario
CREATE OR REPLACE FUNCTION get_user_workspace_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  workspace_uuid uuid;
BEGIN
  -- Busca o workspace onde o usuario e owner
  SELECT id INTO workspace_uuid
  FROM workspaces
  WHERE owner_id = auth.uid()
  LIMIT 1;
  
  RETURN workspace_uuid;
END;
$$;

-- Conceder permissao para usuarios autenticados executarem a funcao
GRANT EXECUTE ON FUNCTION get_user_workspace_id() TO authenticated;
