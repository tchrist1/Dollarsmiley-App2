/*
  # Update User Type from "Both" to "Hybrid"

  1. Changes
    - Drop existing CHECK constraint
    - Update all existing user records with user_type = 'Both' to 'Hybrid'
    - Add new CHECK constraint with 'Hybrid' instead of 'Both'

  2. Security
    - Maintains existing RLS policies
*/

-- Step 1: Drop the existing CHECK constraint first
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;

-- Step 2: Now update existing user records from 'Both' to 'Hybrid'
UPDATE profiles
SET user_type = 'Hybrid'
WHERE user_type = 'Both';

-- Step 3: Add new CHECK constraint with 'Hybrid' instead of 'Both'
ALTER TABLE profiles
ADD CONSTRAINT profiles_user_type_check
CHECK (user_type IN ('Customer', 'Provider', 'Hybrid', 'Admin'));

-- Step 4: Create index on user_type for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);

-- Step 5: Add helpful comment
COMMENT ON COLUMN profiles.user_type IS 'User account type: Customer (books services), Provider (offers services), Hybrid (both customer and provider), Admin (platform administrator)';

-- Step 6: Create helper functions for checking user capabilities
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
    CASE WHEN p.user_type IN ('Customer', 'Hybrid', 'Admin') THEN true ELSE false END AS can_book_services,
    CASE WHEN p.user_type IN ('Provider', 'Hybrid', 'Admin') THEN true ELSE false END AS can_provide_services,
    CASE WHEN p.user_type IN ('Customer', 'Hybrid', 'Admin') THEN true ELSE false END AS can_post_jobs,
    CASE WHEN p.user_type IN ('Provider', 'Hybrid', 'Admin') THEN true ELSE false END AS can_bid_on_jobs,
    CASE WHEN p.user_type = 'Admin' THEN true ELSE false END AS is_admin
  FROM profiles p
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_provider_or_hybrid(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND user_type IN ('Provider', 'Hybrid', 'Admin'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_customer_or_hybrid(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND user_type IN ('Customer', 'Hybrid', 'Admin'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_capabilities(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_provider_or_hybrid(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_customer_or_hybrid(uuid) TO authenticated;
