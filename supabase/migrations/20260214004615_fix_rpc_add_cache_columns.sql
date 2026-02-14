/*
  # Fix upsert_ad_creative_with_increment RPC - Add cache columns

  1. Modified Functions
    - `upsert_ad_creative_with_increment`: Added 4 missing parameters:
      - `p_cached_image_url` (text) - URL permanente da imagem no Supabase Storage
      - `p_cached_thumbnail_url` (text) - URL permanente do thumbnail no Supabase Storage
      - `p_cache_expires_at` (timestamptz) - Data de expiracao do cache
      - `p_file_size` (integer) - Tamanho do arquivo em bytes
    - These columns were already present in the table but the RPC function
      was not accepting or persisting them, causing all Storage cache URLs
      to be silently discarded on every upsert.

  2. Important Notes
    - This fixes the critical bug where cached_image_url was never saved
    - The edge function already computes these values and passes them,
      but the old RPC signature silently ignored them
    - After this fix, new fetches will properly persist Storage cache URLs
*/

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
  p_extra_data jsonb DEFAULT '{}'::jsonb,
  p_cached_image_url text DEFAULT NULL,
  p_cached_thumbnail_url text DEFAULT NULL,
  p_cache_expires_at timestamptz DEFAULT NULL,
  p_file_size integer DEFAULT NULL
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
    last_validated_at, error_message, extra_data, fetched_at,
    cached_image_url, cached_thumbnail_url, cache_expires_at, file_size
  ) VALUES (
    p_workspace_id, p_ad_id, p_meta_ad_account_id, p_meta_creative_id,
    p_creative_type, p_image_url, p_image_url_hd, p_thumbnail_url,
    p_thumbnail_quality, p_image_width, p_image_height,
    p_video_url, p_video_id, p_preview_url,
    p_title, p_body, p_description, p_call_to_action, p_link_url,
    p_is_complete, p_fetch_status, 1,
    now(), p_error_message, p_extra_data, now(),
    p_cached_image_url, p_cached_thumbnail_url, p_cache_expires_at, p_file_size
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
    cached_image_url = EXCLUDED.cached_image_url,
    cached_thumbnail_url = EXCLUDED.cached_thumbnail_url,
    cache_expires_at = EXCLUDED.cache_expires_at,
    file_size = EXCLUDED.file_size,
    updated_at = now();
END;
$$;
