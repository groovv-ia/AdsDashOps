/*
  # Criar tabela de preferências de cookies do usuário

  1. Nova Tabela
    - `user_cookie_preferences`
      - `id` (uuid, primary key, auto-gerado)
      - `user_id` (uuid, foreign key para auth.users, unique)
      - `necessary` (boolean, default true) - Cookies necessários
      - `functional` (boolean, default false) - Cookies funcionais
      - `marketing` (boolean, default false) - Cookies de marketing
      - `consent_date` (timestamptz) - Data do consentimento
      - `consent_version` (text) - Versão da política de cookies
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Segurança
    - Ativar RLS na tabela `user_cookie_preferences`
    - Adicionar política para usuários autenticados visualizarem suas próprias preferências
    - Adicionar política para usuários autenticados inserirem suas próprias preferências
    - Adicionar política para usuários autenticados atualizarem suas próprias preferências

  3. Índices
    - Criar índice único em `user_id` para consultas rápidas
    - Criar índice em `consent_version` para verificação de versões

  4. Notas Importantes
    - Cada usuário tem apenas um registro de preferências
    - As preferências são sincronizadas entre localStorage e banco de dados
    - Cookies necessários são sempre true (não podem ser desabilitados)
    - A versão é usada para forçar re-consentimento quando a política muda
*/

-- Criar tabela de preferências de cookies
CREATE TABLE IF NOT EXISTS user_cookie_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  necessary boolean NOT NULL DEFAULT true,
  functional boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  consent_date timestamptz NOT NULL,
  consent_version text NOT NULL DEFAULT '1.0.0',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índice único em user_id para consultas rápidas e garantir unicidade
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_cookie_preferences_user_id 
ON user_cookie_preferences(user_id);

-- Criar índice em consent_version para verificação de versões
CREATE INDEX IF NOT EXISTS idx_user_cookie_preferences_version 
ON user_cookie_preferences(consent_version);

-- Ativar RLS
ALTER TABLE user_cookie_preferences ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários podem ver suas próprias preferências
CREATE POLICY "Users can view own cookie preferences"
  ON user_cookie_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política para INSERT: usuários podem inserir suas próprias preferências
CREATE POLICY "Users can insert own cookie preferences"
  ON user_cookie_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE: usuários podem atualizar suas próprias preferências
CREATE POLICY "Users can update own cookie preferences"
  ON user_cookie_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política para DELETE: usuários podem deletar suas próprias preferências
CREATE POLICY "Users can delete own cookie preferences"
  ON user_cookie_preferences
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_user_cookie_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_user_cookie_preferences_updated_at_trigger 
ON user_cookie_preferences;

CREATE TRIGGER update_user_cookie_preferences_updated_at_trigger
  BEFORE UPDATE ON user_cookie_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_cookie_preferences_updated_at();

-- Comentários para documentação
COMMENT ON TABLE user_cookie_preferences IS 'Armazena as preferências de cookies de cada usuário conforme LGPD';
COMMENT ON COLUMN user_cookie_preferences.user_id IS 'Referência ao usuário (auth.users)';
COMMENT ON COLUMN user_cookie_preferences.necessary IS 'Cookies necessários (sempre true)';
COMMENT ON COLUMN user_cookie_preferences.functional IS 'Cookies funcionais (personalizações)';
COMMENT ON COLUMN user_cookie_preferences.marketing IS 'Cookies de marketing e analytics';
COMMENT ON COLUMN user_cookie_preferences.consent_date IS 'Data/hora que o usuário deu consentimento';
COMMENT ON COLUMN user_cookie_preferences.consent_version IS 'Versão da política de cookies aceita';
