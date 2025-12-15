/*
  # Simplifica RLS para meta_ad_creatives
  
  1. Problema
    - A politica atual pode estar causando problemas de performance
    - Usa subqueries complexas que podem falhar em certas condicoes
  
  2. Solucao
    - Simplifica a politica SELECT para usar funcao SECURITY DEFINER
    - Mantem seguranca mas melhora performance
*/

-- Remove politica existente de SELECT
DROP POLICY IF EXISTS "Users can view workspace ad creatives" ON meta_ad_creatives;

-- Cria nova politica simplificada usando a funcao existente
CREATE POLICY "Users can view workspace ad creatives"
ON meta_ad_creatives
FOR SELECT
TO authenticated
USING (is_workspace_member(workspace_id));