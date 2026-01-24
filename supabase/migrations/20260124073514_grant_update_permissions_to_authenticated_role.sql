/*
  # Grant UPDATE permissions to authenticated role on profiles
  
  1. Changes
    - Grant INSERT and UPDATE permissions to authenticated role
    - This allows authenticated users to update their own profiles (controlled by RLS)
    
  2. Security
    - RLS policies still control which records users can actually modify
    - Users can only update records where auth.uid() = id
*/

-- Grant INSERT permission (for profile creation)
GRANT INSERT ON profiles TO authenticated;

-- Grant UPDATE permission (for profile updates)
GRANT UPDATE ON profiles TO authenticated;

-- Also grant to anon for consistency (RLS will still protect the data)
GRANT INSERT ON profiles TO anon;
GRANT UPDATE ON profiles TO anon;
