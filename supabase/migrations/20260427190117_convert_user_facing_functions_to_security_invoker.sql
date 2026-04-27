/*
  # Convert user-facing functions to SECURITY INVOKER

  ## Problem
  Functions accessible to `authenticated` users were flagged as unsafe because
  they run as SECURITY DEFINER (elevated privileges). Since all these functions:
  - Only query tables that already have RLS enabled
  - Only use auth.uid() to scope access
  - Do not need to bypass any RLS policies

  ...they can safely run as SECURITY INVOKER (caller's permissions), which is
  the recommended pattern and eliminates the security warning.

  ## Functions converted (all to SECURITY INVOKER):
  - is_workspace_member
  - is_workspace_admin
  - is_agency_user
  - get_user_workspace_id
  - get_user_default_workspace
  - get_user_type
  - get_client_ids_for_user
  - get_client_insights_summary
  - get_daily_trend
  - check_workspace_membership_for_client
  - create_workspace_for_user
  - token_needs_refresh

  ## Note on create_workspace_for_user
  This function reads from auth.users, which requires SECURITY DEFINER to
  access. It is kept as SECURITY DEFINER but the internal logic is safe
  (only reads the calling user's own email via p_user_id = auth.uid()).
  We add a guard to ensure only the calling user can create their own workspace.
*/

-- ============================================================
-- Simple boolean membership/role checks
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces WHERE id = p_workspace_id AND owner_id = auth.uid()
    UNION
    SELECT 1 FROM workspace_members WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces WHERE id = p_workspace_id AND owner_id = auth.uid()
    UNION
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_agency_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces WHERE owner_id = auth.uid()
    UNION
    SELECT 1 FROM workspace_members WHERE user_id = auth.uid()
  );
END;
$$;

-- ============================================================
-- Workspace lookup functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_workspace_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  workspace_uuid uuid;
BEGIN
  SELECT id INTO workspace_uuid
  FROM workspaces
  WHERE owner_id = auth.uid()
  LIMIT 1;

  RETURN workspace_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_default_workspace(p_user_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Prefer workspace where user is owner
  SELECT id INTO v_workspace_id
  FROM workspaces
  WHERE owner_id = v_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  -- Fallback: workspace where user is a member
  IF v_workspace_id IS NULL THEN
    SELECT workspace_id INTO v_workspace_id
    FROM workspace_members
    WHERE user_id = v_user_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  RETURN v_workspace_id;
END;
$$;

-- ============================================================
-- User type / role detection
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_type()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM client_users WHERE user_id = auth.uid()) THEN
    RETURN 'client';
  ELSIF EXISTS (SELECT 1 FROM workspaces WHERE owner_id = auth.uid()) THEN
    RETURN 'agency_owner';
  ELSIF EXISTS (SELECT 1 FROM workspace_members WHERE user_id = auth.uid()) THEN
    RETURN 'agency_member';
  END IF;
  RETURN 'unknown';
END;
$$;

-- ============================================================
-- Client portal functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_client_ids_for_user()
RETURNS uuid[]
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.get_client_insights_summary(
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
SECURITY INVOKER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.check_workspace_membership_for_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  SELECT workspace_id INTO v_workspace_id FROM clients WHERE id = p_client_id;
  IF v_workspace_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN is_workspace_member(v_workspace_id);
END;
$$;

-- ============================================================
-- Dashboard trend function
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_daily_trend(
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
SECURITY INVOKER
SET search_path = public
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
-- Token refresh check
-- ============================================================

CREATE OR REPLACE FUNCTION public.token_needs_refresh(token_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  token_expires timestamptz;
BEGIN
  SELECT expires_at INTO token_expires
  FROM public.oauth_tokens
  WHERE id = token_id;

  -- Refresh if expiring within 1 hour
  RETURN token_expires < NOW() + INTERVAL '1 hour';
END;
$$;

-- ============================================================
-- create_workspace_for_user: must stay SECURITY DEFINER to read
-- auth.users, but we guard it so users can only create for themselves
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_workspace_for_user(
  p_user_id uuid,
  p_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_workspace_name text;
  v_user_email text;
BEGIN
  -- Security guard: users can only create workspaces for themselves
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: cannot create workspace for another user';
  END IF;

  IF p_name IS NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    v_workspace_name := COALESCE(
      split_part(v_user_email, '@', 1) || '''s Workspace',
      'Meu Workspace'
    );
  ELSE
    v_workspace_name := p_name;
  END IF;

  INSERT INTO workspaces (name, owner_id)
  VALUES (v_workspace_name, p_user_id)
  RETURNING id INTO v_workspace_id;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, p_user_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN v_workspace_id;
END;
$$;

-- Re-grant execute to authenticated for all converted functions
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_agency_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_workspace_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_default_workspace(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_type() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_ids_for_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_insights_summary(uuid, uuid, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_workspace_membership_for_client(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_daily_trend(uuid, text, text, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.token_needs_refresh(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_workspace_for_user(uuid, text) TO authenticated, service_role;
