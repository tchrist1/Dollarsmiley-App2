/*
  # Update User Type from "Both" to "Hybrid"

  1. Changes
    - Update CHECK constraint on profiles table to replace 'Both' with 'Hybrid'
    - Update all existing user records with user_type = 'Both' to 'Hybrid'
    - Update any functions or views that reference 'Both' user type

  2. Security
    - Maintains existing RLS policies
    - No changes to access control

  3. Data Migration
    - Safely updates all existing "Both" users to "Hybrid"
    - Preserves all other user data

  4. Notes
    - This is a non-breaking change as it's just a terminology update
    - All role-based logic will continue to work with new naming
    - Frontend code updated to use "Hybrid" terminology
*/

-- Step 1: Update existing user records from 'Both' to 'Hybrid'
UPDATE profiles
SET user_type = 'Hybrid'
WHERE user_type = 'Both';

-- Step 2: Drop the existing CHECK constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;

-- Step 3: Add new CHECK constraint with 'Hybrid' instead of 'Both'
ALTER TABLE profiles
ADD CONSTRAINT profiles_user_type_check
CHECK (user_type IN ('Customer', 'Provider', 'Hybrid', 'Admin'));

-- Step 4: Update any saved_jobs records that might reference user type
-- (saved_jobs doesn't have user_type, but check just in case)
-- No updates needed for saved_jobs

-- Step 5: Update any scheduled reports or team accounts if they reference user type
-- Check team_members for any role-based conditions
-- No updates needed as team_members use different role structure

-- Step 6: Create index on user_type for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);

-- Step 7: Update the handle_new_user function to use 'Hybrid' terminology in comments
-- The function doesn't need code changes as it defaults to 'Customer'
-- But we'll add a comment for clarity

COMMENT ON COLUMN profiles.user_type IS 'User account type: Customer (books services), Provider (offers services), Hybrid (both customer and provider), Admin (platform administrator)';

-- Step 8: Verify the migration
DO $$
DECLARE
  both_count INTEGER;
  hybrid_count INTEGER;
BEGIN
  -- Check if any 'Both' records still exist
  SELECT COUNT(*) INTO both_count
  FROM profiles
  WHERE user_type = 'Both';

  -- Check how many 'Hybrid' records we have
  SELECT COUNT(*) INTO hybrid_count
  FROM profiles
  WHERE user_type = 'Hybrid';

  -- Log the results
  RAISE NOTICE 'Migration complete: % Both users migrated to Hybrid. Total Hybrid users: %',
    CASE WHEN both_count = 0 THEN 'All' ELSE both_count::text END,
    hybrid_count;

  -- Raise error if migration didn't complete
  IF both_count > 0 THEN
    RAISE EXCEPTION 'Migration incomplete: % users still have user_type = Both', both_count;
  END IF;
END $$;

-- Step 9: Update any functions that might have 'Both' in their logic
-- Check if there are any stored procedures or functions that need updating

-- Update get_user_capabilities function if it exists
CREATE OR REPLACE FUNCTION get_user_capabilities(p_user_id uuid)
RETURNS TABLE (
  can_book_services boolean,
  can_provide_services boolean,
  can_post_jobs boolean,
  can_bid_on_jobs boolean,
  is_admin boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN p.user_type IN ('Customer', 'Hybrid', 'Admin') THEN true
      ELSE false
    END AS can_book_services,
    CASE
      WHEN p.user_type IN ('Provider', 'Hybrid', 'Admin') THEN true
      ELSE false
    END AS can_provide_services,
    CASE
      WHEN p.user_type IN ('Customer', 'Hybrid', 'Admin') THEN true
      ELSE false
    END AS can_post_jobs,
    CASE
      WHEN p.user_type IN ('Provider', 'Hybrid', 'Admin') THEN true
      ELSE false
    END AS can_bid_on_jobs,
    CASE
      WHEN p.user_type = 'Admin' THEN true
      ELSE false
    END AS is_admin
  FROM profiles p
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create a helper function to check if user has provider capabilities
CREATE OR REPLACE FUNCTION is_provider_or_hybrid(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = p_user_id
    AND user_type IN ('Provider', 'Hybrid', 'Admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Create a helper function to check if user has customer capabilities
CREATE OR REPLACE FUNCTION is_customer_or_hybrid(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = p_user_id
    AND user_type IN ('Customer', 'Hybrid', 'Admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION get_user_capabilities(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_provider_or_hybrid(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_customer_or_hybrid(uuid) TO authenticated;

-- Step 13: Add helpful comments
COMMENT ON FUNCTION get_user_capabilities(uuid) IS 'Returns a users capabilities based on their user_type (Customer, Provider, Hybrid, or Admin)';
COMMENT ON FUNCTION is_provider_or_hybrid(uuid) IS 'Checks if user has provider capabilities (Provider, Hybrid, or Admin)';
COMMENT ON FUNCTION is_customer_or_hybrid(uuid) IS 'Checks if user has customer capabilities (Customer, Hybrid, or Admin)';

-- Step 14: Create a view for easy querying of user types
CREATE OR REPLACE VIEW user_type_summary AS
SELECT
  user_type,
  COUNT(*) as user_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM profiles
WHERE user_type IS NOT NULL
GROUP BY user_type
ORDER BY user_count DESC;

COMMENT ON VIEW user_type_summary IS 'Summary of user types in the system with counts and percentages';

-- Final verification
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== User Type Migration Summary ===';

  FOR rec IN
    SELECT user_type, COUNT(*) as count
    FROM profiles
    GROUP BY user_type
    ORDER BY count DESC
  LOOP
    RAISE NOTICE 'User Type: % - Count: %', rec.user_type, rec.count;
  END LOOP;

  RAISE NOTICE '=== Migration Complete ===';
END $$;
