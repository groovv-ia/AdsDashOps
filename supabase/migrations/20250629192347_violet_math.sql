-- Add new address fields to profiles table
DO $$
BEGIN
  -- Add state column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'state'
  ) THEN
    ALTER TABLE profiles ADD COLUMN state text;
  END IF;

  -- Add cep column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'cep'
  ) THEN
    ALTER TABLE profiles ADD COLUMN cep text;
  END IF;
END $$;