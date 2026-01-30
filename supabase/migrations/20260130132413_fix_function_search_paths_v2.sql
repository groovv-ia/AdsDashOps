/*
  # Fix Function Search Paths

  This migration sets immutable search_path for all functions
  to prevent search_path injection attacks.

  Note: Some functions are recreated with DROP + CREATE due to
  return type constraints.
*/

-- =====================================================
-- UPDATE TRIGGER FUNCTIONS
-- =====================================================

-- update_setup_progress_updated_at
CREATE OR REPLACE FUNCTION update_setup_progress_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- update_claude_analyses_updated_at
CREATE OR REPLACE FUNCTION update_claude_analyses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- update_meta_ad_creatives_updated_at
CREATE OR REPLACE FUNCTION update_meta_ad_creatives_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- update_google_updated_at
CREATE OR REPLACE FUNCTION update_google_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- update_breakdown_updated_at
CREATE OR REPLACE FUNCTION update_breakdown_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================
-- UPDATE HELPER FUNCTIONS
-- =====================================================

-- is_workspace_member
CREATE OR REPLACE FUNCTION is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- is_workspace_admin
CREATE OR REPLACE FUNCTION is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- is_agency_user
CREATE OR REPLACE FUNCTION is_agency_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- get_user_type
CREATE OR REPLACE FUNCTION get_user_type()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
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

-- check_workspace_membership_for_client
CREATE OR REPLACE FUNCTION check_workspace_membership_for_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- handle_new_user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO workspaces (id, owner_id, name, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace',
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
