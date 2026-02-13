/*
  # Fix creative fetch_attempts and stuck records

  1. New Functions
    - `upsert_ad_creative_with_increment`: RPC function that upserts a creative
      record and properly increments `fetch_attempts` instead of resetting to 1.
      On conflict (workspace_id, ad_id), it increments the existing counter.

  2. Data Fixes
    - Updates 199+ records that have valid image/text data but are stuck with
      `is_complete = false` and `fetch_status = 'pending'`
    - Sets them to `is_complete = true` and `fetch_status = 'success'` or `'partial'`
    - Marks empty records with 3+ fetch_attempts as `fetch_status = 'failed'`
      to stop infinite retry loops

  3. Important Notes
    - This fixes the infinite retry loop where creatives were constantly re-fetched
    - The RPC function is called by the meta-fetch-ad-creatives-batch edge function
    - Security: function runs with SECURITY DEFINER and has search_path set
*/

-- RPC function para upsert com incremento de fetch_attempts
CREATE OR REPLACE FUNCTION upsert_ad_creative_with_increment(
  p_workspace_id uuid,
  p_ad_id text,
  p_meta_ad_account_id text,
  p_meta_creative_id text DEFAULT NULL,
  p_creative_type text DEFAULT 'unknown',
  p_image_url text DEFAULT NULL,
  p_image_url_hd text DEFAULT NULL,
  p_thumbnail_url text DEFAULT NULL,
  p_thumbnail_quality text DEFAULT 'unknown',
  p_image_width integer DEFAULT NULL,
  p_image_height integer DEFAULT NULL,
  p_video_url text DEFAULT NULL,
  p_video_id text DEFAULT NULL,
  p_preview_url text DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_body text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_call_to_action text DEFAULT NULL,
  p_link_url text DEFAULT NULL,
  p_is_complete boolean DEFAULT false,
  p_fetch_status text DEFAULT 'pending',
  p_error_message text DEFAULT NULL,
  p_extra_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO meta_ad_creatives (
    workspace_id, ad_id, meta_ad_account_id, meta_creative_id,
    creative_type, image_url, image_url_hd, thumbnail_url,
    thumbnail_quality, image_width, image_height,
    video_url, video_id, preview_url,
    title, body, description, call_to_action, link_url,
    is_complete, fetch_status, fetch_attempts,
    last_validated_at, error_message, extra_data, fetched_at
  ) VALUES (
    p_workspace_id, p_ad_id, p_meta_ad_account_id, p_meta_creative_id,
    p_creative_type, p_image_url, p_image_url_hd, p_thumbnail_url,
    p_thumbnail_quality, p_image_width, p_image_height,
    p_video_url, p_video_id, p_preview_url,
    p_title, p_body, p_description, p_call_to_action, p_link_url,
    p_is_complete, p_fetch_status, 1,
    now(), p_error_message, p_extra_data, now()
  )
  ON CONFLICT (workspace_id, ad_id) DO UPDATE SET
    meta_creative_id = COALESCE(EXCLUDED.meta_creative_id, meta_ad_creatives.meta_creative_id),
    creative_type = EXCLUDED.creative_type,
    image_url = EXCLUDED.image_url,
    image_url_hd = EXCLUDED.image_url_hd,
    thumbnail_url = EXCLUDED.thumbnail_url,
    thumbnail_quality = EXCLUDED.thumbnail_quality,
    image_width = EXCLUDED.image_width,
    image_height = EXCLUDED.image_height,
    video_url = EXCLUDED.video_url,
    video_id = EXCLUDED.video_id,
    preview_url = EXCLUDED.preview_url,
    title = EXCLUDED.title,
    body = EXCLUDED.body,
    description = EXCLUDED.description,
    call_to_action = EXCLUDED.call_to_action,
    link_url = EXCLUDED.link_url,
    is_complete = EXCLUDED.is_complete,
    fetch_status = EXCLUDED.fetch_status,
    fetch_attempts = meta_ad_creatives.fetch_attempts + 1,
    last_validated_at = now(),
    error_message = EXCLUDED.error_message,
    extra_data = EXCLUDED.extra_data,
    fetched_at = now(),
    updated_at = now();
END;
$$;

-- Fix records que tem imagem e textos mas estao marcados como incompletos
UPDATE meta_ad_creatives
SET
  is_complete = true,
  fetch_status = 'success',
  updated_at = now()
WHERE
  (image_url IS NOT NULL OR thumbnail_url IS NOT NULL)
  AND (title IS NOT NULL OR body IS NOT NULL OR description IS NOT NULL)
  AND (is_complete = false OR fetch_status = 'pending');

-- Fix records que tem apenas imagem (sem textos) mas estao como pending
UPDATE meta_ad_creatives
SET
  is_complete = true,
  fetch_status = 'partial',
  updated_at = now()
WHERE
  (image_url IS NOT NULL OR thumbnail_url IS NOT NULL)
  AND title IS NULL AND body IS NULL AND description IS NULL
  AND (is_complete = false OR fetch_status = 'pending');

-- Fix records vazios com muitas tentativas: marca como failed para parar o loop
UPDATE meta_ad_creatives
SET
  fetch_status = 'failed',
  updated_at = now()
WHERE
  image_url IS NULL
  AND thumbnail_url IS NULL
  AND title IS NULL
  AND body IS NULL
  AND description IS NULL
  AND fetch_attempts >= 3
  AND fetch_status != 'failed';
