/*
  # Fix INV-B5-002: Enforce Job Posting Role Restrictions

  1. Issue
    - Provider-only users can bypass UI and post jobs via API
    - RLS policy only checks customer_id = auth.uid(), not user_type
    - Business rule: Only Customer and Hybrid users can post jobs

  2. Solution
    - Add RLS policy WITH CHECK that validates user_type
    - Verify user is Customer or Hybrid before allowing INSERT

  3. Security
    - Backend enforcement prevents API bypass
    - Complements existing UI gating
    - Maintains data integrity
*/

-- Drop existing permissive policy that allows any authenticated user
DROP POLICY IF EXISTS "Customers can manage own jobs" ON jobs;

-- Create restrictive INSERT policy with user_type validation
CREATE POLICY "Only customers and hybrids can create jobs"
ON jobs
FOR INSERT
TO authenticated
WITH CHECK (
  customer_id = auth.uid() AND
  (SELECT user_type FROM profiles WHERE id = auth.uid()) IN ('Customer', 'Hybrid')
);

-- Create SELECT policy (any authenticated user can view their own jobs)
CREATE POLICY "Users can view own jobs"
ON jobs
FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

-- Create UPDATE policy (restricted - see next migration for immutability)
CREATE POLICY "Users can update own jobs"
ON jobs
FOR UPDATE
TO authenticated
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());

-- Create DELETE policy
CREATE POLICY "Users can delete own jobs"
ON jobs
FOR DELETE
TO authenticated
USING (customer_id = auth.uid());

-- Add helpful comment
COMMENT ON POLICY "Only customers and hybrids can create jobs" ON jobs IS 
'Enforces INV-B5-002: Prevents Provider-only users from creating jobs. Backend enforcement prevents API bypass.';
