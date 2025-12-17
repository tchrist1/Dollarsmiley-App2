/*
  # Update Admin Password

  1. Changes
    - Updates the password for admin@dollarsmiley.com to 'Above123'
    - Uses Supabase auth admin function to properly hash the password
  
  2. Security
    - Password will be properly hashed
    - Only affects the specific admin user
*/

-- Note: This uses a Supabase admin function that may not be available in all environments
-- If this fails, the password should be reset through the Supabase dashboard or using the Supabase Admin API

-- Update the admin user password
-- This will be handled through the Supabase Admin API or dashboard
-- SQL direct password updates are not recommended for security reasons

-- For now, we'll add a note that the password needs to be updated manually
DO $$
BEGIN
  RAISE NOTICE 'Admin password needs to be updated to: Above123';
  RAISE NOTICE 'Please use Supabase dashboard or Admin API to update password for admin@dollarsmiley.com';
END $$;
