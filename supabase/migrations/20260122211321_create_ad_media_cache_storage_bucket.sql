/*
  # Create Storage Bucket for Ad Media Cache

  1. Create Storage Bucket
    - Bucket name: `ad-media-cache`
    - Purpose: Store cached images, videos, and thumbnails from Meta Ads
    - Public: false (controlled by RLS policies)
    - File size limit: 100MB (videos can be large)
    - Allowed MIME types: images and videos

  2. Storage Policies
    - Authenticated users can upload media for their workspace
    - Authenticated users can read media from their workspace
    - Service role can manage all media (for automated cleanup)

  3. Folder Structure
    - `/workspaces/{workspace_id}/images/{ad_id}/{filename}`
    - `/workspaces/{workspace_id}/videos/{ad_id}/{filename}`
    - `/workspaces/{workspace_id}/thumbnails/{ad_id}/{filename}`

  4. Notes
    - 30-day cache expiration (managed by application logic)
    - Automatic cleanup via scheduled job
    - Deduplication by checking existing cached URLs
*/

-- Create the storage bucket for ad media cache
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ad-media-cache',
  'ad-media-cache',
  false,
  104857600, -- 100MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo'
  ];

-- Policy: Authenticated users can upload media to their workspace folders
CREATE POLICY "Users can upload media to their workspace"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ad-media-cache' AND
    (storage.foldername(name))[1] = 'workspaces' AND
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policy: Authenticated users can read media from their workspace folders
CREATE POLICY "Users can read media from their workspace"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ad-media-cache' AND
    (storage.foldername(name))[1] = 'workspaces' AND
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policy: Authenticated users can update media in their workspace folders
CREATE POLICY "Users can update media in their workspace"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'ad-media-cache' AND
    (storage.foldername(name))[1] = 'workspaces' AND
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM workspaces WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'ad-media-cache' AND
    (storage.foldername(name))[1] = 'workspaces' AND
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policy: Authenticated users can delete media from their workspace folders
CREATE POLICY "Users can delete media from their workspace"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ad-media-cache' AND
    (storage.foldername(name))[1] = 'workspaces' AND
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policy: Service role can manage all media (for automated cleanup jobs)
CREATE POLICY "Service role can manage all media"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'ad-media-cache')
  WITH CHECK (bucket_id = 'ad-media-cache');
