-- Sistema Multi-Conta Meta com Seleção de Campanhas
-- 
-- Esta migration cria a estrutura completa para suportar múltiplas contas Meta por usuário
-- e seleção individual de campanhas por conta, ideal para agências com múltiplos clientes.
--
-- Nova Tabela: meta_accounts
-- Armazena informações de cada conta Meta conectada
--
-- Nova Tabela: selected_campaigns  
-- Armazena quais campanhas foram selecionadas por conta
--
-- Modificações: data_connections
-- Adiciona campos para labels e status de configuração

-- 1. Criar tabela meta_accounts
CREATE TABLE IF NOT EXISTS meta_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES data_connections(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  account_name text NOT NULL,
  account_label text,
  account_type text NOT NULL DEFAULT 'PERSONAL' CHECK (account_type IN ('PERSONAL', 'CLIENT', 'TEST')),
  account_status text,
  total_campaigns integer DEFAULT 0,
  active_campaigns integer DEFAULT 0,
  currency text DEFAULT 'BRL',
  client_name text,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Criar tabela selected_campaigns
CREATE TABLE IF NOT EXISTS selected_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES data_connections(id) ON DELETE CASCADE,
  meta_account_id uuid NOT NULL REFERENCES meta_accounts(id) ON DELETE CASCADE,
  campaign_id text NOT NULL,
  campaign_name text NOT NULL,
  selected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(meta_account_id, campaign_id)
);

-- 3. Adicionar colunas à tabela data_connections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'data_connections' AND column_name = 'account_label'
  ) THEN
    ALTER TABLE data_connections ADD COLUMN account_label text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'data_connections' AND column_name = 'campaign_selection_completed'
  ) THEN
    ALTER TABLE data_connections ADD COLUMN campaign_selection_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'data_connections' AND column_name = 'selected_account_info'
  ) THEN
    ALTER TABLE data_connections ADD COLUMN selected_account_info jsonb;
  END IF;
END $$;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_meta_accounts_user_id ON meta_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_accounts_connection_id ON meta_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_meta_accounts_account_id ON meta_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_meta_accounts_user_account ON meta_accounts(user_id, account_id);

CREATE INDEX IF NOT EXISTS idx_selected_campaigns_user_id ON selected_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_selected_campaigns_connection_id ON selected_campaigns(connection_id);
CREATE INDEX IF NOT EXISTS idx_selected_campaigns_meta_account_id ON selected_campaigns(meta_account_id);
CREATE INDEX IF NOT EXISTS idx_selected_campaigns_campaign_id ON selected_campaigns(campaign_id);

-- 5. Habilitar RLS
ALTER TABLE meta_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE selected_campaigns ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas RLS para meta_accounts
CREATE POLICY "Users can view own meta accounts"
  ON meta_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meta accounts"
  ON meta_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meta accounts"
  ON meta_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meta accounts"
  ON meta_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Criar políticas RLS para selected_campaigns
CREATE POLICY "Users can view own selected campaigns"
  ON selected_campaigns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own selected campaigns"
  ON selected_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own selected campaigns"
  ON selected_campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own selected campaigns"
  ON selected_campaigns FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 8. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Criar trigger para meta_accounts
DROP TRIGGER IF EXISTS update_meta_accounts_updated_at ON meta_accounts;
CREATE TRIGGER update_meta_accounts_updated_at
  BEFORE UPDATE ON meta_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();