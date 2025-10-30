/*
  # Fix Security and Performance Issues

  1. Performance Improvements
    - Add missing indexes for foreign keys
    - Optimize RLS policies to use (select auth.uid()) pattern
    - Fix function search paths to be immutable

  2. Security Enhancements
    - Ensure all RLS policies are optimized for performance
    - Set proper search paths on functions

  3. Changes
    - Add 9 missing foreign key indexes
    - Update 8 RLS policies to use optimized auth.uid() calls
    - Fix 2 functions with mutable search paths
*/

-- =====================================================
-- PART 1: Add Missing Indexes for Foreign Keys
-- =====================================================

-- Indexes for ad_creatives table
CREATE INDEX IF NOT EXISTS idx_ad_creatives_connection_id 
  ON ad_creatives(connection_id);

CREATE INDEX IF NOT EXISTS idx_ad_creatives_user_id 
  ON ad_creatives(user_id);

-- Indexes for audience_insights table
CREATE INDEX IF NOT EXISTS idx_audience_insights_ad_set_id 
  ON audience_insights(ad_set_id);

CREATE INDEX IF NOT EXISTS idx_audience_insights_connection_id 
  ON audience_insights(connection_id);

CREATE INDEX IF NOT EXISTS idx_audience_insights_user_id 
  ON audience_insights(user_id);

-- Indexes for conversion_events table
CREATE INDEX IF NOT EXISTS idx_conversion_events_connection_id 
  ON conversion_events(connection_id);

CREATE INDEX IF NOT EXISTS idx_conversion_events_user_id 
  ON conversion_events(user_id);

-- Indexes for oauth_tokens table
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id 
  ON oauth_tokens(user_id);

-- Indexes for sync_jobs table
CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_id 
  ON sync_jobs(user_id);

-- =====================================================
-- PART 2: Optimize RLS Policies
-- =====================================================

-- Drop existing policies and recreate with optimized auth.uid() calls

-- api_credentials policies
DROP POLICY IF EXISTS "Users can manage their own API credentials" ON api_credentials;

CREATE POLICY "Users can view their own API credentials"
  ON api_credentials
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own API credentials"
  ON api_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own API credentials"
  ON api_credentials
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own API credentials"
  ON api_credentials
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- oauth_tokens policies
DROP POLICY IF EXISTS "Users can manage their own OAuth tokens" ON oauth_tokens;

CREATE POLICY "Users can view their own OAuth tokens"
  ON oauth_tokens
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own OAuth tokens"
  ON oauth_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own OAuth tokens"
  ON oauth_tokens
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own OAuth tokens"
  ON oauth_tokens
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- sync_jobs policies
DROP POLICY IF EXISTS "Users can view their own sync jobs" ON sync_jobs;
DROP POLICY IF EXISTS "Users can insert their own sync jobs" ON sync_jobs;
DROP POLICY IF EXISTS "Users can update their own sync jobs" ON sync_jobs;

CREATE POLICY "Users can view their own sync jobs"
  ON sync_jobs
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own sync jobs"
  ON sync_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own sync jobs"
  ON sync_jobs
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ad_creatives policies
DROP POLICY IF EXISTS "Users can manage their own ad creatives" ON ad_creatives;

CREATE POLICY "Users can view their own ad creatives"
  ON ad_creatives
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own ad creatives"
  ON ad_creatives
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own ad creatives"
  ON ad_creatives
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own ad creatives"
  ON ad_creatives
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- audience_insights policies
DROP POLICY IF EXISTS "Users can manage their own audience insights" ON audience_insights;

CREATE POLICY "Users can view their own audience insights"
  ON audience_insights
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own audience insights"
  ON audience_insights
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own audience insights"
  ON audience_insights
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own audience insights"
  ON audience_insights
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- conversion_events policies
DROP POLICY IF EXISTS "Users can manage their own conversion events" ON conversion_events;

CREATE POLICY "Users can view their own conversion events"
  ON conversion_events
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own conversion events"
  ON conversion_events
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own conversion events"
  ON conversion_events
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own conversion events"
  ON conversion_events
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- =====================================================
-- PART 3: Fix Functions with Mutable Search Paths
-- =====================================================

-- Recreate cleanup_expired_tokens with immutable search path
DROP FUNCTION IF EXISTS cleanup_expired_tokens();

CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.oauth_tokens
  WHERE expires_at < NOW() - INTERVAL '30 days'
  AND refresh_token_encrypted IS NULL;
END;
$$;

-- Recreate token_needs_refresh with immutable search path
DROP FUNCTION IF EXISTS token_needs_refresh(uuid);

CREATE OR REPLACE FUNCTION token_needs_refresh(token_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  token_expires timestamptz;
BEGIN
  SELECT expires_at INTO token_expires
  FROM public.oauth_tokens
  WHERE id = token_id;
  
  -- Renova se faltar menos de 1 hora para expirar
  RETURN token_expires < NOW() + INTERVAL '1 hour';
END;
$$;

-- =====================================================
-- PART 4: Add Comments for Documentation
-- =====================================================

COMMENT ON INDEX idx_ad_creatives_connection_id IS 'Index for foreign key ad_creatives_connection_id_fkey to improve query performance';
COMMENT ON INDEX idx_ad_creatives_user_id IS 'Index for foreign key ad_creatives_user_id_fkey to improve query performance';
COMMENT ON INDEX idx_audience_insights_ad_set_id IS 'Index for foreign key audience_insights_ad_set_id_fkey to improve query performance';
COMMENT ON INDEX idx_audience_insights_connection_id IS 'Index for foreign key audience_insights_connection_id_fkey to improve query performance';
COMMENT ON INDEX idx_audience_insights_user_id IS 'Index for foreign key audience_insights_user_id_fkey to improve query performance';
COMMENT ON INDEX idx_conversion_events_connection_id IS 'Index for foreign key conversion_events_connection_id_fkey to improve query performance';
COMMENT ON INDEX idx_conversion_events_user_id IS 'Index for foreign key conversion_events_user_id_fkey to improve query performance';
COMMENT ON INDEX idx_oauth_tokens_user_id IS 'Index for foreign key oauth_tokens_user_id_fkey to improve query performance';
COMMENT ON INDEX idx_sync_jobs_user_id IS 'Index for foreign key sync_jobs_user_id_fkey to improve query performance';

COMMENT ON FUNCTION cleanup_expired_tokens() IS 'Removes expired OAuth tokens that do not have refresh tokens. Search path set to public, pg_temp for security.';
COMMENT ON FUNCTION token_needs_refresh(uuid) IS 'Checks if an OAuth token needs to be refreshed (expires in less than 1 hour). Search path set to public, pg_temp for security.';
