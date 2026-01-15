/*
  # Fix Security Definer Views - Remove Privileged View Access
  
  ## Overview
  This migration addresses Security Advisor ERROR findings for "Security Definer View" by 
  recreating 6 views with SECURITY INVOKER semantics to ensure RLS is properly honored.
  
  ## Affected Views
  1. job_extension_summary - Job time extension aggregation
  2. public_profiles - Public profile information
  3. provider_listing_proofing_summary - Custom service proofing metrics
  4. active_service_agreements - Active service agreement templates
  5. customer_reliability_metrics - Customer reliability scoring
  6. incident_statistics - Job incident aggregation
  
  ## Changes Made
  - Drop existing views (owned by postgres superuser)
  - Recreate with explicit SECURITY INVOKER to honor RLS
  - Revoke excessive permissions (INSERT, UPDATE, DELETE, TRUNCATE, etc.)
  - Grant only necessary SELECT permissions to anon/authenticated
  - Maintain identical column structure and business logic
  
  ## Security Impact
  - Views will now honor RLS policies on underlying tables
  - Users can only see data they're authorized to access via RLS
  - No breaking changes to application queries
*/

-- ============================================================================
-- 1. DROP EXISTING VIEWS
-- ============================================================================

DROP VIEW IF EXISTS public.job_extension_summary;
DROP VIEW IF EXISTS public.public_profiles;
DROP VIEW IF EXISTS public.provider_listing_proofing_summary;
DROP VIEW IF EXISTS public.active_service_agreements;
DROP VIEW IF EXISTS public.customer_reliability_metrics;
DROP VIEW IF EXISTS public.incident_statistics;

-- ============================================================================
-- 2. RECREATE VIEWS WITH SECURITY INVOKER
-- ============================================================================

-- View: job_extension_summary
-- Purpose: Aggregates job time extension requests and approved extensions
CREATE VIEW public.job_extension_summary
WITH (security_invoker = true)
AS
SELECT 
  j.id AS job_id,
  j.title AS job_title,
  j.estimated_duration_hours AS original_estimated_hours,
  COALESCE(
    SUM(CASE WHEN ter.status = 'approved' THEN ter.approved_additional_hours ELSE 0 END),
    0
  ) AS total_approved_extensions,
  j.estimated_duration_hours + COALESCE(
    SUM(CASE WHEN ter.status = 'approved' THEN ter.approved_additional_hours ELSE 0 END),
    0
  ) AS effective_duration,
  COUNT(CASE WHEN ter.status = 'pending' THEN 1 END) AS pending_requests,
  COUNT(CASE WHEN ter.status = 'approved' THEN 1 END) AS approved_requests,
  COUNT(CASE WHEN ter.status = 'declined' THEN 1 END) AS declined_requests
FROM jobs j
LEFT JOIN job_time_extension_requests ter ON j.id = ter.job_id
GROUP BY j.id, j.title, j.estimated_duration_hours;

-- View: public_profiles
-- Purpose: Public-facing profile information (respects RLS on profiles table)
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_type,
  email,
  full_name,
  phone,
  phone_verified,
  avatar_url,
  bio,
  location,
  latitude,
  longitude,
  service_radius,
  subscription_plan,
  subscription_expires_at,
  id_verified,
  business_verified,
  payout_connected,
  rating_average,
  rating_count,
  total_bookings,
  created_at,
  updated_at,
  street_address,
  city,
  state,
  zip_code,
  country,
  service_radius_miles
FROM profiles;

-- View: provider_listing_proofing_summary
-- Purpose: Summary of proofing requirements and compliance for custom service listings
CREATE VIEW public.provider_listing_proofing_summary
WITH (security_invoker = true)
AS
SELECT 
  sl.id AS listing_id,
  sl.provider_id,
  sl.title,
  sl.listing_type,
  COALESCE(sl.proofing_required, true) AS proofing_required,
  sl.proofing_updated_at,
  sl.proofing_updated_by,
  COUNT(DISTINCT po.id) AS total_orders,
  COUNT(DISTINCT po.id) FILTER (WHERE po.proofing_bypassed = true) AS orders_without_proofing,
  COUNT(DISTINCT p.id) AS total_proofs_submitted
FROM service_listings sl
LEFT JOIN bookings b ON b.listing_id = sl.id
LEFT JOIN production_orders po ON po.booking_id = b.id
LEFT JOIN proofs p ON p.production_order_id = po.id
WHERE sl.listing_type = 'CustomService'
GROUP BY sl.id, sl.provider_id, sl.title, sl.listing_type, sl.proofing_required, sl.proofing_updated_at, sl.proofing_updated_by;

-- View: active_service_agreements
-- Purpose: Lists active service agreement templates
CREATE VIEW public.active_service_agreements
WITH (security_invoker = true)
AS
SELECT 
  id,
  agreement_type,
  agreement_title,
  agreement_text,
  version,
  effective_date
FROM service_agreement_templates
ORDER BY agreement_type;

-- View: customer_reliability_metrics
-- Purpose: Calculates customer reliability scores based on job history and incidents
CREATE VIEW public.customer_reliability_metrics
WITH (security_invoker = true)
AS
SELECT 
  p.id AS customer_id,
  p.full_name AS customer_name,
  COUNT(j.id) AS total_jobs,
  COUNT(CASE WHEN jci.incident_type = 'no_show' THEN 1 END) AS no_show_count,
  COUNT(CASE WHEN jci.incident_type = 'delay' AND jci.delay_duration_minutes > 15 THEN 1 END) AS significant_delay_count,
  ROUND(
    CASE 
      WHEN COUNT(j.id) > 0 THEN 
        ((COUNT(j.id) - COUNT(jci.id))::numeric / COUNT(j.id)::numeric) * 100
      ELSE 100
    END, 
    2
  ) AS reliability_score
FROM profiles p
LEFT JOIN jobs j ON j.customer_id = p.id
LEFT JOIN job_customer_incidents jci ON jci.job_id = j.id
WHERE p.user_type IN ('Customer', 'Hybrid')
GROUP BY p.id, p.full_name;

-- View: incident_statistics
-- Purpose: Aggregates incident statistics by job
CREATE VIEW public.incident_statistics
WITH (security_invoker = true)
AS
SELECT 
  j.id AS job_id,
  j.title AS job_title,
  COUNT(CASE WHEN jci.incident_type = 'no_show' THEN 1 END) AS no_show_count,
  COUNT(CASE WHEN jci.incident_type = 'delay' THEN 1 END) AS delay_count,
  COUNT(CASE WHEN jci.incident_type = 'access_issue' THEN 1 END) AS access_issue_count,
  COUNT(CASE WHEN jci.status = 'disputed' THEN 1 END) AS disputed_count,
  COUNT(CASE WHEN jci.status = 'resolved' THEN 1 END) AS resolved_count,
  SUM(CASE WHEN jci.compensation_status = 'paid' THEN jci.no_show_fee_applied ELSE 0 END) AS total_compensation_paid
FROM jobs j
LEFT JOIN job_customer_incidents jci ON j.id = jci.job_id
GROUP BY j.id, j.title;

-- ============================================================================
-- 3. SET PROPER PERMISSIONS (READ-ONLY)
-- ============================================================================

-- Revoke all permissions first (clean slate)
REVOKE ALL ON public.job_extension_summary FROM anon, authenticated, service_role;
REVOKE ALL ON public.public_profiles FROM anon, authenticated, service_role;
REVOKE ALL ON public.provider_listing_proofing_summary FROM anon, authenticated, service_role;
REVOKE ALL ON public.active_service_agreements FROM anon, authenticated, service_role;
REVOKE ALL ON public.customer_reliability_metrics FROM anon, authenticated, service_role;
REVOKE ALL ON public.incident_statistics FROM anon, authenticated, service_role;

-- Grant only SELECT permission (views are read-only)

-- job_extension_summary: Accessible to authenticated users who can see the jobs
GRANT SELECT ON public.job_extension_summary TO authenticated;

-- public_profiles: Public information, accessible to all
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- provider_listing_proofing_summary: Provider/admin analytics
GRANT SELECT ON public.provider_listing_proofing_summary TO authenticated;

-- active_service_agreements: Public legal documents
GRANT SELECT ON public.active_service_agreements TO anon, authenticated;

-- customer_reliability_metrics: Internal metrics for providers/admins
GRANT SELECT ON public.customer_reliability_metrics TO authenticated;

-- incident_statistics: Job-level metrics
GRANT SELECT ON public.incident_statistics TO authenticated;

-- ============================================================================
-- 4. ADD HELPFUL COMMENTS
-- ============================================================================

COMMENT ON VIEW public.job_extension_summary IS 
  'Read-only view: Aggregates job time extensions with SECURITY INVOKER (honors RLS)';

COMMENT ON VIEW public.public_profiles IS 
  'Read-only view: Public profile information with SECURITY INVOKER (honors RLS on profiles table)';

COMMENT ON VIEW public.provider_listing_proofing_summary IS 
  'Read-only view: Custom service proofing compliance metrics with SECURITY INVOKER (honors RLS)';

COMMENT ON VIEW public.active_service_agreements IS 
  'Read-only view: Active service agreement templates with SECURITY INVOKER (honors RLS)';

COMMENT ON VIEW public.customer_reliability_metrics IS 
  'Read-only view: Customer reliability scoring with SECURITY INVOKER (honors RLS)';

COMMENT ON VIEW public.incident_statistics IS 
  'Read-only view: Job incident aggregation with SECURITY INVOKER (honors RLS)';
