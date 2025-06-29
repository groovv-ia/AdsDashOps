/*
  # Fix RLS policies for profiles and avatars

  1. Security Updates
    - Update profiles table RLS policies to allow proper INSERT/UPDATE operations
    - Create storage policies for avatars bucket
    - Ensure authenticated users can manage their own data

  2. Changes
    - Drop existing restrictive policies on profiles table
    - Create comprehensive policies for profiles CRUD operations
    - Add storage policies for avatars bucket
    - Create avatars bucket if it doesn't exist
*/

-- First, ensure the avatars bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies on profiles table to recreate them properly
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create comprehensive RLS policies for profiles table
CREATE POLICY "Enable insert for authenticated users on their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable select for authenticated users on their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Enable update for authenticated users on their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable delete for authenticated users on their own profile"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Storage policies for avatars bucket
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Allow authenticated users to upload avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Allow authenticated users to update their own avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Allow authenticated users to delete their own avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public access to view avatars (since they're profile pictures)
CREATE POLICY "Allow public access to view avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Alternative policy for avatars if you want simpler file naming (just user_id.extension)
-- This allows users to upload files named with their user ID
CREATE POLICY "Allow users to upload files with their user ID"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND 
    (name ~ ('^' || auth.uid()::text || '\.(jpg|jpeg|png|gif|webp)$'))
  );

CREATE POLICY "Allow users to update files with their user ID"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND 
    (name ~ ('^' || auth.uid()::text || '\.(jpg|jpeg|png|gif|webp)$'))
  )
  WITH CHECK (
    bucket_id = 'avatars' AND 
    (name ~ ('^' || auth.uid()::text || '\.(jpg|jpeg|png|gif|webp)$'))
  );

CREATE POLICY "Allow users to delete files with their user ID"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND 
    (name ~ ('^' || auth.uid()::text || '\.(jpg|jpeg|png|gif|webp)$'))
  );