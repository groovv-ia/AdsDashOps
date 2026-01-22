/*
  # Adiciona constraint unica na tabela meta_sync_state

  1. Alteracoes
    - Adiciona constraint unica em (workspace_id, meta_ad_account_id)
    - Isso previne duplicatas futuras que causavam exibicao de data errada no card

  2. Motivo
    - Existiam registros duplicados para a mesma conta de anuncios
    - A query find() retornava o registro antigo em vez do mais recente
    - Com a constraint, apenas um registro pode existir por combinacao
*/

DO $$
BEGIN
  -- Adiciona constraint unica se nao existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'meta_sync_state_workspace_account_unique'
  ) THEN
    ALTER TABLE meta_sync_state 
    ADD CONSTRAINT meta_sync_state_workspace_account_unique 
    UNIQUE (workspace_id, meta_ad_account_id);
  END IF;
END $$;
