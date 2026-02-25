/*
  # Adicionar campos de enriquecimento em meta_ad_creatives

  ## Resumo
  Adiciona suporte ao fluxo de enriquecimento de criativos em alta resolucao,
  permitindo rastrear quais anuncios ja foram enriquecidos diretamente da API Meta
  e quais ainda precisam ser processados.

  ## Campos Adicionados

  ### Tabela: meta_ad_creatives
  - `needs_enrichment` (boolean, default true): Indica se o criativo ainda nao foi
    enriquecido com dados completos da API Meta. Setado como false apos enriquecimento.
  - `enriched_at` (timestamptz): Timestamp de quando o enriquecimento completo foi
    realizado pela ultima vez.

  ## Indices
  - Indice em `needs_enrichment` para queries eficientes de criativos pendentes

  ## Notas
  - Todos os registros existentes recebem `needs_enrichment = true` para serem
    processados no proximo ciclo de enriquecimento.
  - O campo `enriched_at` permanece NULL para registros existentes ate que sejam
    efetivamente enriquecidos.
*/

-- Adicionar coluna needs_enrichment com valor padrao true
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'needs_enrichment'
  ) THEN
    ALTER TABLE meta_ad_creatives
      ADD COLUMN needs_enrichment boolean DEFAULT true;
  END IF;
END $$;

-- Adicionar coluna enriched_at para registrar quando o enriquecimento ocorreu
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'enriched_at'
  ) THEN
    ALTER TABLE meta_ad_creatives
      ADD COLUMN enriched_at timestamptz;
  END IF;
END $$;

-- Indice para queries eficientes de criativos pendentes de enriquecimento
CREATE INDEX IF NOT EXISTS idx_meta_ad_creatives_needs_enrichment
  ON meta_ad_creatives (needs_enrichment)
  WHERE needs_enrichment = true;

-- Indice para busca por workspace + needs_enrichment (queries de sync)
CREATE INDEX IF NOT EXISTS idx_meta_ad_creatives_workspace_enrichment
  ON meta_ad_creatives (workspace_id, needs_enrichment);
