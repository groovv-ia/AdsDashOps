/*
  # Add separate columns for conversations and page likes

  1. Modified Tables
    - `meta_insights_daily`
      - `messaging_conversations_started` (integer, default 0) - Conversations started via messaging
      - `page_likes` (integer, default 0) - New page followers acquired in the period
      
  2. Purpose
    - Separate "Conversas" and "Leads" into distinct metrics (previously mixed together)
    - Store page_likes (followers) as period delta, not lifetime total
    - Allows direct querying without parsing actions_json for common metrics
    
  3. Notes
    - These values are extracted from actions_json during sync
    - page_likes tracks incremental followers per day (action_type = 'like')
    - messaging_conversations_started uses onsite_conversion.messaging_conversation_started_7d
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_insights_daily' AND column_name = 'messaging_conversations_started'
  ) THEN
    ALTER TABLE meta_insights_daily ADD COLUMN messaging_conversations_started integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_insights_daily' AND column_name = 'page_likes'
  ) THEN
    ALTER TABLE meta_insights_daily ADD COLUMN page_likes integer DEFAULT 0;
  END IF;
END $$;
