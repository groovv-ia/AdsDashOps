/*
  # Sistema de Credenciais de API e Tokens OAuth

  1. Novas Tabelas
    - `api_credentials` - Armazena credenciais de API criptografadas (App ID, Secret, Developer Token)
    - `oauth_tokens` - Gerencia tokens de acesso OAuth e refresh tokens
    - `sync_jobs` - Histórico detalhado de sincronizações
    - `ad_creatives` - Armazena criativos de anúncios (imagens, vídeos, textos)
    - `audience_insights` - Dados demográficos e comportamentais
    - `conversion_events` - Eventos de conversão personalizados

  2. Expansões de Tabelas Existentes
    - Adiciona campos detalhados em campaigns, ad_sets e ads
    - Campos para budget, bid strategy, targeting, criativos

  3. Segurança
    - RLS habilitado em todas as tabelas
    - Credenciais armazenadas de forma criptografada
    - Tokens com expiração automática
    - Políticas restritivas por usuário

  4. Funcionalidades
    - Sistema de renovação automática de tokens
    - Tracking completo de sincronizações
    - Armazenamento de dados detalhados de anúncios
    - Suporte a múltiplas contas por plataforma
*/

-- Tabela de credenciais de API (armazenadas de forma criptografada)
CREATE TABLE IF NOT EXISTS api_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok')),
  app_id text NOT NULL,
  app_secret_encrypted text NOT NULL,
  developer_token_encrypted text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, platform)
);

-- Tabela de tokens OAuth
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES data_connections(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok')),
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text,
  token_type text DEFAULT 'Bearer',
  expires_at timestamptz NOT NULL,
  scope text,
  account_id text NOT NULL,
  last_refreshed_at timestamptz DEFAULT now(),
  refresh_attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(connection_id)
);

-- Tabela de jobs de sincronização
CREATE TABLE IF NOT EXISTS sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES data_connections(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  sync_type text NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  records_synced jsonb DEFAULT '{"campaigns": 0, "ad_sets": 0, "ads": 0, "metrics": 0}',
  errors jsonb DEFAULT '[]',
  duration_seconds integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Tabela de criativos de anúncios
CREATE TABLE IF NOT EXISTS ad_creatives (
  id text PRIMARY KEY,
  ad_id text REFERENCES ads(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES data_connections(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  creative_type text NOT NULL,
  title text,
  body text,
  call_to_action text,
  link_url text,
  image_url text,
  video_url text,
  thumbnail_url text,
  image_hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de insights de audiência
CREATE TABLE IF NOT EXISTS audience_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text REFERENCES campaigns(id) ON DELETE CASCADE,
  ad_set_id text REFERENCES ad_sets(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES data_connections(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  age_range text,
  gender text,
  country text,
  region text,
  city text,
  device_platform text,
  placement text,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  spend numeric DEFAULT 0,
  conversions integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, ad_set_id, date, age_range, gender, country, device_platform, placement)
);

-- Tabela de eventos de conversão
CREATE TABLE IF NOT EXISTS conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text REFERENCES campaigns(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES data_connections(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_source text NOT NULL,
  date date NOT NULL,
  conversion_count integer DEFAULT 0,
  conversion_value numeric DEFAULT 0,
  cost_per_conversion numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, event_name, date)
);

-- Adicionar campos detalhados à tabela campaigns (se não existirem)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='budget_remaining') THEN
    ALTER TABLE campaigns ADD COLUMN budget_remaining numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='daily_budget') THEN
    ALTER TABLE campaigns ADD COLUMN daily_budget numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='lifetime_budget') THEN
    ALTER TABLE campaigns ADD COLUMN lifetime_budget numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='bid_strategy') THEN
    ALTER TABLE campaigns ADD COLUMN bid_strategy text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='optimization_goal') THEN
    ALTER TABLE campaigns ADD COLUMN optimization_goal text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='buying_type') THEN
    ALTER TABLE campaigns ADD COLUMN buying_type text;
  END IF;
END $$;

-- Adicionar campos detalhados à tabela ad_sets (se não existirem)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_sets' AND column_name='optimization_goal') THEN
    ALTER TABLE ad_sets ADD COLUMN optimization_goal text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_sets' AND column_name='billing_event') THEN
    ALTER TABLE ad_sets ADD COLUMN billing_event text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_sets' AND column_name='bid_amount') THEN
    ALTER TABLE ad_sets ADD COLUMN bid_amount numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_sets' AND column_name='start_time') THEN
    ALTER TABLE ad_sets ADD COLUMN start_time timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_sets' AND column_name='end_time') THEN
    ALTER TABLE ad_sets ADD COLUMN end_time timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_sets' AND column_name='targeting_json') THEN
    ALTER TABLE ad_sets ADD COLUMN targeting_json jsonb;
  END IF;
END $$;

-- Adicionar campos detalhados à tabela ads (se não existirem)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ads' AND column_name='preview_url') THEN
    ALTER TABLE ads ADD COLUMN preview_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ads' AND column_name='thumbnail_url') THEN
    ALTER TABLE ads ADD COLUMN thumbnail_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ads' AND column_name='call_to_action') THEN
    ALTER TABLE ads ADD COLUMN call_to_action text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ads' AND column_name='link_url') THEN
    ALTER TABLE ads ADD COLUMN link_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ads' AND column_name='headline') THEN
    ALTER TABLE ads ADD COLUMN headline text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ads' AND column_name='description') THEN
    ALTER TABLE ads ADD COLUMN description text;
  END IF;
END $$;

-- Adicionar campos extras à tabela ad_metrics (se não existirem)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_metrics' AND column_name='video_views') THEN
    ALTER TABLE ad_metrics ADD COLUMN video_views integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_metrics' AND column_name='video_avg_time_watched') THEN
    ALTER TABLE ad_metrics ADD COLUMN video_avg_time_watched numeric DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_metrics' AND column_name='engagement_rate') THEN
    ALTER TABLE ad_metrics ADD COLUMN engagement_rate numeric DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_metrics' AND column_name='quality_score') THEN
    ALTER TABLE ad_metrics ADD COLUMN quality_score numeric;
  END IF;
END $$;

-- Habilitar RLS nas novas tabelas
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para api_credentials
CREATE POLICY "Users can manage their own API credentials"
  ON api_credentials
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para oauth_tokens
CREATE POLICY "Users can manage their own OAuth tokens"
  ON oauth_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para sync_jobs
CREATE POLICY "Users can view their own sync jobs"
  ON sync_jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync jobs"
  ON sync_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync jobs"
  ON sync_jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para ad_creatives
CREATE POLICY "Users can manage their own ad creatives"
  ON ad_creatives
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para audience_insights
CREATE POLICY "Users can manage their own audience insights"
  ON audience_insights
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para conversion_events
CREATE POLICY "Users can manage their own conversion events"
  ON conversion_events
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_api_credentials_user_platform ON api_credentials(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_connection ON oauth_tokens(connection_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires ON oauth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_connection ON sync_jobs(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created ON sync_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_ad_id ON ad_creatives(ad_id);
CREATE INDEX IF NOT EXISTS idx_audience_insights_campaign ON audience_insights(campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_conversion_events_campaign ON conversion_events(campaign_id, date);

-- Triggers para atualizar updated_at
CREATE TRIGGER update_api_credentials_updated_at
  BEFORE UPDATE ON api_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_creatives_updated_at
  BEFORE UPDATE ON ad_creatives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para limpar tokens expirados automaticamente
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM oauth_tokens
  WHERE expires_at < NOW() - INTERVAL '30 days'
  AND refresh_token_encrypted IS NULL;
END;
$$;

-- Função para verificar se token precisa ser renovado
CREATE OR REPLACE FUNCTION token_needs_refresh(token_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_expires timestamptz;
BEGIN
  SELECT expires_at INTO token_expires
  FROM oauth_tokens
  WHERE id = token_id;
  
  -- Renova se faltar menos de 1 hora para expirar
  RETURN token_expires < NOW() + INTERVAL '1 hour';
END;
$$;