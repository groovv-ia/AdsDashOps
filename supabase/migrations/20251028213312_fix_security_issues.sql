/*
  # Fix Security and Performance Issues

  ## Changes Made

  ### 1. Add Missing Foreign Key Indexes
  - Add indexes for all foreign keys in ad_metrics table (ad_id, ad_set_id, connection_id, user_id)
  - Add indexes for all foreign keys in ad_sets table (campaign_id, connection_id, user_id)
  - Add indexes for all foreign keys in ads table (ad_set_id, campaign_id, connection_id, user_id)

  ### 2. Optimize RLS Policies
  - Replace `auth.uid()` with `(select auth.uid())` in all RLS policies to prevent re-evaluation per row
  - This affects tables: minha_tabela, data_connections, campaigns, ad_sets, ads, ad_metrics, 
    notifications, notification_settings, notification_rules, profiles, ai_insights, 
    ai_analysis_history, ai_recommendations

  ### 3. Remove Duplicate RLS Policies
  - Drop duplicate policies on profiles table (keeping the newer "Users can X own profile" versions)

  ### 4. Remove Unused Indexes
  - Drop indexes that are not being used to reduce maintenance overhead

  ### 5. Fix Function Search Paths
  - Add SECURITY DEFINER and explicit search_path to functions for security
*/

-- =============================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =============================================

-- Indexes for ad_metrics table
CREATE INDEX IF NOT EXISTS idx_ad_metrics_ad_id ON public.ad_metrics(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_ad_set_id ON public.ad_metrics(ad_set_id);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_connection_id ON public.ad_metrics(connection_id);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_user_id ON public.ad_metrics(user_id);

-- Indexes for ad_sets table
CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign_id ON public.ad_sets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_connection_id ON public.ad_sets(connection_id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_user_id ON public.ad_sets(user_id);

-- Indexes for ads table
CREATE INDEX IF NOT EXISTS idx_ads_ad_set_id ON public.ads(ad_set_id);
CREATE INDEX IF NOT EXISTS idx_ads_campaign_id ON public.ads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ads_connection_id ON public.ads(connection_id);
CREATE INDEX IF NOT EXISTS idx_ads_user_id ON public.ads(user_id);

-- =============================================
-- 2. OPTIMIZE RLS POLICIES
-- =============================================

-- minha_tabela policies (using owner_id column)
DROP POLICY IF EXISTS "Select apenas do dono" ON public.minha_tabela;
CREATE POLICY "Select apenas do dono" ON public.minha_tabela
  FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Insert amarrado ao dono" ON public.minha_tabela;
CREATE POLICY "Insert amarrado ao dono" ON public.minha_tabela
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Update apenas do dono" ON public.minha_tabela;
CREATE POLICY "Update apenas do dono" ON public.minha_tabela
  FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Delete apenas do dono" ON public.minha_tabela;
CREATE POLICY "Delete apenas do dono" ON public.minha_tabela
  FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()));

-- data_connections policies
DROP POLICY IF EXISTS "Users can manage their own data connections" ON public.data_connections;
CREATE POLICY "Users can manage their own data connections" ON public.data_connections
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- campaigns policies
DROP POLICY IF EXISTS "Users can manage their own campaigns" ON public.campaigns;
CREATE POLICY "Users can manage their own campaigns" ON public.campaigns
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ad_sets policies
DROP POLICY IF EXISTS "Users can manage their own ad sets" ON public.ad_sets;
CREATE POLICY "Users can manage their own ad sets" ON public.ad_sets
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ads policies
DROP POLICY IF EXISTS "Users can manage their own ads" ON public.ads;
CREATE POLICY "Users can manage their own ads" ON public.ads
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ad_metrics policies
DROP POLICY IF EXISTS "Users can manage their own ad metrics" ON public.ad_metrics;
CREATE POLICY "Users can manage their own ad metrics" ON public.ad_metrics
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- notifications policies
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notifications;
CREATE POLICY "Users can manage their own notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- notification_settings policies
DROP POLICY IF EXISTS "Users can manage their own notification settings" ON public.notification_settings;
CREATE POLICY "Users can manage their own notification settings" ON public.notification_settings
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- notification_rules policies
DROP POLICY IF EXISTS "Users can manage their own notification rules" ON public.notification_rules;
CREATE POLICY "Users can manage their own notification rules" ON public.notification_rules
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ai_insights policies
DROP POLICY IF EXISTS "Users can manage their own AI insights" ON public.ai_insights;
CREATE POLICY "Users can manage their own AI insights" ON public.ai_insights
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ai_analysis_history policies
DROP POLICY IF EXISTS "Users can view their own analysis history" ON public.ai_analysis_history;
CREATE POLICY "Users can view their own analysis history" ON public.ai_analysis_history
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own analysis history" ON public.ai_analysis_history;
CREATE POLICY "Users can insert their own analysis history" ON public.ai_analysis_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ai_recommendations policies
DROP POLICY IF EXISTS "Users can manage their own AI recommendations" ON public.ai_recommendations;
CREATE POLICY "Users can manage their own AI recommendations" ON public.ai_recommendations
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =============================================
-- 3. REMOVE DUPLICATE PROFILES POLICIES
-- =============================================

-- Drop old duplicate policies (keeping the newer ones)
DROP POLICY IF EXISTS "Enable insert for authenticated users on their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for authenticated users on their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for authenticated users on their own profile" ON public.profiles;

-- Recreate the remaining policies with optimized auth.uid()
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- =============================================
-- 4. DROP UNUSED INDEXES
-- =============================================

DROP INDEX IF EXISTS public.idx_data_connections_platform;
DROP INDEX IF EXISTS public.idx_campaigns_platform;
DROP INDEX IF EXISTS public.idx_notification_rules_user_id;
DROP INDEX IF EXISTS public.idx_notification_rules_enabled;
DROP INDEX IF EXISTS public.idx_ai_insights_user_id;
DROP INDEX IF EXISTS public.idx_ai_insights_campaign_id;
DROP INDEX IF EXISTS public.idx_ai_insights_type;
DROP INDEX IF EXISTS public.idx_ai_insights_status;
DROP INDEX IF EXISTS public.idx_ai_insights_created_at;
DROP INDEX IF EXISTS public.idx_ai_analysis_history_user_id;
DROP INDEX IF EXISTS public.idx_ai_analysis_history_type;
DROP INDEX IF EXISTS public.idx_ai_analysis_history_created_at;
DROP INDEX IF EXISTS public.idx_ai_recommendations_insight_id;
DROP INDEX IF EXISTS public.idx_ai_recommendations_user_id;
DROP INDEX IF EXISTS public.idx_ai_recommendations_status;
DROP INDEX IF EXISTS public.idx_minha_tabela_owner;
DROP INDEX IF EXISTS public.idx_minha_tabela_nome;
DROP INDEX IF EXISTS public.idx_notifications_read;
DROP INDEX IF EXISTS public.idx_notifications_category;
DROP INDEX IF EXISTS public.idx_notifications_priority;
DROP INDEX IF EXISTS public.idx_campaigns_user_id;
DROP INDEX IF EXISTS public.idx_ad_metrics_date;
DROP INDEX IF EXISTS public.idx_ad_metrics_campaign_id;

-- =============================================
-- 5. FIX FUNCTION SEARCH PATHS
-- =============================================

-- Recreate set_updated_at function with secure search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate cleanup_expired_notifications function with secure search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < now() - interval '30 days'
  AND read = true;
END;
$$;

-- Recreate update_updated_at_column function with secure search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate cleanup_expired_ai_insights function with secure search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_insights()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.ai_insights
  WHERE created_at < now() - interval '90 days'
  AND status = 'archived';
END;
$$;

-- Recreate calculate_insight_effectiveness function with secure search_path
CREATE OR REPLACE FUNCTION public.calculate_insight_effectiveness()
RETURNS TABLE(insight_id uuid, effectiveness_score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.id as insight_id,
    COALESCE(AVG(ar.effectiveness_score), 0) as effectiveness_score
  FROM public.ai_insights ai
  LEFT JOIN public.ai_recommendations ar ON ar.insight_id = ai.id
  WHERE ai.status = 'active'
  GROUP BY ai.id;
END;
$$;

-- Recreate create_policy_if_not_exists function with secure search_path
CREATE OR REPLACE FUNCTION public.create_policy_if_not_exists(
  table_name text,
  policy_name text,
  policy_definition text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = table_name 
    AND policyname = policy_name
  ) THEN
    EXECUTE policy_definition;
  END IF;
END;
$$;

-- Recreate handle_new_user function with secure search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Recreate create_user_profile function with secure search_path
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
