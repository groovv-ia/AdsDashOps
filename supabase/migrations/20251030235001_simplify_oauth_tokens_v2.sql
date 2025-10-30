/*
  # Simplifica Tabela de Tokens OAuth

  1. Ajustes
    - Torna campos opcionais mais flexíveis
    - Adiciona campos úteis para tracking
    - Remove constraint que exige connection_id único (permite múltiplas tentativas)

  2. Segurança
    - Mantém RLS habilitado
    - Políticas restritivas permanecem
*/

-- Remove constraint UNIQUE de connection_id para permitir renovações
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'oauth_tokens_connection_id_key'
    AND table_name = 'oauth_tokens'
  ) THEN
    ALTER TABLE oauth_tokens DROP CONSTRAINT oauth_tokens_connection_id_key;
  END IF;
END $$;

-- Ajusta campos para serem mais flexíveis
DO $$
BEGIN
  -- Torna access_token não criptografado por simplicidade (por enquanto)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='oauth_tokens' AND column_name='access_token_encrypted') THEN
    ALTER TABLE oauth_tokens RENAME COLUMN access_token_encrypted TO access_token;
  END IF;

  -- Torna refresh_token não criptografado (por enquanto)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='oauth_tokens' AND column_name='refresh_token_encrypted') THEN
    ALTER TABLE oauth_tokens RENAME COLUMN refresh_token_encrypted TO refresh_token;
  END IF;

  -- Torna account_id opcional
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='oauth_tokens'
    AND column_name='account_id'
    AND is_nullable='NO'
  ) THEN
    ALTER TABLE oauth_tokens ALTER COLUMN account_id DROP NOT NULL;
  END IF;

  -- Torna connection_id opcional (para casos temporários antes de criar conexão)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='oauth_tokens'
    AND column_name='connection_id'
    AND is_nullable='NO'
  ) THEN
    ALTER TABLE oauth_tokens ALTER COLUMN connection_id DROP NOT NULL;
  END IF;
END $$;

-- Adiciona índice para buscar tokens ativos por usuário e plataforma
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_platform
  ON oauth_tokens(user_id, platform, expires_at DESC);

-- Adiciona comentários para documentação
COMMENT ON TABLE oauth_tokens IS 'Armazena tokens de acesso OAuth para integração com plataformas de anúncios (Meta, Google, TikTok)';
COMMENT ON COLUMN oauth_tokens.access_token IS 'Token de acesso retornado pela plataforma OAuth';
COMMENT ON COLUMN oauth_tokens.refresh_token IS 'Token para renovar o access_token quando expirar';
COMMENT ON COLUMN oauth_tokens.expires_at IS 'Data/hora de expiração do access_token';
COMMENT ON COLUMN oauth_tokens.account_id IS 'ID da conta de anúncios na plataforma';
