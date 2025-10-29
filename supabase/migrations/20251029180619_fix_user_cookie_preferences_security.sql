/*
  # Corrigir problemas de segurança e performance na tabela user_cookie_preferences

  1. Correções de RLS Performance
    - Atualizar todas as políticas RLS para usar (select auth.uid()) ao invés de auth.uid()
    - Isso evita re-avaliação da função para cada linha, melhorando performance

  2. Remover Índices
    - Remover índice duplicado idx_user_cookie_preferences_user_id (já existe user_cookie_preferences_user_id_key via UNIQUE constraint)
    - Remover índice não utilizado idx_user_cookie_preferences_version

  3. Corrigir Função
    - Adicionar SET search_path = '' à função update_user_cookie_preferences_updated_at para segurança
    - Isso previne ataques de search path injection

  4. Notas
    - As políticas RLS continuam funcionando da mesma forma, apenas com melhor performance
    - A remoção de índices não utilizados libera espaço e simplifica a estrutura
    - A função continua funcionando normalmente, mas de forma mais segura
*/

-- 1. Drop todas as políticas RLS existentes
DROP POLICY IF EXISTS "Users can view own cookie preferences" ON user_cookie_preferences;
DROP POLICY IF EXISTS "Users can insert own cookie preferences" ON user_cookie_preferences;
DROP POLICY IF EXISTS "Users can update own cookie preferences" ON user_cookie_preferences;
DROP POLICY IF EXISTS "Users can delete own cookie preferences" ON user_cookie_preferences;

-- 2. Recriar políticas RLS com (select auth.uid()) para melhor performance
CREATE POLICY "Users can view own cookie preferences"
  ON user_cookie_preferences
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own cookie preferences"
  ON user_cookie_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own cookie preferences"
  ON user_cookie_preferences
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own cookie preferences"
  ON user_cookie_preferences
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- 3. Remover índice duplicado (a UNIQUE constraint já cria um índice)
DROP INDEX IF EXISTS idx_user_cookie_preferences_user_id;

-- 4. Remover índice não utilizado
DROP INDEX IF EXISTS idx_user_cookie_preferences_version;

-- 5. Recriar função com search_path seguro
CREATE OR REPLACE FUNCTION update_user_cookie_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Comentários atualizados
COMMENT ON FUNCTION update_user_cookie_preferences_updated_at() IS 
'Atualiza automaticamente o campo updated_at. Usa search_path vazio para segurança.';
