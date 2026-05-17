/*
  # Create meta_insights_cache table

  1. New Tables
    - `meta_insights_cache`
      - `id` (uuid, primary key)
      - `cache_key` (text, unique) - chave composta: workspace:account:level:dateFrom:dateTo:mode
      - `workspace_id` (uuid, FK workspaces)
      - `meta_ad_account_id` (text) - ID da conta Meta (formato act_XXXXX)
      - `level` (text) - campaign, adset ou ad
      - `date_from` (date) - inicio do periodo
      - `date_to` (date) - fim do periodo
      - `mode` (text) - dual, totals ou daily
      - `response_json` (jsonb) - resposta completa da API Meta
      - `fetched_at` (timestamptz) - quando foi buscado da API

  2. Security
    - Enable RLS on `meta_insights_cache` table
    - Add policy for service role access (edge functions usam service role)
    - Add policy for authenticated users to read cache do proprio workspace

  3. Indexes
    - Unique index on cache_key para upsert
    - Index on fetched_at para limpeza de cache expirado
*/

CREATE TABLE IF NOT EXISTS meta_insights_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  meta_ad_account_id text NOT NULL,
  level text NOT NULL CHECK (level IN ('campaign', 'adset', 'ad')),
  date_from date NOT NULL,
  date_to date NOT NULL,
  mode text NOT NULL DEFAULT 'dual' CHECK (mode IN ('dual', 'totals', 'daily')),
  response_json jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

-- Indice unico para upsert por cache_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_insights_cache_key
  ON meta_insights_cache (cache_key);

-- Indice para limpeza de entradas expiradas
CREATE INDEX IF NOT EXISTS idx_meta_insights_cache_fetched_at
  ON meta_insights_cache (fetched_at);

-- Indice para busca por workspace
CREATE INDEX IF NOT EXISTS idx_meta_insights_cache_workspace
  ON meta_insights_cache (workspace_id);

-- Habilita RLS
ALTER TABLE meta_insights_cache ENABLE ROW LEVEL SECURITY;

-- Policy: usuarios autenticados podem ler cache do proprio workspace
CREATE POLICY "Users can read own workspace cache"
  ON meta_insights_cache
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w WHERE w.owner_id = auth.uid()
    )
  );

-- Policy: servico pode inserir/atualizar (edge functions usam service_role que bypassa RLS)
-- Nao precisa de policy especifica pois service_role ignora RLS
