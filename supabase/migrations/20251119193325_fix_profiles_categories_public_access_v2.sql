/*
  # Fix Profiles and Categories Public Access

  1. Changes
    - Add RLS policies to allow public (anon) users to view profiles and categories
    - This enables the discover page to show listing details with provider info

  2. Security
    - Only allows SELECT on profiles and categories
    - Public users cannot modify data
*/

-- Allow public users to view profiles (needed for listing cards)
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

CREATE POLICY "Public can view all profiles"
  ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow public users to view categories
DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;

CREATE POLICY "Public can view categories"
  ON categories
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
