/*
  # Fix Remaining Security Issues

  ## Changes Made

  ### 1. Add Missing Foreign Key Indexes
  - Add indexes for ai_analysis_history table (user_id)
  - Add indexes for ai_insights table (campaign_id, user_id)
  - Add indexes for ai_recommendations table (insight_id, user_id)
  - Add indexes for campaigns table (user_id)
  - Add indexes for notification_rules table (user_id)

  ### 2. Fix Function Search Path
  - Fix calculate_insight_effectiveness function to have immutable search_path

  ## Notes
  - The "unused index" warnings for newly created indexes are expected and will resolve as queries start using them
  - Leaked password protection and MFA options must be configured in Supabase dashboard settings
*/

-- =============================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =============================================

-- Index for ai_analysis_history table
CREATE INDEX IF NOT EXISTS idx_ai_analysis_history_user_id_fk ON public.ai_analysis_history(user_id);

-- Indexes for ai_insights table
CREATE INDEX IF NOT EXISTS idx_ai_insights_campaign_id_fk ON public.ai_insights(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id_fk ON public.ai_insights(user_id);

-- Indexes for ai_recommendations table
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_insight_id_fk ON public.ai_recommendations(insight_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id_fk ON public.ai_recommendations(user_id);

-- Index for campaigns table
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id_fk ON public.campaigns(user_id);

-- Index for notification_rules table
CREATE INDEX IF NOT EXISTS idx_notification_rules_user_id_fk ON public.notification_rules(user_id);

-- =============================================
-- 2. FIX FUNCTION SEARCH PATH
-- =============================================

-- Drop and recreate calculate_insight_effectiveness with proper search_path
DROP FUNCTION IF EXISTS public.calculate_insight_effectiveness();

CREATE FUNCTION public.calculate_insight_effectiveness()
RETURNS TABLE(insight_id uuid, effectiveness_score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
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
