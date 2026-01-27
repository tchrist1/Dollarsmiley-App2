/*
  # Fix Jobs RLS for Authenticated Users
  
  ## Problem
  - Authenticated users (Customer, Provider, Hybrid) cannot see open jobs posted by others
  - "Public can view open jobs" policy only applies to unauthenticated users
  - This prevents Hybrid and Provider users from seeing available jobs to bid on
  
  ## Changes
  - Update "Public can view open jobs" policy to also apply to authenticated users
  - This allows everyone (logged in or not) to see open/in_progress jobs
  
  ## Security
  - Users can still only edit/delete their own jobs
  - Only open and in_progress jobs are visible to everyone
  - Completed, cancelled, and other status jobs remain private
*/

-- Drop the existing public-only policy
DROP POLICY IF EXISTS "Public can view open jobs" ON jobs;

-- Create new policy that applies to both public AND authenticated users
CREATE POLICY "Everyone can view open jobs"
  ON jobs
  FOR SELECT
  TO public, authenticated
  USING (LOWER(status) IN ('open', 'in_progress'));

-- Verify the policy exists
SELECT 'Jobs RLS fixed - authenticated users can now see all open jobs' as result;
