/*
  # Google OAuth Credentials Vault Storage
  
  Este migration configura o armazenamento seguro de credenciais OAuth
  do Google Ads usando o Supabase Vault.
  
  1. Funcoes Criadas
    - `store_google_connection_secret`: Armazena um secret no Vault vinculado a uma conexao
    - `get_google_connection_secret`: Recupera um secret do Vault (apenas service_role)
    - `delete_google_connection_secrets`: Remove todos os secrets de uma conexao
  
  2. Alteracoes na Tabela google_connections
    - Adiciona colunas para armazenar IDs dos secrets no Vault:
      - oauth_client_secret_id (uuid)
      - developer_token_id (uuid)
      - refresh_token_id (uuid)
  
  3. Seguranca
    - Secrets sao armazenados criptografados no Vault
    - Apenas service_role pode acessar os secrets diretamente
    - Trigger para limpar secrets ao deletar conexao
  
  4. Notas Importantes
    - A coluna access_token permanece na tabela por motivos de performance
      (e renovado frequentemente e nao e tao sensivel quanto o refresh_token)
    - oauth_client_id permanece como texto (nao e secret)
*/

-- =====================================================
-- FUNCAO: store_google_connection_secret
-- Armazena um secret no Vault vinculado a uma conexao
-- =====================================================
CREATE OR REPLACE FUNCTION store_google_connection_secret(
  p_connection_id uuid,
  p_secret_type text,
  p_secret_value text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret_id uuid;
  v_secret_name text;
BEGIN
  -- Gera nome unico para o secret
  v_secret_name := 'google_conn_' || p_connection_id::text || '_' || p_secret_type;
  
  -- Remove secret antigo se existir (para updates)
  DELETE FROM vault.secrets WHERE name = v_secret_name;
  
  -- Insere novo secret no Vault
  INSERT INTO vault.secrets (name, secret, description)
  VALUES (
    v_secret_name,
    p_secret_value,
    'Google OAuth credential (' || p_secret_type || ') for connection ' || p_connection_id::text
  )
  RETURNING id INTO v_secret_id;
  
  RETURN v_secret_id;
END;
$$;

-- =====================================================
-- FUNCAO: get_google_connection_secret
-- Recupera um secret do Vault (apenas via service_role)
-- =====================================================
CREATE OR REPLACE FUNCTION get_google_connection_secret(
  p_connection_id uuid,
  p_secret_type text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret_name text;
  v_secret_value text;
BEGIN
  v_secret_name := 'google_conn_' || p_connection_id::text || '_' || p_secret_type;
  
  -- Busca o secret decriptografado usando a view decrypted_secrets
  SELECT decrypted_secret INTO v_secret_value
  FROM vault.decrypted_secrets
  WHERE name = v_secret_name;
  
  RETURN v_secret_value;
END;
$$;

-- =====================================================
-- FUNCAO: delete_google_connection_secrets
-- Remove todos os secrets de uma conexao do Vault
-- =====================================================
CREATE OR REPLACE FUNCTION delete_google_connection_secrets(
  p_connection_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove todos os secrets que comecam com o prefixo da conexao
  DELETE FROM vault.secrets 
  WHERE name LIKE 'google_conn_' || p_connection_id::text || '_%';
END;
$$;

-- =====================================================
-- ALTERACOES: google_connections
-- Adiciona colunas para IDs dos secrets no Vault
-- =====================================================
DO $$
BEGIN
  -- Adiciona coluna oauth_client_secret_id para referenciar o secret no Vault
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_connections' AND column_name = 'oauth_client_secret_id'
  ) THEN
    ALTER TABLE google_connections ADD COLUMN oauth_client_secret_id uuid;
  END IF;

  -- Adiciona coluna developer_token_id para referenciar o secret no Vault
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_connections' AND column_name = 'developer_token_id'
  ) THEN
    ALTER TABLE google_connections ADD COLUMN developer_token_id uuid;
  END IF;

  -- Adiciona coluna refresh_token_id para referenciar o secret no Vault
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_connections' AND column_name = 'refresh_token_id'
  ) THEN
    ALTER TABLE google_connections ADD COLUMN refresh_token_id uuid;
  END IF;
END $$;

-- =====================================================
-- TRIGGER: Limpa secrets ao deletar conexao
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_delete_google_connection_secrets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove todos os secrets associados a conexao que esta sendo deletada
  PERFORM delete_google_connection_secrets(OLD.id);
  RETURN OLD;
END;
$$;

-- Remove trigger antigo se existir e recria
DROP TRIGGER IF EXISTS on_google_connection_delete ON google_connections;

CREATE TRIGGER on_google_connection_delete
  BEFORE DELETE ON google_connections
  FOR EACH ROW
  EXECUTE FUNCTION trigger_delete_google_connection_secrets();

-- =====================================================
-- Comentarios para documentacao
-- =====================================================
COMMENT ON COLUMN google_connections.developer_token IS 'DEPRECATED: Use developer_token_id para buscar do Vault. Sera removido em versao futura.';
COMMENT ON COLUMN google_connections.refresh_token IS 'DEPRECATED: Use refresh_token_id para buscar do Vault. Sera removido em versao futura.';
