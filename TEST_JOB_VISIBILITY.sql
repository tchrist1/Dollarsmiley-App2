-- Job Visibility Verification Test
-- Run this to verify Providers can see job posts
-- Expected: All queries should return results with no user_type restrictions

-- ============================================
-- TEST 1: Verify Open Jobs Exist
-- ============================================
SELECT
  id,
  title,
  status,
  pricing_type,
  created_at
FROM jobs
WHERE status = 'Open'
LIMIT 10;

-- Expected: Should return open jobs
-- ✅ PASS if results returned
-- ❌ FAIL if no results (no demo data)

-- ============================================
-- TEST 2: Verify Jobs Have Customer Profiles
-- ============================================
SELECT
  j.id AS job_id,
  j.title AS job_title,
  p.id AS customer_id,
  p.full_name AS customer_name,
  p.user_type AS customer_type
FROM jobs j
JOIN profiles p ON j.customer_id = p.id
WHERE j.status = 'Open'
LIMIT 10;

-- Expected: Jobs linked to customer profiles
-- ✅ PASS if results with customer data
-- ❌ FAIL if no customer profiles

-- ============================================
-- TEST 3: Verify No User Type Restrictions
-- ============================================
-- This simulates what the app queries look like
SELECT
  j.*,
  p.full_name AS customer_full_name,
  p.rating_average AS customer_rating,
  p.user_type AS customer_user_type,
  c.name AS category_name
FROM jobs j
LEFT JOIN profiles p ON j.customer_id = p.id
LEFT JOIN categories c ON j.category_id = c.id
WHERE j.status = 'Open'
-- NO WHERE clause filtering by user_type ✅
ORDER BY j.created_at DESC
LIMIT 20;

-- Expected: All open jobs visible regardless of viewer's user_type
-- ✅ PASS if 20 or more jobs returned
-- ⚠️ WARNING if < 20 jobs (may need more demo data)

-- ============================================
-- TEST 4: Verify Job Coordinates for Map
-- ============================================
SELECT
  id,
  title,
  latitude,
  longitude,
  location,
  status
FROM jobs
WHERE status = 'Open'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
LIMIT 10;

-- Expected: Jobs with valid coordinates for map display
-- ✅ PASS if jobs have lat/long
-- ⚠️ WARNING if no coordinates (map pins won't show)

-- ============================================
-- TEST 5: Verify Fixed Price Jobs
-- ============================================
SELECT
  id,
  title,
  pricing_type,
  fixed_price,
  budget_min,
  budget_max,
  status
FROM jobs
WHERE status = 'Open'
  AND pricing_type = 'fixed_price'
LIMIT 10;

-- Expected: Fixed-price jobs visible
-- ✅ PASS if results returned

-- ============================================
-- TEST 6: Verify Quote-Based Jobs
-- ============================================
SELECT
  id,
  title,
  pricing_type,
  budget_min,
  budget_max,
  status
FROM jobs
WHERE status = 'Open'
  AND pricing_type = 'quote_based'
LIMIT 10;

-- Expected: Quote-based jobs visible
-- ✅ PASS if results returned

-- ============================================
-- TEST 7: Provider Can Access Job Details
-- ============================================
-- Simulate Provider viewing a specific job
SELECT
  j.*,
  p.id AS customer_id,
  p.full_name AS customer_full_name,
  p.user_type AS customer_user_type,
  p.rating_average,
  p.rating_count,
  p.total_bookings,
  c.name AS category_name,
  c.icon AS category_icon
FROM jobs j
LEFT JOIN profiles p ON j.customer_id = p.id
LEFT JOIN categories c ON j.category_id = c.id
WHERE j.status = 'Open'
LIMIT 1;

-- Expected: Full job details accessible
-- ✅ PASS if complete data returned
-- This is what the /jobs/[id].tsx screen queries

-- ============================================
-- TEST 8: Check My Jobs for Provider
-- ============================================
-- Simulate Provider viewing their jobs (booked/accepted)
-- Replace 'YOUR_PROVIDER_ID' with actual provider UUID

-- First, get jobs provider has bookings for
WITH provider_job_ids AS (
  SELECT DISTINCT job_id
  FROM bookings
  WHERE provider_id = 'YOUR_PROVIDER_ID' -- Replace with test provider ID
)
SELECT
  j.id,
  j.title,
  j.status,
  j.pricing_type,
  b.status AS booking_status,
  b.provider_id
FROM jobs j
JOIN bookings b ON j.id = b.job_id
WHERE j.id IN (SELECT job_id FROM provider_job_ids);

-- Expected: Provider sees jobs they're working on
-- ✅ PASS if results returned (if provider has bookings)

-- ============================================
-- TEST 9: Verify RLS Policies Allow Read Access
-- ============================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'jobs'
  AND cmd = 'SELECT';

-- Expected: RLS policies should allow SELECT for authenticated users
-- ✅ PASS if policies exist and allow read access
-- ❌ FAIL if overly restrictive policies blocking Providers

-- ============================================
-- TEST 10: Count Jobs by Status
-- ============================================
SELECT
  status,
  COUNT(*) AS job_count
FROM jobs
GROUP BY status
ORDER BY job_count DESC;

-- Expected: Distribution of jobs across statuses
-- ✅ PASS if 'Open' status has jobs
-- ⚠️ WARNING if all jobs are 'Completed' or 'Expired'

-- ============================================
-- SUMMARY CHECKS
-- ============================================

-- Total Open Jobs
SELECT COUNT(*) AS total_open_jobs FROM jobs WHERE status = 'Open';

-- Open Jobs with Complete Data (ready for display)
SELECT COUNT(*) AS complete_jobs
FROM jobs j
JOIN profiles p ON j.customer_id = p.id
JOIN categories c ON j.category_id = c.id
WHERE j.status = 'Open'
  AND j.latitude IS NOT NULL
  AND j.longitude IS NOT NULL
  AND j.title IS NOT NULL
  AND j.description IS NOT NULL;

-- Expected Results:
-- total_open_jobs: > 0 (ideally 20+)
-- complete_jobs: > 0 (at least 80% of open jobs)

-- ============================================
-- DIAGNOSIS GUIDE
-- ============================================

/*
IF TEST 1 FAILS (No Open Jobs):
  → Issue: No demo data or all jobs expired
  → Solution: Run demo data generation script

IF TEST 2 FAILS (No Customer Profiles):
  → Issue: Orphaned jobs with missing customer references
  → Solution: Fix foreign key integrity

IF TEST 3 RETURNS EMPTY:
  → Issue: RLS policies too restrictive
  → Solution: Check and update RLS policies

IF TEST 4 FAILS (No Coordinates):
  → Issue: Jobs won't show on map
  → Solution: Update jobs with valid lat/long

IF TEST 9 SHOWS RESTRICTIVE POLICIES:
  → Issue: Database-level access control blocking reads
  → Solution: Update RLS policies to allow public read

IF ALL TESTS PASS:
  → Verdict: Job visibility is working correctly
  → Action: Check frontend UI, filters, or network connectivity
*/
