/*
  # Create Chat Conversations Table

  1. New Tables
    - `chat_conversations`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `user_id` (uuid, foreign key to auth.users)
      - `message` (text) - Mensagem do usuário
      - `response` (text) - Resposta do bot
      - `intent` (text) - Intenção detectada (ex: "conectar_meta", "ver_metricas")
      - `context` (jsonb) - Contexto adicional da conversa
      - `sentiment` (text) - Sentimento detectado (positivo, neutro, negativo)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `chat_conversations` table
    - Users can only view and insert their own conversations
    - System can read all for analytics (admin only)

  3. Indexes
    - Index on workspace_id for fast filtering
    - Index on user_id for user history
    - Index on created_at for chronological ordering
*/

-- Create chat_conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  response text NOT NULL,
  intent text DEFAULT 'general',
  context jsonb DEFAULT '{}'::jsonb,
  sentiment text DEFAULT 'neutral',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own conversations
CREATE POLICY "Users can view own chat conversations"
  ON chat_conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own conversations
CREATE POLICY "Users can insert own chat conversations"
  ON chat_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_workspace_id 
  ON chat_conversations(workspace_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id 
  ON chat_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_at 
  ON chat_conversations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_intent 
  ON chat_conversations(intent);

-- Comment on table
COMMENT ON TABLE chat_conversations IS 'Stores chat conversation history between users and the AI assistant';
