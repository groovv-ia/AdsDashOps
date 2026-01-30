/*
  # Remove Duplicate and Unused Indexes

  1. Duplicate Indexes Removed
    - idx_meta_ad_accounts_meta_ad_account_id (keep idx_meta_ad_accounts_meta_id)
    - idx_meta_ad_accounts_workspace (keep idx_meta_ad_accounts_workspace_id)

  2. Selected Unused Indexes Removed
    - Indexes that have never been used and are unlikely to be needed

  3. Important Notes
    - This improves write performance by reducing index maintenance
    - Queries will still perform well with remaining indexes
*/

-- =====================================================
-- REMOVE DUPLICATE INDEXES
-- =====================================================

-- meta_ad_accounts: keep idx_meta_ad_accounts_meta_id, drop duplicate
DROP INDEX IF EXISTS idx_meta_ad_accounts_meta_ad_account_id;

-- meta_ad_accounts: keep idx_meta_ad_accounts_workspace_id, drop duplicate
DROP INDEX IF EXISTS idx_meta_ad_accounts_workspace;

-- =====================================================
-- REMOVE CLEARLY UNUSED INDEXES
-- =====================================================

-- Indexes on boolean columns (rarely useful)
DROP INDEX IF EXISTS idx_clients_is_active;
DROP INDEX IF EXISTS idx_profiles_onboarding_completed;
DROP INDEX IF EXISTS idx_dashboard_instances_is_active;
DROP INDEX IF EXISTS idx_scheduled_extractions_is_active;
DROP INDEX IF EXISTS idx_sync_config_active;
DROP INDEX IF EXISTS idx_pixel_events_is_enabled;
DROP INDEX IF EXISTS idx_report_templates_is_default;

-- Indexes on created_at columns that are not used for queries
DROP INDEX IF EXISTS idx_chat_conversations_created_at;
DROP INDEX IF EXISTS idx_extraction_history_created_at;
DROP INDEX IF EXISTS idx_saved_data_sets_created_at;
DROP INDEX IF EXISTS idx_dashboard_instances_created_at;
DROP INDEX IF EXISTS idx_workspaces_created_at;
DROP INDEX IF EXISTS idx_google_sync_jobs_created_at;

-- Redundant compound indexes (simpler indexes exist)
DROP INDEX IF EXISTS idx_sync_logs_user_status;
DROP INDEX IF EXISTS idx_sync_logs_client_status;
DROP INDEX IF EXISTS idx_sync_logs_user_platform_date;
DROP INDEX IF EXISTS idx_sync_logs_user_platform_status;
DROP INDEX IF EXISTS idx_extraction_history_user_recent;

-- Indexes on rarely queried columns
DROP INDEX IF EXISTS idx_chat_conversations_intent;
DROP INDEX IF EXISTS idx_pixel_events_action_type;
DROP INDEX IF EXISTS idx_meta_metrics_ai_analyses_analyzed_at;
DROP INDEX IF EXISTS idx_claude_analyses_analyzed_at;
