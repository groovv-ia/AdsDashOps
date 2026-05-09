/*
  # Criar tabelas de suporte (tickets e feedback de FAQ)

  1. Novas Tabelas
    - `support_tickets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, ID do usuario autenticado)
      - `workspace_id` (uuid, nullable - workspace ativo no momento)
      - `subject` (text, assunto do ticket)
      - `category` (text, categoria do problema)
      - `priority` (text, default 'medium' - low/medium/high/urgent)
      - `message` (text, descricao detalhada)
      - `status` (text, default 'open' - open/in_progress/resolved/closed)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    - `support_feedback`
      - `id` (uuid, primary key)
      - `user_id` (uuid, ID do usuario autenticado)
      - `article_id` (text, identificador do artigo FAQ)
      - `is_helpful` (boolean, se o artigo foi util)
      - `created_at` (timestamptz, default now())

  2. Seguranca
    - RLS habilitado em ambas as tabelas
    - Usuarios autenticados podem criar e ver apenas seus proprios registros
    - Unique constraint em support_feedback para evitar feedback duplicado

  3. Indexes
    - Index em user_id para ambas as tabelas (performance de SELECT)
    - Index em status para filtros de tickets
*/

-- Tabela de tickets de suporte
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid,
  subject text NOT NULL,
  category text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Usuarios podem criar tickets
CREATE POLICY "Users can create own tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuarios podem ver seus proprios tickets
CREATE POLICY "Users can view own tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Usuarios podem atualizar seus proprios tickets (ex: fechar)
CREATE POLICY "Users can update own tickets"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Tabela de feedback de artigos FAQ
CREATE TABLE IF NOT EXISTS support_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  article_id text NOT NULL,
  is_helpful boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_feedback ENABLE ROW LEVEL SECURITY;

-- Usuarios podem criar feedback
CREATE POLICY "Users can create feedback"
  ON support_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuarios podem ver seu proprio feedback
CREATE POLICY "Users can view own feedback"
  ON support_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Usuarios podem atualizar seu feedback (mudar de opiniao)
CREATE POLICY "Users can update own feedback"
  ON support_feedback
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Unique constraint: um usuario so pode dar feedback uma vez por artigo
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_feedback_user_article
  ON support_feedback(user_id, article_id);

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_support_feedback_user_id ON support_feedback(user_id);
