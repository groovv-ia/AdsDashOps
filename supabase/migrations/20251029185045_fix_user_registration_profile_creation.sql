/*
  # Fix User Registration Profile Creation Issue
  
  ## Problem Identified
  The database has conflicting trigger functions that both attempt to create user profiles:
  1. `handle_new_user()` function (WITHOUT proper ON CONFLICT handling)
  2. `create_user_profile()` function (WITH ON CONFLICT)
  
  Both are triggered when a new user signs up, causing conflicts and errors.
  
  ## Solution
  1. Keep only one robust trigger function with proper error handling
  2. Ensure ON CONFLICT clause prevents duplicate key errors  
  3. Add comprehensive exception handling
  4. The trigger itself on auth.users will remain (we can't modify it directly)
  
  ## Security
  - Function uses SECURITY DEFINER to bypass RLS during profile creation
  - Proper search_path set to prevent SQL injection
  - Exception handling ensures graceful degradation
  
  ## Changes Made
  1. Dropped conflicting `create_user_profile()` function
  2. Recreated `handle_new_user()` function with robust error handling
  3. Ensured proper permissions for auth operations
*/

-- =============================================
-- STEP 1: Drop conflicting function
-- =============================================

-- Drop the conflicting create_user_profile function
-- Note: We can't drop the trigger on auth.users directly, but dropping the function
-- that doesn't exist as a trigger will clean things up
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;

-- =============================================
-- STEP 2: Recreate handle_new_user with robust error handling
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
BEGIN
  -- Use exception handling to ensure user creation succeeds even if profile creation fails
  BEGIN
    -- Insert profile with ON CONFLICT to handle any race conditions or duplicate attempts
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      updated_at = NOW();
    
    -- Log success for debugging
    RAISE LOG 'Profile created successfully for user %', NEW.id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error for debugging but don't fail the user creation
    -- This ensures that even if profile creation fails, the user account is still created
    RAISE WARNING 'Profile creation failed for user % (email: %): % - %', 
      NEW.id, NEW.email, SQLERRM, SQLSTATE;
  END;
  
  RETURN NEW;
END;
$$;

-- Add comment to document the function
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically creates a user profile when a new user signs up. Uses SECURITY DEFINER to bypass RLS. Includes ON CONFLICT and error handling to ensure user creation succeeds even if profile creation encounters issues.';

-- =============================================
-- STEP 3: Grant necessary permissions
-- =============================================

-- Grant execute permission to auth admin
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Grant execute permission to authenticated users (for manual profile creation if needed)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- Ensure supabase_auth_admin has full access to profiles table
GRANT ALL ON public.profiles TO supabase_auth_admin;

-- Ensure authenticated users can manage their profiles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- =============================================
-- STEP 4: Verify profiles table structure
-- =============================================

-- Ensure all required columns have proper defaults
DO $$
BEGIN
  -- Check and add default values if columns exist without them
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'created_at'
    AND column_default IS NULL
  ) THEN
    ALTER TABLE public.profiles 
    ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'updated_at'
    AND column_default IS NULL
  ) THEN
    ALTER TABLE public.profiles 
    ALTER COLUMN updated_at SET DEFAULT NOW();
  END IF;
END $$;
