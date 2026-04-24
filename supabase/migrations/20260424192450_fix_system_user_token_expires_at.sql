/*
  # Fix System User Token Expiration Dates

  ## Problem
  - System User tokens are permanent (they never expire by time)
  - The system was incorrectly setting token_expires_at to 60 days from creation
  - This caused false "token expired" alerts and broken renewal attempts

  ## Changes
  1. Updates all connected meta_connections to have token_expires_at = NOW() + 10 years
  2. This reflects the permanent nature of System User tokens
  3. Tokens with status 'token_expired' are NOT updated (they were genuinely revoked)

  ## Notes
  - System User tokens only become invalid if manually revoked in Business Settings
  - The 10-year value serves as a "no expiration" marker
*/

-- Atualiza todas as conexoes com status 'connected' para ter expiracao em 10 anos
-- Isso corrige o valor incorreto de 60 dias que era atribuido anteriormente
UPDATE meta_connections
SET
  token_expires_at = NOW() + INTERVAL '10 years',
  updated_at = NOW()
WHERE status = 'connected'
  AND (token_expires_at IS NULL OR token_expires_at < NOW() + INTERVAL '1 year');
