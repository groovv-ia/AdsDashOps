/*
  # Adicionar campo onboarding_completed

  1. Alterações
    - Adiciona coluna `onboarding_completed` na tabela `profiles`
    - Define valor padrão como `false` para novos usuários
    - Adiciona índice para otimizar consultas

  2. Notas
    - Campo utilizado para controlar se usuário já visualizou o onboarding
    - Não afeta segurança RLS existente
*/

-- Adiciona coluna onboarding_completed na tabela profiles se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;
END $$;

-- Cria índice para otimizar consultas de onboarding
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed
  ON profiles(onboarding_completed);

-- Atualiza usuários existentes para ter onboarding_completed = false
UPDATE profiles
SET onboarding_completed = false
WHERE onboarding_completed IS NULL;
