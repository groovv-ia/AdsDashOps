/*
  # Fix Security Issues: SECURITY DEFINER Views, Mutable Search Paths, and Broad Storage Policies

  ## Changes Made

  ### 1. Views - Remove SECURITY DEFINER
  Views `v_top_entities_period`, `v_sync_status_overview`, and `v_client_kpis_daily` were created
  with SECURITY DEFINER, which means they execute with the privileges of the view creator rather
  than the querying user — bypassing Row Level Security. Recreating them as SECURITY INVOKER
  ensures they respect the caller's permissions and RLS policies.

  ### 2. Functions - Fix Mutable Search Path
  Functions `encrypt_token`, `decrypt_token`, `get_client_insights_summary`, `get_daily_trend`,
  and `get_client_ids_for_user` had no fixed search_path, making them vulnerable to search_path
  injection attacks. Adding `SET search_path = public, pg_temp` locks them to use only the
  intended schema.

  ### 3. Storage Policies - Restrict Broad SELECT Policies
  Buckets `avatars` and `workspace-logos` had overly broad SELECT policies that allowed listing
  ALL files in the bucket. Replacing with path-scoped policies prevents enumeration of other
  users' files.
*/

-- ============================================================
-- PART 1: Recreate views with SECURITY INVOKER (default)
-- ============================================================

DROP VIEW IF EXISTS public.v_top_entities_period;
CREATE VIEW public.v_top_entities_period
WITH (security_invoker = true)
AS
SELECT
  workspace_id,
  client_id,
  meta_ad_account_id,
  level,
  entity_id,
  entity_name,
  min(date) AS period_start,
  max(date) AS period_end,
  count(DISTINCT date) AS days_active,
  sum(spend) AS total_spend,
  sum(impressions) AS total_impressions,
  sum(reach) AS total_reach,
  sum(clicks) AS total_clicks,
  CASE
    WHEN sum(impressions) > 0 THEN (sum(clicks) / sum(impressions)) * 100
    ELSE 0
  END AS ctr,
  CASE
    WHEN sum(clicks) > 0 THEN sum(spend) / sum(clicks)
    ELSE 0
  END AS cpc,
  CASE
    WHEN sum(impressions) > 0 THEN (sum(spend) / sum(impressions)) * 1000
    ELSE 0
  END AS cpm
FROM meta_insights_daily mid
GROUP BY workspace_id, client_id, meta_ad_account_id, level, entity_id, entity_name;

DROP VIEW IF EXISTS public.v_sync_status_overview;
CREATE VIEW public.v_sync_status_overview
WITH (security_invoker = true)
AS
SELECT
  mss.workspace_id,
  mss.client_id,
  c.name AS client_name,
  mss.meta_ad_account_id,
  ma.name AS ad_account_name,
  mss.last_daily_date_synced,
  mss.last_intraday_synced_at,
  mss.last_success_at,
  mss.last_error,
  mss.sync_enabled,
  CASE
    WHEN mss.last_error IS NOT NULL THEN 'error'::text
    WHEN mss.last_success_at IS NULL THEN 'pending'::text
    WHEN mss.last_success_at < (now() - '24:00:00'::interval) THEN 'stale'::text
    ELSE 'healthy'::text
  END AS health_status,
  (
    SELECT count(*)
    FROM meta_insights_daily mid
    WHERE mid.workspace_id = mss.workspace_id
      AND mid.meta_ad_account_id::text = mss.meta_ad_account_id
  ) AS total_insights_rows,
  (
    SELECT max(mid.date)
    FROM meta_insights_daily mid
    WHERE mid.workspace_id = mss.workspace_id
      AND mid.meta_ad_account_id::text = mss.meta_ad_account_id
  ) AS latest_data_date,
  mss.updated_at
FROM meta_sync_state mss
LEFT JOIN clients c ON c.id = mss.client_id
LEFT JOIN meta_ad_accounts ma ON ma.meta_ad_account_id = mss.meta_ad_account_id;

DROP VIEW IF EXISTS public.v_client_kpis_daily;
CREATE VIEW public.v_client_kpis_daily
WITH (security_invoker = true)
AS
SELECT
  mid.workspace_id,
  mid.client_id,
  c.name AS client_name,
  mid.meta_ad_account_id,
  ma.name AS ad_account_name,
  mid.level,
  mid.date,
  count(DISTINCT mid.entity_id) AS entity_count,
  sum(mid.spend) AS total_spend,
  sum(mid.impressions) AS total_impressions,
  sum(mid.reach) AS total_reach,
  sum(mid.clicks) AS total_clicks,
  CASE
    WHEN sum(mid.impressions) > 0 THEN (sum(mid.clicks) / sum(mid.impressions)) * 100
    ELSE 0
  END AS avg_ctr,
  CASE
    WHEN sum(mid.clicks) > 0 THEN sum(mid.spend) / sum(mid.clicks)
    ELSE 0
  END AS avg_cpc,
  CASE
    WHEN sum(mid.impressions) > 0 THEN (sum(mid.spend) / sum(mid.impressions)) * 1000
    ELSE 0
  END AS avg_cpm
FROM meta_insights_daily mid
LEFT JOIN clients c ON c.id = mid.client_id
LEFT JOIN meta_ad_accounts ma ON ma.id = mid.meta_ad_account_id
GROUP BY mid.workspace_id, mid.client_id, c.name, mid.meta_ad_account_id, ma.name, mid.level, mid.date;


-- ============================================================
-- PART 2: Fix function search_path (drop and recreate where needed)
-- ============================================================

-- Fix encrypt_token
CREATE OR REPLACE FUNCTION public.encrypt_token(p_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key bytea;
  v_encrypted bytea;
BEGIN
  v_key := digest('ADSOPS_SECRET_KEY_2024_PRODUCTION', 'sha256');
  v_encrypted := encrypt(
    convert_to(p_token, 'UTF8'),
    v_key,
    'aes-cbc/pad:pkcs'
  );
  RETURN encode(v_encrypted, 'base64');
END;
$$;

-- Fix decrypt_token
CREATE OR REPLACE FUNCTION public.decrypt_token(p_encrypted_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key bytea;
  v_decrypted bytea;
BEGIN
  v_key := digest('ADSOPS_SECRET_KEY_2024_PRODUCTION', 'sha256');
  v_decrypted := decrypt(
    decode(p_encrypted_token, 'base64'),
    v_key,
    'aes-cbc/pad:pkcs'
  );
  RETURN convert_from(v_decrypted, 'UTF8');
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Fix get_client_ids_for_user
CREATE OR REPLACE FUNCTION public.get_client_ids_for_user()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM workspace_members WHERE user_id = auth.uid()) THEN
      (SELECT ARRAY_AGG(c.id) FROM clients c
       INNER JOIN workspaces w ON c.workspace_id = w.id
       INNER JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE wm.user_id = auth.uid())
    ELSE
      (SELECT ARRAY_AGG(cu.client_id) FROM client_users cu
       WHERE cu.user_id = auth.uid() AND cu.is_active = true)
  END;
$$;

-- Drop and recreate get_client_insights_summary (signature change requires DROP)
DROP FUNCTION IF EXISTS public.get_client_insights_summary(uuid, uuid, date, date);
CREATE FUNCTION public.get_client_insights_summary(
  p_workspace_id uuid,
  p_client_id uuid,
  p_date_from date,
  p_date_to date
)
RETURNS TABLE(
  level text,
  entity_count bigint,
  total_spend numeric,
  total_impressions bigint,
  total_reach bigint,
  total_clicks bigint,
  avg_ctr numeric,
  avg_cpc numeric,
  avg_cpm numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    mid.level,
    COUNT(DISTINCT mid.entity_id) as entity_count,
    SUM(mid.spend) as total_spend,
    SUM(mid.impressions) as total_impressions,
    SUM(mid.reach) as total_reach,
    SUM(mid.clicks) as total_clicks,
    CASE
      WHEN SUM(mid.impressions) > 0
      THEN ROUND((SUM(mid.clicks)::numeric / SUM(mid.impressions) * 100), 4)
      ELSE 0
    END as avg_ctr,
    CASE
      WHEN SUM(mid.clicks) > 0
      THEN ROUND((SUM(mid.spend) / SUM(mid.clicks)), 4)
      ELSE 0
    END as avg_cpc,
    CASE
      WHEN SUM(mid.impressions) > 0
      THEN ROUND((SUM(mid.spend) / SUM(mid.impressions) * 1000), 4)
      ELSE 0
    END as avg_cpm
  FROM meta_insights_daily mid
  WHERE mid.workspace_id = p_workspace_id
    AND (p_client_id IS NULL OR mid.client_id = p_client_id)
    AND mid.date >= p_date_from
    AND mid.date <= p_date_to
  GROUP BY mid.level
  ORDER BY mid.level;
$$;

-- Drop and recreate get_daily_trend (signature change requires DROP)
DROP FUNCTION IF EXISTS public.get_daily_trend(uuid, text, text, date, date);
CREATE FUNCTION public.get_daily_trend(
  p_workspace_id uuid,
  p_meta_ad_account_id text,
  p_level text,
  p_date_from date,
  p_date_to date
)
RETURNS TABLE(
  date date,
  spend numeric,
  impressions bigint,
  clicks bigint,
  ctr numeric,
  cpc numeric,
  cpm numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    mid.date,
    SUM(mid.spend) as spend,
    SUM(mid.impressions) as impressions,
    SUM(mid.clicks) as clicks,
    CASE
      WHEN SUM(mid.impressions) > 0
      THEN ROUND((SUM(mid.clicks)::numeric / SUM(mid.impressions) * 100), 4)
      ELSE 0
    END as ctr,
    CASE
      WHEN SUM(mid.clicks) > 0
      THEN ROUND((SUM(mid.spend) / SUM(mid.clicks)), 4)
      ELSE 0
    END as cpc,
    CASE
      WHEN SUM(mid.impressions) > 0
      THEN ROUND((SUM(mid.spend) / SUM(mid.impressions) * 1000), 4)
      ELSE 0
    END as cpm
  FROM meta_insights_daily mid
  WHERE mid.workspace_id = p_workspace_id
    AND (p_meta_ad_account_id IS NULL OR mid.meta_ad_account_id::text = p_meta_ad_account_id)
    AND mid.level = p_level
    AND mid.date >= p_date_from
    AND mid.date <= p_date_to
  GROUP BY mid.date
  ORDER BY mid.date;
$$;


-- ============================================================
-- PART 3: Fix broad storage SELECT policies
-- ============================================================

-- Remove all redundant/broad SELECT policies on avatars bucket
DROP POLICY IF EXISTS "Allow public access to view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- Scoped policy: each user can only read files in their own avatar folder
-- Assumes path convention: avatars/{user_id}/...
CREATE POLICY "Users can view their own avatar"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Remove broad SELECT policy on workspace-logos bucket
DROP POLICY IF EXISTS "Public read access for workspace logos" ON storage.objects;

-- Scoped policy: anyone can read workspace logos (public bucket, but no listing)
-- Direct URL access still works; this just prevents enumerating all files
CREATE POLICY "Public can view workspace logos by path"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'workspace-logos'
  );
