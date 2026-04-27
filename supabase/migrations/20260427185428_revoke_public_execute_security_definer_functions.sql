/*
  # Revoke PUBLIC EXECUTE on all SECURITY DEFINER functions

  ## Problem
  All SECURITY DEFINER functions had EXECUTE granted to PUBLIC (the default in
  PostgreSQL for new functions). This means ANY role including `anon` (unauthenticated
  users) could call them via the REST API. Individual REVOKE from `anon`/`authenticated`
  doesn't work when PUBLIC has the grant — must revoke from PUBLIC first.

  ## Changes
  - Revoke EXECUTE from PUBLIC on all affected functions
  - Re-grant EXECUTE to `authenticated` only on functions the frontend legitimately uses
  - Re-grant EXECUTE to `service_role` on all functions (for edge functions)
  - Trigger functions and internal helpers get no user-facing grants

  ## Functions kept accessible to `authenticated`:
  - get_user_workspace_id: called by frontend (MetaInsightsDataService)
  - get_client_ids_for_user: client portal
  - get_client_insights_summary: client portal
  - get_daily_trend: dashboard charts
  - get_user_default_workspace: workspace setup
  - get_user_type: role-based UI
  - get_user_workspace_id: workspace detection
  - is_agency_user: role-based UI
  - is_workspace_admin: workspace management
  - is_workspace_member: access control
  - check_workspace_membership_for_client: client portal
  - create_workspace_for_user: onboarding
  - token_needs_refresh: token management
*/

-- ============================================================
-- Trigger / timestamp functions: revoke PUBLIC, no user grants needed
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_breakdown_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_claude_analyses_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_google_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_meta_ad_creatives_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_setup_progress_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trigger_delete_google_connection_secrets() FROM PUBLIC;

-- ============================================================
-- Encryption / secret management: revoke PUBLIC, service_role only
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.encrypt_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrypt_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.store_google_connection_secret(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_google_connection_secret(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_google_connection_secrets(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.encrypt_token(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_token(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.store_google_connection_secret(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_google_connection_secret(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_google_connection_secrets(uuid) TO service_role;

-- ============================================================
-- Admin / cleanup functions: revoke PUBLIC, service_role only
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_tokens() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_notifications() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_ai_insights() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_insight_effectiveness() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_insight_effectiveness(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_tokens() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_notifications() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_ai_insights() TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_insight_effectiveness() TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_insight_effectiveness(uuid) TO service_role;

-- ============================================================
-- Policy management: revoke PUBLIC, service_role only
-- ============================================================
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.create_policy_if_not_exists(text, text, text) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.create_policy_if_not_exists(text, text, text) TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- ============================================================
-- upsert_ad_creative_with_increment: revoke PUBLIC, service_role only
-- (called exclusively from edge functions via service role key)
-- ============================================================
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.upsert_ad_creative_with_increment(
    uuid, text, text, text, text, text, text, text, text, integer, integer,
    text, text, text, text, text, text, text, text, boolean, text, text, jsonb
  ) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.upsert_ad_creative_with_increment(
    uuid, text, text, text, text, text, text, text, text, integer, integer,
    text, text, text, text, text, text, text, text, boolean, text, text, jsonb
  ) TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.upsert_ad_creative_with_increment(
    uuid, text, text, text, text, text, text, text, text, integer, integer,
    text, text, text, text, text, text, text, text, boolean, text, text, jsonb,
    text, text, timestamptz, integer
  ) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.upsert_ad_creative_with_increment(
    uuid, text, text, text, text, text, text, text, text, integer, integer,
    text, text, text, text, text, text, text, text, boolean, text, text, jsonb,
    text, text, timestamptz, integer
  ) TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- ============================================================
-- User-facing functions: revoke PUBLIC, grant to authenticated + service_role
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.get_user_workspace_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_client_ids_for_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_client_insights_summary(uuid, uuid, date, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_daily_trend(uuid, text, text, date, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_default_workspace(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_type() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_agency_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_workspace_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_workspace_membership_for_client(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_workspace_for_user(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.token_needs_refresh(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_user_workspace_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_ids_for_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_insights_summary(uuid, uuid, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_daily_trend(uuid, text, text, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_default_workspace(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_type() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_agency_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_workspace_membership_for_client(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_workspace_for_user(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.token_needs_refresh(uuid) TO authenticated, service_role;
