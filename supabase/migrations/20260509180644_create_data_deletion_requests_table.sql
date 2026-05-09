/*
  # Criar tabela de solicitacoes de exclusao de dados

  1. Nova Tabela
    - `data_deletion_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable - solicitante pode nao ter conta)
      - `full_name` (text, nome do solicitante)
      - `email` (text, email do solicitante)
      - `meta_account_id` (text, ID da conta Meta)
      - `reason` (text, nullable - motivo da exclusao)
      - `status` (text, default 'pending' - pending/processing/completed/rejected)
      - `requested_at` (timestamptz, default now())
      - `completed_at` (timestamptz, nullable)
      - `processed_by` (uuid, nullable - admin que processou)

  2. Seguranca
    - RLS habilitado
    - Politica de INSERT para usuarios autenticados (proprio registro)
    - Politica de SELECT para usuarios autenticados (apenas proprios registros)
    - Acesso completo via service_role para processamento administrativo
*/

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  meta_account_id text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  processed_by uuid
);

ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados podem criar solicitacoes
CREATE POLICY "Users can create own deletion requests"
  ON data_deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuarios autenticados podem ver apenas suas proprias solicitacoes
CREATE POLICY "Users can view own deletion requests"
  ON data_deletion_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
