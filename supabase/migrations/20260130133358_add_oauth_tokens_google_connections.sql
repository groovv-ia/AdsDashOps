/*
  # Adicionar suporte OAuth2 para Google Ads API
  
  1. Alteracoes na tabela google_connections
    - access_token (text): Token OAuth2 de acesso
    - refresh_token (text): Token para renovar access_token
    - token_expires_at (timestamptz): Expiracao do access_token
    - oauth_email (text): Email da conta Google autenticada
    - oauth_scopes (text[]): Escopos OAuth autorizados
  
  2. Notas Importantes
    - A Google Ads API requer OAuth2 + Developer Token para autenticacao
    - O access_token expira em ~1 hora, refresh_token e usado para renovar
    - O developer_token ja existe na tabela (permanece)
    - Escopos necessarios: https://www.googleapis.com/auth/adwords
*/

-- Adicionar colunas OAuth2 a tabela google_connections
DO $$
BEGIN
  -- access_token: Token OAuth2 de acesso a API
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_connections' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE google_connections ADD COLUMN access_token text;
  END IF;

  -- refresh_token: Token para renovar access_token quando expirar
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_connections' AND column_name = 'refresh_token'
  ) THEN
    ALTER TABLE google_connections ADD COLUMN refresh_token text;
  END IF;

  -- token_expires_at: Timestamp de expiracao do access_token
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_connections' AND column_name = 'token_expires_at'
  ) THEN
    ALTER TABLE google_connections ADD COLUMN token_expires_at timestamptz;
  END IF;

  -- oauth_email: Email da conta Google usada na autenticacao OAuth
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_connections' AND column_name = 'oauth_email'
  ) THEN
    ALTER TABLE google_connections ADD COLUMN oauth_email text;
  END IF;

  -- oauth_scopes: Lista de escopos OAuth autorizados
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_connections' AND column_name = 'oauth_scopes'
  ) THEN
    ALTER TABLE google_connections ADD COLUMN oauth_scopes text[] DEFAULT '{}';
  END IF;

  -- client_id: ID do cliente OAuth (para referencia)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_connections' AND column_name = 'oauth_client_id'
  ) THEN
    ALTER TABLE google_connections ADD COLUMN oauth_client_id text;
  END IF;
END $$;
