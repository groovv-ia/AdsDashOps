/*
  # Adicionar campos de endereço completo

  1. Novos Campos
    - `number` (text) - Número do endereço
    - `complement` (text) - Complemento (apto, sala, etc.)
    - `neighborhood` (text) - Bairro

  2. Modificações
    - Campos adicionados à tabela `profiles` para endereço completo
    - Campos opcionais para flexibilidade
*/

DO $$
BEGIN
  -- Add number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN number text;
  END IF;

  -- Add complement column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'complement'
  ) THEN
    ALTER TABLE profiles ADD COLUMN complement text;
  END IF;

  -- Add neighborhood column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'neighborhood'
  ) THEN
    ALTER TABLE profiles ADD COLUMN neighborhood text;
  END IF;
END $$;