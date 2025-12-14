/*
  # Adicionar tipo 'dynamic' aos criativos do Meta

  1. Modificações
    - Altera constraint CHECK da coluna creative_type em meta_ad_creatives
    - Adiciona 'dynamic' como tipo válido de criativo
    - Mantém tipos existentes: image, video, carousel, unknown
  
  2. Justificativa
    - A API do Meta retorna criativos do tipo 'dynamic' para anúncios com otimização dinâmica
    - Isso estava causando falha ao salvar criativos no banco de dados
    - Com esta correção, todos os tipos de criativos serão salvos corretamente

  3. Impacto
    - Permite inserção de criativos dynamic sem erro
    - Não afeta dados existentes
    - Compatível com versões anteriores
*/

-- Remove a constraint antiga
ALTER TABLE meta_ad_creatives 
  DROP CONSTRAINT IF EXISTS meta_ad_creatives_creative_type_check;

-- Adiciona nova constraint incluindo 'dynamic'
ALTER TABLE meta_ad_creatives 
  ADD CONSTRAINT meta_ad_creatives_creative_type_check 
  CHECK (creative_type IN ('image', 'video', 'carousel', 'dynamic', 'unknown'));
