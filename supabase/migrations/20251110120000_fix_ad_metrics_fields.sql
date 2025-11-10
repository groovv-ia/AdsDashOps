/*
  # Correção de Campos da Tabela ad_metrics

  ## Descrição
  Adiciona campos faltantes na tabela ad_metrics para armazenar todos os dados
  retornados pela Meta Ads API, garantindo precisão total das métricas.

  ## Novos Campos Adicionados

  ### Métricas de Conversão
  - `conversion_value` (numeric) - Valor real das conversões em moeda (da API action_values)
  - `actions_raw` (jsonb) - JSON completo de todas as actions retornadas pela API
  - `action_values_raw` (jsonb) - JSON completo de todos os action_values da API

  ### Métricas de Engajamento
  - `video_views` (integer) - Total de visualizações de vídeo
  - `inline_link_clicks` (integer) - Cliques em links inline (mais preciso que clicks gerais)
  - `cost_per_inline_link_click` (numeric) - Custo por clique em link inline
  - `outbound_clicks` (integer) - Cliques que levam para fora da plataforma

  ### Métricas Calculadas pela API
  - `cpm` (numeric) - Custo por mil impressões (valor real da API, não calculado)
  - `cpp` (numeric) - Custo por ponto (Cost Per Point)

  ## Notas Importantes
  1. Campos são nullable para manter compatibilidade com dados existentes
  2. action_values_raw e actions_raw permitem auditoria e recálculo futuro
  3. Valores são armazenados como retornados pela API (sem conversão adicional)
  4. conversion_value substitui a estimativa fixa de R$ 100 por conversão

  ## Impacto
  - Permite armazenar 100% dos dados da Meta Ads API
  - Elimina necessidade de estimativas e cálculos incorretos
  - Melhora rastreabilidade e capacidade de auditoria
  - Alinha métricas com Gerenciador de Anúncios da Meta
*/

-- Adicionar campos de conversão e valores reais
ALTER TABLE ad_metrics
ADD COLUMN IF NOT EXISTS conversion_value numeric DEFAULT 0;

ALTER TABLE ad_metrics
ADD COLUMN IF NOT EXISTS actions_raw jsonb;

ALTER TABLE ad_metrics
ADD COLUMN IF NOT EXISTS action_values_raw jsonb;

-- Adicionar campos de engajamento de vídeo
ALTER TABLE ad_metrics
ADD COLUMN IF NOT EXISTS video_views integer DEFAULT 0;

-- Adicionar campos de cliques mais precisos
ALTER TABLE ad_metrics
ADD COLUMN IF NOT EXISTS inline_link_clicks integer DEFAULT 0;

ALTER TABLE ad_metrics
ADD COLUMN IF NOT EXISTS cost_per_inline_link_click numeric DEFAULT 0;

ALTER TABLE ad_metrics
ADD COLUMN IF NOT EXISTS outbound_clicks integer DEFAULT 0;

-- Adicionar métricas calculadas pela API (não recalcular)
-- CPM já existe na tabela, mas vamos garantir que está definido
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'cpm'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN cpm numeric DEFAULT 0;
  END IF;
END $$;

ALTER TABLE ad_metrics
ADD COLUMN IF NOT EXISTS cpp numeric DEFAULT 0;

-- Criar índices para melhorar performance das queries de agregação
CREATE INDEX IF NOT EXISTS idx_ad_metrics_conversion_value
  ON ad_metrics(conversion_value)
  WHERE conversion_value > 0;

CREATE INDEX IF NOT EXISTS idx_ad_metrics_video_views
  ON ad_metrics(video_views)
  WHERE video_views > 0;

CREATE INDEX IF NOT EXISTS idx_ad_metrics_inline_link_clicks
  ON ad_metrics(inline_link_clicks)
  WHERE inline_link_clicks > 0;

-- Adicionar comentários explicativos nos campos
COMMENT ON COLUMN ad_metrics.conversion_value IS
  'Valor real das conversões em moeda, extraído de action_values da Meta API. Substitui estimativas fixas.';

COMMENT ON COLUMN ad_metrics.actions_raw IS
  'JSON completo do array actions retornado pela Meta API. Usado para auditoria e recálculos.';

COMMENT ON COLUMN ad_metrics.action_values_raw IS
  'JSON completo do array action_values retornado pela Meta API. Contém valores monetários de cada ação.';

COMMENT ON COLUMN ad_metrics.video_views IS
  'Total de visualizações de vídeo (mínimo 3 segundos). Da Meta API campo video_view action.';

COMMENT ON COLUMN ad_metrics.inline_link_clicks IS
  'Cliques em links dentro do anúncio. Mais preciso que clicks gerais para anúncios com links.';

COMMENT ON COLUMN ad_metrics.cost_per_inline_link_click IS
  'Custo por clique em link inline. Calculado pela Meta API como spend / inline_link_clicks.';

COMMENT ON COLUMN ad_metrics.cpm IS
  'Custo por mil impressões. Valor direto da Meta API, não recalculado.';

COMMENT ON COLUMN ad_metrics.cpp IS
  'Custo por ponto (Cost Per Point). Usado em campanhas de reach e frequency.';

-- Atualizar conversions para usar numeric em vez de integer para maior precisão
-- (conversões podem ser fracionárias em alguns casos da Meta API)
ALTER TABLE ad_metrics
ALTER COLUMN conversions TYPE numeric USING conversions::numeric;
