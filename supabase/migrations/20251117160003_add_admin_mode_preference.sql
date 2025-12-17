/*
  # Add Admin Mode Preference
  
  Adds admin_mode column to profiles table to store admin mode toggle state
  
  1. Changes
    - Add admin_mode boolean column to profiles table
    - Default to true for existing admin users
    - Default to false for all other users
*/

-- Add admin_mode column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'admin_mode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN admin_mode boolean DEFAULT false;
    
    -- Set admin_mode to true for existing admin users
    UPDATE profiles SET admin_mode = true WHERE user_type = 'Admin';
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN profiles.admin_mode IS 'Whether admin mode is currently active (for Admin users only)';
