/*
  # Adicionar campo token_expires_at na tabela meta_connections

  ## Resumo
  Adiciona coluna para rastrear com precisao quando o token de acesso do Meta expira,
  permitindo renovacao proativa antes da expiracao e notificacoes ao usuario.

  ## Alteracoes
  1. Nova coluna `token_expires_at` (timestamptz) em `meta_connections`
     - Armazena a data exata de expiracao do token
     - Populada automaticamente ao salvar/renovar tokens
  2. Popula registros existentes com updated_at + 60 dias (estimativa conservadora)
  3. Cria index para consultas rapidas de tokens proximos ao vencimento
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_connections' AND column_name = 'token_expires_at'
  ) THEN
    ALTER TABLE meta_connections ADD COLUMN token_expires_at timestamptz;
  END IF;
END $$;

-- Popula registros existentes com updated_at + 60 dias como estimativa
UPDATE meta_connections
SET token_expires_at = updated_at + INTERVAL '60 days'
WHERE token_expires_at IS NULL AND updated_at IS NOT NULL;

-- Index para consultas de tokens proximos ao vencimento
CREATE INDEX IF NOT EXISTS idx_meta_connections_token_expires_at
  ON meta_connections (token_expires_at)
  WHERE token_expires_at IS NOT NULL;
