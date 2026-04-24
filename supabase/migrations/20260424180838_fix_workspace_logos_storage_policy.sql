/*
  # Fix workspace-logos bucket broad SELECT policy

  ## Problem
  The "Public can view workspace logos by path" policy allows ANY client to list ALL files
  in the workspace-logos bucket, which exposes workspace IDs and file names to unauthenticated users.

  ## Fix
  Replace the broad SELECT policy with one that restricts access to:
  - Authenticated users who are the workspace owner, OR
  - Authenticated users who are members of the workspace

  Path convention is: workspace-logos/{workspace_id}/filename
  So (storage.foldername(name))[1] gives the workspace_id from the path.

  Public URL access still works for embedding logos in the UI — the bucket stays public
  for direct URL access, but listing is prevented for unauthorized users.
*/

-- Remove the broad policy that allows listing all files
DROP POLICY IF EXISTS "Public can view workspace logos by path" ON storage.objects;

-- Only workspace members/owners can view logos
-- Direct public URLs still work because Supabase serves public bucket objects by URL regardless of RLS
CREATE POLICY "Workspace members can view workspace logos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'workspace-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT w.id::text
      FROM workspaces w
      WHERE w.owner_id = auth.uid()
         OR EXISTS (
           SELECT 1 FROM workspace_members wm
           WHERE wm.workspace_id = w.id
             AND wm.user_id = auth.uid()
         )
    )
  );
