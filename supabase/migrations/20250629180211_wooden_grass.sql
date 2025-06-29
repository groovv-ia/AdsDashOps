/*
  # Tabelas para Conexões de Fontes de Dados

  1. Novas Tabelas
    - `data_connections` - Armazena configurações de conexão com APIs
    - `campaigns` - Campanhas importadas das plataformas
    - `ad_sets` - Conjuntos de anúncios
    - `ads` - Anúncios individuais
    - `ad_metrics` - Métricas de performance

  2. Segurança
    - Habilitar RLS em todas as tabelas
    - Políticas para usuários autenticados acessarem apenas seus dados

  3. Funcionalidades
    - Suporte a múltiplas plataformas (Meta, Google, TikTok)
    - Armazenamento seguro de tokens de acesso
    - Histórico de sincronizações
    - Métricas detalhadas de performance
*/

-- Tabela de conexões de fontes de dados
CREATE TABLE IF NOT EXISTS data_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL,
  type text NOT NULL CHECK (type IN ('advertising', 'analytics', 'crm', 'file')),
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'syncing')),
  config jsonb NOT NULL DEFAULT '{}',
  logo text,
  description text,
  metrics text[],
  last_sync timestamptz,
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de campanhas
CREATE TABLE IF NOT EXISTS campaigns (
  id text PRIMARY KEY,
  connection_id uuid REFERENCES data_connections(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL,
  account_id text,
  status text NOT NULL,
  objective text,
  created_date date,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de conjuntos de anúncios
CREATE TABLE IF NOT EXISTS ad_sets (
  id text PRIMARY KEY,
  campaign_id text REFERENCES campaigns(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES data_connections(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL,
  daily_budget numeric,
  lifetime_budget numeric,
  targeting text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de anúncios
CREATE TABLE IF NOT EXISTS ads (
  id text PRIMARY KEY,
  ad_set_id text REFERENCES ad_sets(id) ON DELETE CASCADE,
  campaign_id text REFERENCES campaigns(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES data_connections(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL,
  ad_type text,
  creative_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de métricas de anúncios
CREATE TABLE IF NOT EXISTS ad_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text REFERENCES campaigns(id) ON DELETE CASCADE,
  ad_set_id text REFERENCES ad_sets(id) ON DELETE CASCADE,
  ad_id text REFERENCES ads(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES data_connections(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  spend numeric DEFAULT 0,
  conversions integer DEFAULT 0,
  reach integer DEFAULT 0,
  frequency numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  roas numeric DEFAULT 0,
  cost_per_result numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, ad_set_id, ad_id, date)
);

-- Habilitar RLS
ALTER TABLE data_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para data_connections
CREATE POLICY "Users can manage their own data connections"
  ON data_connections
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para campaigns
CREATE POLICY "Users can manage their own campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para ad_sets
CREATE POLICY "Users can manage their own ad sets"
  ON ad_sets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para ads
CREATE POLICY "Users can manage their own ads"
  ON ads
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para ad_metrics
CREATE POLICY "Users can manage their own ad metrics"
  ON ad_metrics
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_data_connections_user_id ON data_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_data_connections_platform ON data_connections(platform);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_platform ON campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_date ON ad_metrics(date);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_campaign_id ON ad_metrics(campaign_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_data_connections_updated_at
  BEFORE UPDATE ON data_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_sets_updated_at
  BEFORE UPDATE ON ad_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ads_updated_at
  BEFORE UPDATE ON ads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_metrics_updated_at
  BEFORE UPDATE ON ad_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();