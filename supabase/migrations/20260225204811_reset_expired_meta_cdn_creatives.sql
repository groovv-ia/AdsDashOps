/*
  # Reset criativos com URLs do Meta CDN expiradas

  ## Problema
  A tabela `meta_ad_creatives` contem registros cujas URLs (image_url, thumbnail_url, image_url_hd)
  apontam para o CDN do Meta com tokens de autorizacao que expiram. O parametro `oe` (expiration epoch)
  nessas URLs e um timestamp Unix em hexadecimal. Quando o prazo vence, o navegador recebe erro
  ao carregar a imagem, resultando em thumbnails quebrados na listagem de anuncios.

  ## O que esta migration faz
  1. Para criativos que NAO tem URLs permanentes no Supabase Storage (cached_image_url e
     cached_thumbnail_url sao NULL), reseta `fetch_attempts` para 0 e `fetch_status` para 'pending'.
  2. Isso forca o sistema a rebuscar esses criativos na proxima chamada, obtendo URLs frescas da API do Meta.
  3. Criativos que ja possuem `cached_image_url` ou `cached_thumbnail_url` NAO sao afetados — essas
     URLs sao permanentes e nunca expiram.

  ## Impacto
  - Apenas criativos sem cache permanente sao resetados
  - O re-fetch ocorre automaticamente quando o usuario abre a listagem de anuncios
  - Sem perda de dados: apenas os campos de status sao alterados, nenhuma imagem e deletada
*/

UPDATE meta_ad_creatives
SET
  fetch_attempts = 0,
  fetch_status = 'pending',
  last_validated_at = NULL
WHERE
  cached_image_url IS NULL
  AND cached_thumbnail_url IS NULL
  AND fetch_status = 'success';
