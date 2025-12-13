/*
  # Create Meta Ad Creatives Table

  1. New Tables
    - `meta_ad_creatives`
      - `id` (uuid, primary key) - Unique identifier
      - `workspace_id` (uuid, foreign key) - Reference to workspace
      - `ad_id` (text) - Meta Ad ID
      - `meta_ad_account_id` (text) - Meta Ad Account ID
      - `meta_creative_id` (text) - Meta Creative ID from API
      - `creative_type` (text) - Type: image, video, carousel
      - `image_url` (text) - URL for image creatives
      - `thumbnail_url` (text) - Thumbnail URL for videos
      - `video_url` (text) - Video URL if applicable
      - `video_id` (text) - Meta Video ID
      - `preview_url` (text) - Shareable preview link
      - `title` (text) - Ad title/headline
      - `body` (text) - Main ad copy/body text
      - `description` (text) - Ad description
      - `call_to_action` (text) - CTA type (LEARN_MORE, SHOP_NOW, etc.)
      - `link_url` (text) - Destination URL
      - `extra_data` (jsonb) - Additional data from Meta API
      - `fetched_at` (timestamptz) - When creative was fetched
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on `meta_ad_creatives` table
    - Add policies for authenticated users based on workspace ownership

  3. Indexes
    - Index on workspace_id for filtering
    - Index on ad_id for lookups
    - Unique constraint on (workspace_id, ad_id) to prevent duplicates
*/

-- Create the meta_ad_creatives table
CREATE TABLE IF NOT EXISTS meta_ad_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  ad_id text NOT NULL,
  meta_ad_account_id text NOT NULL,
  meta_creative_id text,
  creative_type text DEFAULT 'image' CHECK (creative_type IN ('image', 'video', 'carousel', 'unknown')),
  image_url text,
  thumbnail_url text,
  video_url text,
  video_id text,
  preview_url text,
  title text,
  body text,
  description text,
  call_to_action text,
  link_url text,
  extra_data jsonb DEFAULT '{}'::jsonb,
  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- Unique constraint to prevent duplicate entries per workspace/ad
  CONSTRAINT unique_workspace_ad_creative UNIQUE (workspace_id, ad_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_ad_creatives_workspace_id 
  ON meta_ad_creatives(workspace_id);

CREATE INDEX IF NOT EXISTS idx_meta_ad_creatives_ad_id 
  ON meta_ad_creatives(ad_id);

CREATE INDEX IF NOT EXISTS idx_meta_ad_creatives_meta_ad_account 
  ON meta_ad_creatives(meta_ad_account_id);

-- Enable Row Level Security
ALTER TABLE meta_ad_creatives ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view creatives from their workspace
CREATE POLICY "Users can view workspace ad creatives"
  ON meta_ad_creatives
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can insert creatives for their workspace
CREATE POLICY "Users can create workspace ad creatives"
  ON meta_ad_creatives
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can update creatives in their workspace
CREATE POLICY "Users can update workspace ad creatives"
  ON meta_ad_creatives
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can delete creatives from their workspace
CREATE POLICY "Users can delete workspace ad creatives"
  ON meta_ad_creatives
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );
