/*
  # Remover Constraint UNIQUE de workspaces.owner_id

  ## Objetivo
  Permitir que usuarios criem multiplos workspaces.

  ## Problema Anterior
  A constraint `workspaces_owner_id_unique` impedia usuarios de criar
  mais de um workspace, gerando o erro:
  "duplicate key value violates unique constraint 'workspaces_owner_id_unique'"

  ## Alteracoes
  1. Remove a constraint UNIQUE em `workspaces.owner_id`
     - Permite multiplos workspaces por usuario
     - Mantem o indice de performance existente (idx_workspaces_owner_id)

  ## Seguranca
  - Mantem todas as RLS policies existentes
  - Cada usuario continua tendo acesso apenas aos seus proprios workspaces
  - Nao afeta a integridade dos dados existentes

  ## Nota
  O indice idx_workspaces_owner_id (criado em migration anterior) continua
  existindo para otimizar queries por owner_id, mas NAO impede valores duplicados.
*/

-- Remove a constraint UNIQUE que impede multiplos workspaces por usuario
ALTER TABLE workspaces 
DROP CONSTRAINT IF EXISTS workspaces_owner_id_unique;
