/*
  # Fix campaigns.account_id and reset stale creative cache

  1. Data Fix
    - Populate `campaigns.account_id` for all campaigns by looking up the
      Meta ad account ID from the `data_connections` table via each campaign's
      `connection_id`.
    - This is the #1 blocker preventing creatives from loading.

  2. Cache Reset
    - Update `last_validated_at` to now() on all `meta_ad_creatives` records
      that have `fetch_status = 'success'` but stale `last_validated_at`.
    - This prevents the infinite refetch loop caused by expired cache TTL.

  3. Important Notes
    - No destructive operations; only UPDATE statements.
    - Campaigns without a matching `data_connections` record are skipped.
*/

-- Step 1: Populate campaigns.account_id from data_connections.config->>'accountId'
UPDATE campaigns
SET account_id = dc.config->>'accountId'
FROM data_connections dc
WHERE campaigns.connection_id = dc.id
  AND campaigns.account_id IS NULL
  AND dc.config->>'accountId' IS NOT NULL;

-- Step 2: Reset last_validated_at for complete creatives to stop refetch loop
UPDATE meta_ad_creatives
SET last_validated_at = NOW()
WHERE fetch_status = 'success'
  AND (last_validated_at IS NULL OR last_validated_at < NOW() - INTERVAL '7 days');
