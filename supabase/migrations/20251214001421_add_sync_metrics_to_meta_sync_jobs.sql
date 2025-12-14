/*
  # Adicionar métricas de sincronização aos jobs

  1. Alterações na tabela meta_sync_jobs
    - Adiciona `duration_seconds` (integer) - Duração da sincronização em segundos
    - Adiciona `total_records_synced` (integer) - Total de registros sincronizados no job
    - Adiciona `client_id` (uuid) - Referência ao cliente (se aplicável)
    - Adiciona `meta_ad_account_id` (text) - ID da conta Meta sincronizada

  2. Índices
    - Adiciona índice para meta_ad_account_id para consultas rápidas

  3. Notas
    - Campos nullable para compatibilidade com registros existentes
    - duration_seconds é calculado como diferença entre ended_at e started_at
    - total_records_synced armazena soma de insights salvos durante o job
*/

-- Adicionar campo de duração em segundos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_sync_jobs' AND column_name = 'duration_seconds'
  ) THEN
    ALTER TABLE meta_sync_jobs ADD COLUMN duration_seconds integer;
  END IF;
END $$;

-- Adicionar campo de total de registros sincronizados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_sync_jobs' AND column_name = 'total_records_synced'
  ) THEN
    ALTER TABLE meta_sync_jobs ADD COLUMN total_records_synced integer DEFAULT 0;
  END IF;
END $$;

-- Adicionar client_id se ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_sync_jobs' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE meta_sync_jobs ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Adicionar meta_ad_account_id se ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_sync_jobs' AND column_name = 'meta_ad_account_id'
  ) THEN
    ALTER TABLE meta_sync_jobs ADD COLUMN meta_ad_account_id text;
  END IF;
END $$;

-- Criar índice para meta_ad_account_id para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_meta_sync_jobs_account
ON meta_sync_jobs(meta_ad_account_id)
WHERE meta_ad_account_id IS NOT NULL;

-- Criar índice para client_id
CREATE INDEX IF NOT EXISTS idx_meta_sync_jobs_client
ON meta_sync_jobs(client_id)
WHERE client_id IS NOT NULL;

-- Criar índice composto para consultas de última sincronização por conta
CREATE INDEX IF NOT EXISTS idx_meta_sync_jobs_account_ended
ON meta_sync_jobs(meta_ad_account_id, ended_at DESC)
WHERE ended_at IS NOT NULL;

-- Adicionar comentários para documentação
COMMENT ON COLUMN meta_sync_jobs.duration_seconds IS 'Duração total da sincronização em segundos';
COMMENT ON COLUMN meta_sync_jobs.total_records_synced IS 'Total de registros (insights) sincronizados no job';
COMMENT ON COLUMN meta_sync_jobs.client_id IS 'Cliente associado ao job (opcional)';
COMMENT ON COLUMN meta_sync_jobs.meta_ad_account_id IS 'ID da conta Meta Ads sincronizada';
