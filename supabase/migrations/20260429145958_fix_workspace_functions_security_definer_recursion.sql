/*
  # Fix Stack Depth Limit Exceeded - Restore SECURITY DEFINER on Workspace Functions

  ## Problem
  The migration 20260427190117 converted `is_workspace_member()` and `is_workspace_admin()` 
  from SECURITY DEFINER to SECURITY INVOKER. This caused infinite recursion because:
  
  1. `is_workspace_member()` queries `workspace_members` table
  2. `workspace_members` has an RLS SELECT policy that calls `is_workspace_member()`
  3. As INVOKER, the function respects RLS, causing: function → table → RLS → function → infinite loop
  
  ## Solution
  Restore these two functions to SECURITY DEFINER so they bypass RLS when querying 
  `workspace_members` and `workspaces` tables, breaking the recursion cycle.
  
  ## Changes
  - `is_workspace_member(uuid)` → SECURITY DEFINER (was INVOKER)
  - `is_workspace_admin(uuid)` → SECURITY DEFINER (was INVOKER)
  
  Both retain `SET search_path TO 'public'` for security against search_path injection.

  ## Additional Fix
  - Add missing UPDATE policy on `meta_insights_daily` for upsert operations
*/

-- Restore is_workspace_member as SECURITY DEFINER to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces WHERE id = p_workspace_id AND owner_id = auth.uid()
    UNION
    SELECT 1 FROM workspace_members WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  );
END;
$function$;

-- Restore is_workspace_admin as SECURITY DEFINER to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Revoke direct execute from public (only authenticated should call these)
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_workspace_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid) TO authenticated;

-- Add missing UPDATE policy on meta_insights_daily (needed for upsert operations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meta_insights_daily' 
    AND policyname = 'Workspace owner can update insights'
  ) THEN
    CREATE POLICY "Workspace owner can update insights"
      ON meta_insights_daily
      FOR UPDATE
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM workspaces
        WHERE workspaces.id = meta_insights_daily.workspace_id
        AND workspaces.owner_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM workspaces
        WHERE workspaces.id = meta_insights_daily.workspace_id
        AND workspaces.owner_id = auth.uid()
      ));
  END IF;
END $$;
