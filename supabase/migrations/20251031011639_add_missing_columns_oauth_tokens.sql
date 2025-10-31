/*
  # Adicionar Colunas Faltantes na Tabela oauth_tokens

  ## Descrição
  Adiciona colunas úteis que estavam faltando na tabela oauth_tokens:
  - account_name: Nome da conta publicitária
  - is_active: Indicador se o token está ativo
  - last_used_at: Última vez que o token foi utilizado

  ## Modificações
  1. Adicionar coluna account_name (text, nullable)
  2. Adicionar coluna is_active (boolean, default true)
  3. Adicionar coluna last_used_at (timestamptz, nullable)
  4. Criar índice para is_active

  ## Segurança
  - RLS já está habilitado na tabela
  - Políticas existentes continuam válidas
*/

-- Adicionar account_name se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'oauth_tokens' AND column_name = 'account_name'
  ) THEN
    ALTER TABLE oauth_tokens ADD COLUMN account_name text;
  END IF;
END $$;

-- Adicionar is_active se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'oauth_tokens' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE oauth_tokens ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Adicionar last_used_at se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'oauth_tokens' AND column_name = 'last_used_at'
  ) THEN
    ALTER TABLE oauth_tokens ADD COLUMN last_used_at timestamptz;
  END IF;
END $$;

-- Criar índice para is_active se não existir
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_is_active 
  ON oauth_tokens(is_active) 
  WHERE is_active = true;

-- Atualizar registros existentes para is_active = true
UPDATE oauth_tokens SET is_active = true WHERE is_active IS NULL;

-- Comentários para documentação
COMMENT ON COLUMN oauth_tokens.account_name IS 'Nome amigável da conta publicitária';
COMMENT ON COLUMN oauth_tokens.is_active IS 'Indica se o token está ativo e pode ser usado';
COMMENT ON COLUMN oauth_tokens.last_used_at IS 'Timestamp da última vez que o token foi utilizado';
