/*
  # Enhance Meta Ad Creatives Table for Quality and Validation

  1. Changes to `meta_ad_creatives` table
    - Add `image_url_hd` (text) - High-definition image URL when available
    - Add `thumbnail_quality` (text) - Quality indicator: 'hd', 'sd', 'low', 'unknown'
    - Add `image_width` (integer) - Image width in pixels
    - Add `image_height` (integer) - Image height in pixels
    - Add `last_validated_at` (timestamptz) - Last time creative was validated
    - Add `fetch_attempts` (integer) - Number of fetch attempts (max 3)
    - Add `fetch_status` (text) - Status: 'success', 'partial', 'failed', 'pending'
    - Add `error_message` (text) - Last error message if fetch failed
    - Add `is_complete` (boolean) - Whether creative has sufficient data (image OR texts)
    - Add `updated_at` (timestamptz) - Last update timestamp

  2. Indexes
    - Add index on fetch_status for filtering incomplete creatives
    - Add index on last_validated_at for TTL queries
    - Add index on is_complete for filtering

  3. Notes
    - These fields enable quality tracking, retry logic, and cache invalidation
    - fetch_attempts prevents infinite retries
    - is_complete allows quick identification of creatives needing refresh
*/

-- Add new columns to meta_ad_creatives table
DO $$
BEGIN
  -- Add image_url_hd for high-definition images
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'image_url_hd'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN image_url_hd text;
  END IF;

  -- Add thumbnail_quality indicator
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'thumbnail_quality'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN thumbnail_quality text DEFAULT 'unknown'
      CHECK (thumbnail_quality IN ('hd', 'sd', 'low', 'unknown'));
  END IF;

  -- Add image dimensions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'image_width'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN image_width integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'image_height'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN image_height integer;
  END IF;

  -- Add validation and retry tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'last_validated_at'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN last_validated_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'fetch_attempts'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN fetch_attempts integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'fetch_status'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN fetch_status text DEFAULT 'pending'
      CHECK (fetch_status IN ('success', 'partial', 'failed', 'pending'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN error_message text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'is_complete'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN is_complete boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_ad_creatives' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE meta_ad_creatives ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_ad_creatives_fetch_status
  ON meta_ad_creatives(fetch_status) WHERE fetch_status != 'success';

CREATE INDEX IF NOT EXISTS idx_meta_ad_creatives_last_validated
  ON meta_ad_creatives(last_validated_at);

CREATE INDEX IF NOT EXISTS idx_meta_ad_creatives_is_complete
  ON meta_ad_creatives(is_complete) WHERE is_complete = false;

CREATE INDEX IF NOT EXISTS idx_meta_ad_creatives_fetch_attempts
  ON meta_ad_creatives(fetch_attempts) WHERE fetch_attempts < 3;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meta_ad_creatives_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_meta_ad_creatives_updated_at ON meta_ad_creatives;

CREATE TRIGGER trigger_update_meta_ad_creatives_updated_at
  BEFORE UPDATE ON meta_ad_creatives
  FOR EACH ROW
  EXECUTE FUNCTION update_meta_ad_creatives_updated_at();

-- Update existing records to mark them as needing validation
UPDATE meta_ad_creatives
SET
  is_complete = CASE
    WHEN (thumbnail_url IS NOT NULL OR image_url IS NOT NULL)
         OR (title IS NOT NULL OR body IS NOT NULL OR description IS NOT NULL)
    THEN true
    ELSE false
  END,
  fetch_status = CASE
    WHEN (thumbnail_url IS NOT NULL OR image_url IS NOT NULL)
    THEN 'success'
    WHEN (title IS NOT NULL OR body IS NOT NULL)
    THEN 'partial'
    ELSE 'pending'
  END,
  fetch_attempts = 1,
  last_validated_at = fetched_at
WHERE last_validated_at IS NULL;