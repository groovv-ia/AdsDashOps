/*
  # Optimize RLS Policies - Batch 1

  This migration optimizes RLS policies by wrapping auth.<function>() calls
  with (select auth.<function>()) to prevent re-evaluation per row.

  Tables optimized:
    - profiles
    - data_connections
    - campaigns
    - ad_sets
    - ads
    - ad_metrics

  Changes:
    - Replace auth.uid() with (select auth.uid()) in policy expressions
*/

-- =====================================================
-- PROFILES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Enable delete for authenticated users on their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users on their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable select for authenticated users on their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update for authenticated users on their own profile" ON profiles;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "profiles_delete_own"
  ON profiles FOR DELETE TO authenticated
  USING (id = (select auth.uid()));

-- =====================================================
-- DATA_CONNECTIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can insert own connections" ON data_connections;

CREATE POLICY "data_connections_insert_own"
  ON data_connections FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- CAMPAIGNS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can delete own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can insert own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can view own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Client users can view their client campaigns" ON campaigns;

CREATE POLICY "campaigns_select_own"
  ON campaigns FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "campaigns_insert_own"
  ON campaigns FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "campaigns_update_own"
  ON campaigns FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "campaigns_delete_own"
  ON campaigns FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- AD_SETS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can delete own ad_sets" ON ad_sets;
DROP POLICY IF EXISTS "Users can insert own ad_sets" ON ad_sets;
DROP POLICY IF EXISTS "Users can update own ad_sets" ON ad_sets;
DROP POLICY IF EXISTS "Users can view own ad_sets" ON ad_sets;
DROP POLICY IF EXISTS "Client users can view their client ad sets" ON ad_sets;

CREATE POLICY "ad_sets_select_own"
  ON ad_sets FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "ad_sets_insert_own"
  ON ad_sets FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "ad_sets_update_own"
  ON ad_sets FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "ad_sets_delete_own"
  ON ad_sets FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- ADS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can delete own ads" ON ads;
DROP POLICY IF EXISTS "Users can insert own ads" ON ads;
DROP POLICY IF EXISTS "Users can update own ads" ON ads;
DROP POLICY IF EXISTS "Users can view own ads" ON ads;
DROP POLICY IF EXISTS "Client users can view their client ads" ON ads;

CREATE POLICY "ads_select_own"
  ON ads FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "ads_insert_own"
  ON ads FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "ads_update_own"
  ON ads FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "ads_delete_own"
  ON ads FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- AD_METRICS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can delete own metrics" ON ad_metrics;
DROP POLICY IF EXISTS "Users can insert own metrics" ON ad_metrics;
DROP POLICY IF EXISTS "Users can update own metrics" ON ad_metrics;
DROP POLICY IF EXISTS "Users can view own metrics" ON ad_metrics;
DROP POLICY IF EXISTS "Client users can view their client metrics" ON ad_metrics;

CREATE POLICY "ad_metrics_select_own"
  ON ad_metrics FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "ad_metrics_insert_own"
  ON ad_metrics FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "ad_metrics_update_own"
  ON ad_metrics FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "ad_metrics_delete_own"
  ON ad_metrics FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));
