/*
  # Demo Jobs Cleanup - Herty & BraidyBraid

  1. Purpose
    - Remove demo jobs created by Herty and BraidyBraid users
    - Targeted cleanup to reduce noise in job board
    - All affected jobs have proper pricing (verified)

  2. Scope
    - Removes 33 jobs total:
      - Herty: 29 jobs
      - BraidyBraid: 4 jobs

  3. Safety
    - Uses explicit user ID matching
    - Only affects jobs from these two specific users
    - No real user data affected
    - No schema or logic changes

  4. Pricing Status
    - All fixed-price jobs already have correct non-zero prices
    - No pricing fixes needed (Task 2 N/A)
*/

-- ============================================================================
-- SAFETY CHECK: Verify target users before deletion
-- ============================================================================

DO $$
DECLARE
  v_herty_id UUID := '889b50d5-1ba6-4cc8-b076-14e1ddf1fac8';
  v_braidybraid_id UUID := 'd48b3ae5-1556-49c1-a9ec-608d7dcda93f';
  v_herty_name TEXT;
  v_braidybraid_name TEXT;
BEGIN
  -- Verify Herty user
  SELECT full_name INTO v_herty_name
  FROM profiles
  WHERE id = v_herty_id;

  IF v_herty_name != 'Herty' THEN
    RAISE EXCEPTION 'Safety check failed: User ID does not match Herty';
  END IF;

  -- Verify BraidyBraid user
  SELECT full_name INTO v_braidybraid_name
  FROM profiles
  WHERE id = v_braidybraid_id;

  IF v_braidybraid_name != 'BraidyBraid' THEN
    RAISE EXCEPTION 'Safety check failed: User ID does not match BraidyBraid';
  END IF;

  RAISE NOTICE 'Safety check passed: Users verified';
END $$;

-- ============================================================================
-- DELETE: Remove demo jobs from Herty
-- ============================================================================

DELETE FROM jobs
WHERE customer_id = '889b50d5-1ba6-4cc8-b076-14e1ddf1fac8'
  AND customer_id IN (
    SELECT id FROM profiles WHERE full_name = 'Herty'
  );

-- ============================================================================
-- DELETE: Remove demo jobs from BraidyBraid
-- ============================================================================

DELETE FROM jobs
WHERE customer_id = 'd48b3ae5-1556-49c1-a9ec-608d7dcda93f'
  AND customer_id IN (
    SELECT id FROM profiles WHERE full_name = 'BraidyBraid'
  );

-- ============================================================================
-- VERIFICATION: Confirm deletion
-- ============================================================================

DO $$
DECLARE
  v_remaining_herty_jobs INT;
  v_remaining_braidybraid_jobs INT;
BEGIN
  -- Check remaining jobs for Herty
  SELECT COUNT(*) INTO v_remaining_herty_jobs
  FROM jobs
  WHERE customer_id = '889b50d5-1ba6-4cc8-b076-14e1ddf1fac8';

  -- Check remaining jobs for BraidyBraid
  SELECT COUNT(*) INTO v_remaining_braidybraid_jobs
  FROM jobs
  WHERE customer_id = 'd48b3ae5-1556-49c1-a9ec-608d7dcda93f';

  RAISE NOTICE 'Deletion complete: Herty jobs remaining: %, BraidyBraid jobs remaining: %',
    v_remaining_herty_jobs, v_remaining_braidybraid_jobs;

  IF v_remaining_herty_jobs > 0 OR v_remaining_braidybraid_jobs > 0 THEN
    RAISE WARNING 'Some jobs still remain - this should be 0 for both';
  END IF;
END $$;
