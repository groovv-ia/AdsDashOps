/*
  # Add Missing Foreign Key Indexes

  1. New Indexes
    - `idx_ad_creatives_user_id` on ad_creatives(user_id)
    - `idx_ai_recommendations_insight_id` on ai_recommendations(insight_id)
    - `idx_audience_insights_user_id` on audience_insights(user_id)
    - `idx_carousel_slide_analyses_workspace_id` on carousel_slide_analyses(workspace_id)
    - `idx_client_invitations_invited_by` on client_invitations(invited_by)
    - `idx_client_users_invitation_id` on client_users(invitation_id)
    - `idx_conversion_events_user_id` on conversion_events(user_id)
    - `idx_extraction_history_template_id` on extraction_history(template_id)
    - `idx_google_ad_groups_account_id` on google_ad_groups(account_id)
    - `idx_google_ads_account_id` on google_ads(account_id)
    - `idx_google_keywords_account_id` on google_keywords(account_id)
    - `idx_meta_insights_raw_connection_id` on meta_insights_raw(connection_id)
    - `idx_saved_data_sets_connection_id` on saved_data_sets(connection_id)
    - `idx_scheduled_extractions_connection_id` on scheduled_extractions(connection_id)
    - `idx_sync_jobs_user_id` on sync_jobs(user_id)
    - `idx_video_frame_analyses_workspace_id` on video_frame_analyses(workspace_id)

  2. Purpose
    - Improve query performance on foreign key lookups
    - Optimize JOIN operations
*/

-- Adiciona indices em foreign keys que estao faltando
-- Usa IF NOT EXISTS para evitar erros se o indice ja existir

CREATE INDEX IF NOT EXISTS idx_ad_creatives_user_id 
  ON ad_creatives(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_insight_id 
  ON ai_recommendations(insight_id);

CREATE INDEX IF NOT EXISTS idx_audience_insights_user_id 
  ON audience_insights(user_id);

CREATE INDEX IF NOT EXISTS idx_carousel_slide_analyses_workspace_id_fk 
  ON carousel_slide_analyses(workspace_id);

CREATE INDEX IF NOT EXISTS idx_client_invitations_invited_by 
  ON client_invitations(invited_by);

CREATE INDEX IF NOT EXISTS idx_client_users_invitation_id 
  ON client_users(invitation_id);

CREATE INDEX IF NOT EXISTS idx_conversion_events_user_id 
  ON conversion_events(user_id);

CREATE INDEX IF NOT EXISTS idx_extraction_history_template_id 
  ON extraction_history(template_id);

CREATE INDEX IF NOT EXISTS idx_google_ad_groups_account_id_fk 
  ON google_ad_groups(account_id);

CREATE INDEX IF NOT EXISTS idx_google_ads_account_id_fk 
  ON google_ads(account_id);

CREATE INDEX IF NOT EXISTS idx_google_keywords_account_id_fk 
  ON google_keywords(account_id);

CREATE INDEX IF NOT EXISTS idx_meta_insights_raw_connection_id 
  ON meta_insights_raw(connection_id);

CREATE INDEX IF NOT EXISTS idx_saved_data_sets_connection_id 
  ON saved_data_sets(connection_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_extractions_connection_id 
  ON scheduled_extractions(connection_id);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_id 
  ON sync_jobs(user_id);

CREATE INDEX IF NOT EXISTS idx_video_frame_analyses_workspace_id_fk 
  ON video_frame_analyses(workspace_id);
