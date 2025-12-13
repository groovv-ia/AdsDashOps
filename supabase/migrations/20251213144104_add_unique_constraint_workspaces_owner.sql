/*
  # Adicionar constraint UNIQUE em workspaces.owner_id

  ## Objetivo
  Prevenir criação de múltiplos workspaces para o mesmo usuário.

  ## Alterações
  1. Adiciona constraint UNIQUE em `workspaces.owner_id`
     - Garante que cada usuário tenha apenas 1 workspace
     - Previne duplicatas causadas por race conditions

  ## Segurança
  - Mantém RLS policies existentes
  - Não afeta dados existentes (já foram limpos)
*/

-- Adiciona constraint UNIQUE no owner_id
ALTER TABLE workspaces 
ADD CONSTRAINT workspaces_owner_id_unique 
UNIQUE (owner_id);
