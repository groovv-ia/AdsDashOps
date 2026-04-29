/*
  # Create workspace_period_preferences table

  ## Purpose
  Persist the selected analysis period (preset or custom date range) per workspace,
  so the manager does not need to re-select the period every time they open the app.

  ## New Tables
  - `workspace_period_preferences`
    - `id` (uuid, primary key)
    - `workspace_id` (uuid, FK → workspaces, unique — one record per workspace)
    - `period_id` (text) — preset id like "last_7", "this_month", or "custom_20260101_20260415"
    - `date_from` (date) — explicit start date, always stored for easy querying
    - `date_to` (date) — explicit end date
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - SELECT: workspace owner or member can read their workspace preference
  - INSERT: workspace owner or member can create a preference
  - UPDATE: workspace owner or member can update a preference
  - DELETE: workspace owner or member can delete a preference
*/

CREATE TABLE IF NOT EXISTS workspace_period_preferences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  period_id   text NOT NULL DEFAULT 'last_7',
  date_from   date NOT NULL,
  date_to     date NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_period_preferences_workspace_unique UNIQUE (workspace_id)
);

-- Index to make workspace_id lookups fast
CREATE INDEX IF NOT EXISTS idx_workspace_period_preferences_workspace_id
  ON workspace_period_preferences (workspace_id);

ALTER TABLE workspace_period_preferences ENABLE ROW LEVEL SECURITY;

-- Allow workspace members and owner to SELECT their own workspace preference
CREATE POLICY "Workspace members can view period preference"
  ON workspace_period_preferences FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Allow workspace members and owner to INSERT a preference
CREATE POLICY "Workspace members can insert period preference"
  ON workspace_period_preferences FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Allow workspace members and owner to UPDATE the preference
CREATE POLICY "Workspace members can update period preference"
  ON workspace_period_preferences FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Allow workspace members and owner to DELETE the preference
CREATE POLICY "Workspace members can delete period preference"
  ON workspace_period_preferences FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
