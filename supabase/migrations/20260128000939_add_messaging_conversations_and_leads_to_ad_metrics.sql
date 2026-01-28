/*
  # Adiciona colunas de conversas e leads na tabela ad_metrics

  1. Novas Colunas
    - `ad_metrics.messaging_conversations_started` (integer) - Total de conversas iniciadas no Messenger/Instagram
    - `ad_metrics.leads` (integer) - Total de leads gerados

  2. Indices
    - Indice para consultas por messaging_conversations_started
    - Indice para consultas por leads

  3. Notas
    - Essas metricas sao importantes para campanhas focadas em engajamento e geracao de leads
    - Os valores devem ser extraidos do campo actions da API do Meta Ads
*/

-- Adiciona coluna messaging_conversations_started
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'messaging_conversations_started'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN messaging_conversations_started integer DEFAULT 0;
  END IF;
END $$;

-- Adiciona coluna leads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'leads'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN leads integer DEFAULT 0;
  END IF;
END $$;

-- Cria indice para consultas por messaging_conversations_started
CREATE INDEX IF NOT EXISTS idx_ad_metrics_messaging_conversations
ON ad_metrics(messaging_conversations_started)
WHERE messaging_conversations_started > 0;

-- Cria indice para consultas por leads
CREATE INDEX IF NOT EXISTS idx_ad_metrics_leads
ON ad_metrics(leads)
WHERE leads > 0;

-- Adiciona comentarios nas colunas para documentacao
COMMENT ON COLUMN ad_metrics.messaging_conversations_started IS 'Total de conversas iniciadas no Messenger ou Instagram Direct apos visualizar o anuncio';
COMMENT ON COLUMN ad_metrics.leads IS 'Total de leads gerados (formularios preenchidos, cadastros, etc.)';
