/*
  # Adiciona colunas para conversoes e ROAS

  1. Novas Colunas
    - `meta_insights_daily.conversions` (numeric) - Total de conversoes/leads
    - `meta_insights_daily.conversion_value` (numeric) - Valor total das conversoes
    - `meta_insights_daily.purchase_value` (numeric) - Valor de compras (para e-commerce)

  2. Indices
    - Indice para consultas por conversion_value (para calcular ROAS)

  3. Notas
    - ROAS = conversion_value / spend (ou purchase_value / spend)
    - Valores sao extraidos de actions_json e action_values_json
*/

-- Adiciona coluna de conversoes (numero de leads/conversoes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_insights_daily' AND column_name = 'conversions'
  ) THEN
    ALTER TABLE meta_insights_daily ADD COLUMN conversions numeric DEFAULT 0;
  END IF;
END $$;

-- Adiciona coluna de valor de conversao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_insights_daily' AND column_name = 'conversion_value'
  ) THEN
    ALTER TABLE meta_insights_daily ADD COLUMN conversion_value numeric DEFAULT 0;
  END IF;
END $$;

-- Adiciona coluna de valor de compras (para e-commerce)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_insights_daily' AND column_name = 'purchase_value'
  ) THEN
    ALTER TABLE meta_insights_daily ADD COLUMN purchase_value numeric DEFAULT 0;
  END IF;
END $$;

-- Adiciona coluna de leads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_insights_daily' AND column_name = 'leads'
  ) THEN
    ALTER TABLE meta_insights_daily ADD COLUMN leads integer DEFAULT 0;
  END IF;
END $$;

-- Atualiza registros existentes extraindo valores do actions_json
-- Extrai leads do actions_json
UPDATE meta_insights_daily
SET leads = COALESCE(
  (SELECT SUM((elem->>'value')::integer)
   FROM jsonb_array_elements(actions_json::jsonb) AS elem
   WHERE elem->>'action_type' IN ('lead', 'onsite_conversion.lead_grouped')),
  0
)
WHERE actions_json IS NOT NULL 
  AND actions_json::text != '{}'
  AND actions_json::text != '[]';

-- Extrai conversoes do actions_json
UPDATE meta_insights_daily
SET conversions = COALESCE(
  (SELECT SUM((elem->>'value')::numeric)
   FROM jsonb_array_elements(actions_json::jsonb) AS elem
   WHERE elem->>'action_type' IN (
     'lead', 
     'purchase', 
     'complete_registration',
     'offsite_conversion.fb_pixel_purchase',
     'onsite_conversion.purchase'
   )),
  0
)
WHERE actions_json IS NOT NULL 
  AND actions_json::text != '{}'
  AND actions_json::text != '[]';

-- Extrai valores de conversao do action_values_json
UPDATE meta_insights_daily
SET conversion_value = COALESCE(
  (SELECT SUM((elem->>'value')::numeric)
   FROM jsonb_array_elements(action_values_json::jsonb) AS elem
   WHERE elem->>'action_type' IN (
     'purchase', 
     'offsite_conversion.fb_pixel_purchase',
     'onsite_conversion.purchase'
   )),
  0
)
WHERE action_values_json IS NOT NULL 
  AND action_values_json::text != '{}'
  AND action_values_json::text != '[]';

-- Extrai valores de compra do action_values_json
UPDATE meta_insights_daily
SET purchase_value = COALESCE(
  (SELECT SUM((elem->>'value')::numeric)
   FROM jsonb_array_elements(action_values_json::jsonb) AS elem
   WHERE elem->>'action_type' IN (
     'purchase',
     'offsite_conversion.fb_pixel_purchase'
   )),
  0
)
WHERE action_values_json IS NOT NULL 
  AND action_values_json::text != '{}'
  AND action_values_json::text != '[]';

-- Cria indice para consultas de ROAS (ordenacao por conversion_value)
CREATE INDEX IF NOT EXISTS idx_meta_insights_daily_conversion_value 
ON meta_insights_daily(conversion_value) 
WHERE conversion_value > 0;
