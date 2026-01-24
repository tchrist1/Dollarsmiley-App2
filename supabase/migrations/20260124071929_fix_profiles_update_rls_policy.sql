/*
  # Fix Profiles Update RLS Policy
  
  1. Changes
    - Drop and recreate the update policy for profiles table
    - Use proper auth.uid() function syntax without subquery wrapper
    
  2. Security
    - Ensures authenticated users can only update their own profile records
*/

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate with proper syntax
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
