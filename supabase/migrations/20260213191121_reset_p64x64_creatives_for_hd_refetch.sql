/*
  # Reset p64x64 creatives for HD re-fetch

  1. Changes to `meta_ad_creatives` table
    - Resets `fetch_status` to 'pending' for all records that only have p64x64 thumbnails
    - Resets `is_complete` to false for these records
    - Resets `fetch_attempts` to 0 so the edge function will re-fetch them
    - Only affects records where `cached_image_url` is NULL (not yet cached in Storage)

  2. Scope
    - Targets records where image_url or thumbnail_url contains 'p64x64' in the URL
    - Does NOT affect records that already have cached images in Supabase Storage
    - Does NOT delete any data - only marks records for re-processing

  3. Purpose
    - After deploying the updated edge function with HD image extraction,
      these records will be re-fetched with proper high-resolution images
    - The edge function will then download and cache images in Supabase Storage
*/

UPDATE meta_ad_creatives
SET
  fetch_status = 'pending',
  is_complete = false,
  fetch_attempts = 0
WHERE
  cached_image_url IS NULL
  AND (
    (image_url IS NOT NULL AND image_url LIKE '%p64x64%')
    OR (thumbnail_url IS NOT NULL AND thumbnail_url LIKE '%p64x64%')
    OR (image_url_hd IS NULL AND image_url IS NULL AND thumbnail_url IS NOT NULL)
  );
