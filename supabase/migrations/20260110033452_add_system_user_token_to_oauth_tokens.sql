/*
  # Adicionar coluna system_user_token em oauth_tokens

  1. Alterações
    - Adiciona coluna `system_user_token` em `oauth_tokens` para armazenar o Token System User do Meta
    - Este token é usado para operações de longa duração e acesso a System Users

  2. Notas
    - A coluna é opcional (nullable) pois nem todas as conexões precisam de System User Token
    - O token pode ser adicionado posteriormente após a conexão inicial
*/

-- Adiciona coluna system_user_token se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'oauth_tokens' AND column_name = 'system_user_token'
  ) THEN
    ALTER TABLE oauth_tokens ADD COLUMN system_user_token text;
  END IF;
END $$;
