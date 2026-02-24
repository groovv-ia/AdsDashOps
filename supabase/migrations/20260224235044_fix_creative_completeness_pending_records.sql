/*
  # Correcao de completude dos criativos pendentes

  ## Problema
  Todos os criativos estavam marcados como fetch_status='pending' e is_complete=false
  mesmo possuindo image_url e thumbnail_url preenchidos, impedindo a exibicao
  na interface.

  ## Correcoes aplicadas
  1. Criativos com image_url OU thumbnail_url sao considerados completos
  2. Registros que nunca foram buscados (fetch_attempts=0) mas ja tem URL sao
     marcados como success (eles foram populados pela sincronizacao inicial)
  3. Registros com URL mas sem fetch_attempts ainda sao marcados como partial
     para permitir enriquecimento futuro com textos

  ## Tabelas alteradas
  - meta_ad_creatives: atualiza is_complete e fetch_status dos registros pendentes
*/

-- Marca como complete=true + status='success' registros que tem imagem mas nunca
-- foram explicitamente buscados pela Edge Function (vieram da sync inicial)
UPDATE meta_ad_creatives
SET
  is_complete = true,
  fetch_status = 'success',
  last_validated_at = now(),
  updated_at = now()
WHERE
  fetch_status = 'pending'
  AND fetch_attempts = 0
  AND (image_url IS NOT NULL OR thumbnail_url IS NOT NULL);

-- Marca como complete=true + status='partial' registros que foram buscados
-- (fetch_attempts > 0) mas ainda estao pending com imagem disponivel
UPDATE meta_ad_creatives
SET
  is_complete = true,
  fetch_status = 'partial',
  updated_at = now()
WHERE
  fetch_status = 'pending'
  AND fetch_attempts > 0
  AND (image_url IS NOT NULL OR thumbnail_url IS NOT NULL);
