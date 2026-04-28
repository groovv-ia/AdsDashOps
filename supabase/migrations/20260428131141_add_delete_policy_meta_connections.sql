/*
  # Adiciona policy DELETE para meta_connections

  A tabela meta_connections nao tinha policy DELETE, impedindo que o
  usuario desconectasse sua propria conexao Meta pelo cliente frontend.

  Adicionado:
  - Policy DELETE em meta_connections: owner/membro do workspace pode deletar
*/

CREATE POLICY "meta_connections_delete_workspace"
  ON meta_connections
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
