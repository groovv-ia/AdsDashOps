/*
  # Adicionar Suporte a Logo de Workspace

  ## Descricao
  Adiciona campo para armazenar URL do logotipo do workspace
  e configura storage bucket para upload de imagens.

  ## Mudancas
  1. Nova coluna `logo_url` na tabela workspaces
  2. Criacao do storage bucket `workspace-logos`
  3. Politicas de acesso ao bucket
*/

-- Adicionar coluna logo_url na tabela workspaces
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspaces' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE workspaces ADD COLUMN logo_url text;
  END IF;
END $$;

-- Criar bucket para logos de workspaces (se nao existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-logos',
  'workspace-logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Politica para permitir leitura publica dos logos
CREATE POLICY "Public read access for workspace logos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'workspace-logos');

-- Politica para upload - apenas membros do workspace podem fazer upload
CREATE POLICY "Workspace members can upload logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'workspace-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT w.id::text FROM workspaces w
      WHERE w.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = w.id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
      )
    )
  );

-- Politica para update de logos
CREATE POLICY "Workspace admins can update logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'workspace-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT w.id::text FROM workspaces w
      WHERE w.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = w.id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
      )
    )
  );

-- Politica para delete de logos
CREATE POLICY "Workspace admins can delete logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'workspace-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT w.id::text FROM workspaces w
      WHERE w.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = w.id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
      )
    )
  );
