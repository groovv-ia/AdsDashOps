/*
  # Correção de Campos da Tabela ad_metrics
  
  ## Mudanças
  
  1. **Conversão de Tipos**
     - Altera `conversions` de INTEGER para NUMERIC para aceitar valores decimais
     - Mantém compatibilidade com valores inteiros existentes
  
  2. **Validação de Campos**
     - Garante que todos os campos necessários existem
     - Adiciona campos faltantes se necessário
  
  ## Campos Verificados
  - conversions (INTEGER → NUMERIC)
  - conversion_value (NUMERIC)
  - inline_link_clicks (INTEGER)
  - cost_per_inline_link_click (NUMERIC)
  - outbound_clicks (INTEGER)
  - cpm (NUMERIC)
  - cpp (NUMERIC)
  - actions_raw (JSONB)
  - action_values_raw (JSONB)
  
  ## Segurança
  - Operação é segura e não perde dados
  - Usa IF EXISTS/IF NOT EXISTS para evitar erros
*/

-- Altera o tipo do campo conversions de INTEGER para NUMERIC
-- Isso permite armazenar valores decimais vindos da API Meta (ex: 2.5 conversões)
DO $$
BEGIN
  -- Verifica se o campo existe e é do tipo integer
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'ad_metrics' 
    AND column_name = 'conversions' 
    AND data_type = 'integer'
  ) THEN
    -- Altera para numeric mantendo os dados existentes
    ALTER TABLE ad_metrics 
    ALTER COLUMN conversions TYPE numeric USING conversions::numeric;
    
    -- Mantém o default
    ALTER TABLE ad_metrics 
    ALTER COLUMN conversions SET DEFAULT 0;
    
    RAISE NOTICE 'Campo conversions alterado de INTEGER para NUMERIC';
  END IF;
END $$;

-- Adiciona campos que podem estar faltantes
-- Campo: conversion_value (valor monetário das conversões)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'conversion_value'
  ) THEN
    ALTER TABLE ad_metrics 
    ADD COLUMN conversion_value numeric DEFAULT 0;
    
    COMMENT ON COLUMN ad_metrics.conversion_value IS 'Valor monetário real das conversões (receita gerada)';
    RAISE NOTICE 'Campo conversion_value adicionado';
  END IF;
END $$;

-- Campo: inline_link_clicks (cliques em links dentro do anúncio)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'inline_link_clicks'
  ) THEN
    ALTER TABLE ad_metrics 
    ADD COLUMN inline_link_clicks integer DEFAULT 0;
    
    COMMENT ON COLUMN ad_metrics.inline_link_clicks IS 'Cliques em links dentro do anúncio';
    RAISE NOTICE 'Campo inline_link_clicks adicionado';
  END IF;
END $$;

-- Campo: cost_per_inline_link_click
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'cost_per_inline_link_click'
  ) THEN
    ALTER TABLE ad_metrics 
    ADD COLUMN cost_per_inline_link_click numeric DEFAULT 0;
    
    COMMENT ON COLUMN ad_metrics.cost_per_inline_link_click IS 'Custo médio por clique em link';
    RAISE NOTICE 'Campo cost_per_inline_link_click adicionado';
  END IF;
END $$;

-- Campo: outbound_clicks (cliques que levam para fora do Facebook)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'outbound_clicks'
  ) THEN
    ALTER TABLE ad_metrics 
    ADD COLUMN outbound_clicks integer DEFAULT 0;
    
    COMMENT ON COLUMN ad_metrics.outbound_clicks IS 'Cliques que levam usuários para fora do Facebook';
    RAISE NOTICE 'Campo outbound_clicks adicionado';
  END IF;
END $$;

-- Campo: cpm (Custo por mil impressões)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'cpm'
  ) THEN
    ALTER TABLE ad_metrics 
    ADD COLUMN cpm numeric DEFAULT 0;
    
    COMMENT ON COLUMN ad_metrics.cpm IS 'Custo por mil impressões (CPM) - valor direto da API Meta';
    RAISE NOTICE 'Campo cpm adicionado';
  END IF;
END $$;

-- Campo: cpp (Custo por ponto percentual de alcance)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'cpp'
  ) THEN
    ALTER TABLE ad_metrics 
    ADD COLUMN cpp numeric DEFAULT 0;
    
    COMMENT ON COLUMN ad_metrics.cpp IS 'Custo por ponto percentual de alcance (CPP) - valor direto da API Meta';
    RAISE NOTICE 'Campo cpp adicionado';
  END IF;
END $$;

-- Campo: actions_raw (JSON bruto de ações para auditoria)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'actions_raw'
  ) THEN
    ALTER TABLE ad_metrics 
    ADD COLUMN actions_raw jsonb;
    
    COMMENT ON COLUMN ad_metrics.actions_raw IS 'Array JSON bruto de ações da API Meta para auditoria';
    RAISE NOTICE 'Campo actions_raw adicionado';
  END IF;
END $$;

-- Campo: action_values_raw (JSON bruto de valores de ações)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'action_values_raw'
  ) THEN
    ALTER TABLE ad_metrics 
    ADD COLUMN action_values_raw jsonb;
    
    COMMENT ON COLUMN ad_metrics.action_values_raw IS 'Array JSON bruto de valores de ações da API Meta para auditoria';
    RAISE NOTICE 'Campo action_values_raw adicionado';
  END IF;
END $$;

-- Adiciona índice para melhorar performance de queries por data
CREATE INDEX IF NOT EXISTS idx_ad_metrics_date 
ON ad_metrics(date DESC);

-- Adiciona índice composto para queries por campanha e data
CREATE INDEX IF NOT EXISTS idx_ad_metrics_campaign_date 
ON ad_metrics(campaign_id, date DESC);

-- Adiciona índice para client_id (importante para RLS)
CREATE INDEX IF NOT EXISTS idx_ad_metrics_client_id 
ON ad_metrics(client_id);

-- Log final
DO $$
BEGIN
  RAISE NOTICE 'Migração concluída: Todos os campos da tabela ad_metrics foram verificados e corrigidos';
END $$;
