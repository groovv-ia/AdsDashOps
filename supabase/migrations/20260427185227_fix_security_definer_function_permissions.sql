/*
  # Fix Security: Revoke public EXECUTE on SECURITY DEFINER functions

  ## Problem
  All SECURITY DEFINER functions in the public schema were executable by the
  `anon` role (unauthenticated users) and many by `authenticated` users, even
  though most are internal helpers, trigger functions, or service-role-only RPCs.

  ## Changes
  - Revoke EXECUTE from `anon` on ALL listed functions (none should be public)
  - Revoke EXECUTE from `authenticated` on functions that are:
    - Trigger functions (called by DB engine, not users)
    - Internal helpers used only via service role in edge functions
    - Administrative functions (cleanup, policy creation, encryption)
  - Keep EXECUTE for `authenticated` only on functions legitimately called by
    the frontend: `get_user_workspace_id`

  ## Security Notes
  - Trigger functions (set_updated_at, handle_new_user, etc.) are invoked by
    the DB engine and never need direct user execution rights
  - Encryption/decryption functions are only used via service role in edge functions
  - Cleanup functions should only run via cron/service role
*/

-- ============================================================
-- 1. REVOKE from anon for ALL functions (none are public)
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.calculate_insight_effectiveness() FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_insight_effectiveness(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_workspace_membership_for_client(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_ai_insights() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_notifications() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_tokens() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_workspace_for_user(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrypt_token(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_google_connection_secrets(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.encrypt_token(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_client_ids_for_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_client_insights_summary(uuid, uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_daily_trend(uuid, text, text, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_google_connection_secret(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_default_workspace(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_type() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_workspace_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_agency_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_workspace_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.store_google_connection_secret(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.token_needs_refresh(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_delete_google_connection_secrets() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_breakdown_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_claude_analyses_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_google_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_meta_ad_creatives_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_setup_progress_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;

-- upsert_ad_creative_with_increment (2 overloads)
DO $$
BEGIN
  -- Overload 1 (23 params)
  REVOKE EXECUTE ON FUNCTION public.upsert_ad_creative_with_increment(
    uuid, text, text, text, text, text, text, text, text, integer, integer,
    text, text, text, text, text, text, text, text, boolean, text, text, jsonb
  ) FROM anon;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  -- Overload 2 (27 params)
  REVOKE EXECUTE ON FUNCTION public.upsert_ad_creative_with_increment(
    uuid, text, text, text, text, text, text, text, text, integer, integer,
    text, text, text, text, text, text, text, text, boolean, text, text, jsonb,
    text, text, timestamptz, integer
  ) FROM anon;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.create_policy_if_not_exists(text, text, text) FROM anon;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- ============================================================
-- 2. REVOKE from authenticated for functions that are internal-only
--    (triggers, service-role-only, admin functions)
-- ============================================================

-- Trigger functions: invoked by DB engine, users must never call them directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_breakdown_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_claude_analyses_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_google_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_meta_ad_creatives_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_setup_progress_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_delete_google_connection_secrets() FROM authenticated;

-- Encryption/decryption: only used by service role in edge functions
REVOKE EXECUTE ON FUNCTION public.encrypt_token(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_token(text) FROM authenticated;

-- Google secrets: only used by service role in edge functions
REVOKE EXECUTE ON FUNCTION public.store_google_connection_secret(uuid, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_google_connection_secret(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_google_connection_secrets(uuid) FROM authenticated;

-- Admin/cleanup functions: should only run via service role/cron
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_tokens() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_notifications() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_ai_insights() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_insight_effectiveness() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_insight_effectiveness(uuid) FROM authenticated;

-- Policy management: admin-only, service role
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.create_policy_if_not_exists(text, text, text) FROM authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- upsert_ad_creative_with_increment: only called from edge functions via service role
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.upsert_ad_creative_with_increment(
    uuid, text, text, text, text, text, text, text, text, integer, integer,
    text, text, text, text, text, text, text, text, boolean, text, text, jsonb
  ) FROM authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.upsert_ad_creative_with_increment(
    uuid, text, text, text, text, text, text, text, text, integer, integer,
    text, text, text, text, text, text, text, text, boolean, text, text, jsonb,
    text, text, timestamptz, integer
  ) FROM authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- ============================================================
-- 3. KEEP EXECUTE for authenticated on legitimately user-facing RPCs
--    (get_user_workspace_id is called by the frontend)
-- ============================================================
-- get_user_workspace_id: keep for authenticated (used in MetaInsightsDataService)
-- get_client_ids_for_user: keep for authenticated (client portal)
-- get_client_insights_summary: keep for authenticated (client portal)
-- get_daily_trend: keep for authenticated (dashboard charts)
-- get_user_default_workspace: keep for authenticated (workspace setup)
-- get_user_type: keep for authenticated (role-based UI)
-- is_agency_user: keep for authenticated (role-based UI)
-- is_workspace_admin: keep for authenticated (workspace management)
-- is_workspace_member: keep for authenticated (access control)
-- check_workspace_membership_for_client: keep for authenticated (client portal)
-- create_workspace_for_user: keep for authenticated (onboarding)
-- token_needs_refresh: keep for authenticated (token management)
