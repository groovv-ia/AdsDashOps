/*
  # Criar Tabela de Logs de Sincronização

  ## Descrição
  Cria tabela para armazenar histórico e logs de sincronizações das plataformas de publicidade.
  Permite rastreamento de sucessos, falhas e diagnóstico de problemas.

  ## Nova Tabela
  - `sync_logs`
    - `id` (uuid, primary key) - Identificador único do log
    - `user_id` (uuid, foreign key) - Usuário que executou a sincronização
    - `platform` (text) - Plataforma sincronizada (meta, google, tiktok)
    - `sync_type` (text) - Tipo de sincronização (manual, automatic)
    - `status` (text) - Status (started, completed, failed)
    - `started_at` (timestamptz) - Início da sincronização
    - `completed_at` (timestamptz, nullable) - Fim da sincronização
    - `duration_seconds` (integer, nullable) - Duração em segundos
    - `accounts_synced` (integer) - Número de contas sincronizadas
    - `campaigns_synced` (integer) - Número de campanhas sincronizadas
    - `metrics_synced` (integer) - Número de métricas sincronizadas
    - `error_message` (text, nullable) - Mensagem de erro se houver
    - `error_details` (jsonb, nullable) - Detalhes técnicos do erro
    - `created_at` (timestamptz) - Data de criação do registro

  ## Segurança
  - RLS habilitado
  - Usuários só podem visualizar seus próprios logs
  - Índices para otimizar consultas

  ## Notas
  - Permite auditoria completa das sincronizações
  - Facilita diagnóstico de problemas
  - Rastreia estatísticas de uso
*/

-- Criar tabela sync_logs
CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok')),
  sync_type text NOT NULL CHECK (sync_type IN ('manual', 'automatic')),
  status text NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_seconds integer,
  accounts_synced integer DEFAULT 0,
  campaigns_synced integer DEFAULT 0,
  metrics_synced integer DEFAULT 0,
  error_message text,
  error_details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_platform ON sync_logs(platform);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_platform ON sync_logs(user_id, platform);

-- Habilitar RLS
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem visualizar apenas seus próprios logs
DROP POLICY IF EXISTS "Users can view own sync logs" ON sync_logs;
CREATE POLICY "Users can view own sync logs"
  ON sync_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política: Usuários podem inserir seus próprios logs
DROP POLICY IF EXISTS "Users can insert own sync logs" ON sync_logs;
CREATE POLICY "Users can insert own sync logs"
  ON sync_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem atualizar apenas seus próprios logs
DROP POLICY IF EXISTS "Users can update own sync logs" ON sync_logs;
CREATE POLICY "Users can update own sync logs"
  ON sync_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE sync_logs IS 'Histórico e logs de sincronizações das plataformas de publicidade';
COMMENT ON COLUMN sync_logs.platform IS 'Plataforma que foi sincronizada (meta, google, tiktok)';
COMMENT ON COLUMN sync_logs.sync_type IS 'Tipo de sincronização (manual pelo usuário ou automática)';
COMMENT ON COLUMN sync_logs.status IS 'Status atual da sincronização (started, completed, failed)';
COMMENT ON COLUMN sync_logs.duration_seconds IS 'Tempo total de execução da sincronização em segundos';
COMMENT ON COLUMN sync_logs.error_details IS 'Detalhes técnicos do erro em formato JSON para debugging';
