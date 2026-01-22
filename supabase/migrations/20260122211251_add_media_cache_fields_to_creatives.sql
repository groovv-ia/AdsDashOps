/*
  # Add Media Cache Fields to Meta Ad Creatives

  1. Changes to `meta_ad_creatives` table
    - Add `video_source_url` (text) - Original video URL from Meta API (field "source")
    - Add `cached_video_url` (text) - URL of cached video in Supabase Storage
    - Add `cached_image_url` (text) - URL of cached image in Supabase Storage
    - Add `cached_thumbnail_url` (text) - URL of cached thumbnail in Supabase Storage
    - Add `cache_expires_at` (timestamptz) - Cache expiration timestamp (30 days default)
    - Add `video_duration` (integer) - Video duration in seconds
    - Add `video_format` (text) - Video format (mp4, webm, etc.)
    - Add `file_size` (bigint) - File size in bytes

  2. Indexes
    - Add index on cache_expires_at for cache cleanup queries
    - Add index on video_source_url for deduplication

  3. Notes
    - video_source_url stores the direct playable URL from Meta's "source" field
    - cached_* fields store URLs pointing to Supabase Storage
    - Cache expiration enables automatic cleanup of old media files
    - These fields enable proper video playback and efficient caching
*/

-- Add media cache fields to meta_ad_creatives table
DO $$
BEGIN
  -- Add video_source_url for original Meta video URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'video_source_url'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN video_source_url text;
  END IF;

  -- Add cached_video_url for Supabase Storage URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'cached_video_url'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN cached_video_url text;
  END IF;

  -- Add cached_image_url for Supabase Storage URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'cached_image_url'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN cached_image_url text;
  END IF;

  -- Add cached_thumbnail_url for Supabase Storage URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'cached_thumbnail_url'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN cached_thumbnail_url text;
  END IF;

  -- Add cache expiration timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'cache_expires_at'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN cache_expires_at timestamptz;
  END IF;

  -- Add video duration in seconds
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'video_duration'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN video_duration integer;
  END IF;

  -- Add video format
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'video_format'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN video_format text;
  END IF;

  -- Add file size
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN file_size bigint;
  END IF;
END $$;

-- Create indexes for cache management
CREATE INDEX IF NOT EXISTS idx_meta_ad_creatives_cache_expires
  ON meta_ad_creatives(cache_expires_at)
  WHERE cache_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meta_ad_creatives_video_source
  ON meta_ad_creatives(video_source_url)
  WHERE video_source_url IS NOT NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN meta_ad_creatives.video_source_url IS 'Original video URL from Meta API (source field) - direct playable URL';
COMMENT ON COLUMN meta_ad_creatives.cached_video_url IS 'URL of video cached in Supabase Storage';
COMMENT ON COLUMN meta_ad_creatives.cached_image_url IS 'URL of image cached in Supabase Storage';
COMMENT ON COLUMN meta_ad_creatives.cached_thumbnail_url IS 'URL of thumbnail cached in Supabase Storage';
COMMENT ON COLUMN meta_ad_creatives.cache_expires_at IS 'Cache expiration timestamp (default 30 days from creation)';
COMMENT ON COLUMN meta_ad_creatives.video_duration IS 'Video duration in seconds';
COMMENT ON COLUMN meta_ad_creatives.video_format IS 'Video format (mp4, webm, etc.)';
COMMENT ON COLUMN meta_ad_creatives.file_size IS 'Media file size in bytes';
