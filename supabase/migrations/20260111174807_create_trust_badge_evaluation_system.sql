/*
  # Trust Badge Evaluation System

  ## Overview
  Creates functions to determine provider eligibility for trust achievement badges:
  - "Top Job Provider"
  - "Top Service Provider"

  ## Badge Criteria

  ### Top Job Provider
  - Minimum 10 completed jobs
  - Job rating average ≥ 4.5
  - Trust level ≤ 1 (Good Standing or Advisory)
  - Low incident rate (< 10% in 90 days)

  ### Top Service Provider
  - Minimum 10 completed services (standard + custom)
  - Service rating average ≥ 4.6
  - Trust level ≤ 1 (Good Standing or Advisory)
  - Low incident rate (< 10% in 90 days)

  ## Functions
  - `get_provider_trust_badges()` - Returns badge eligibility for provider
  - `evaluate_job_badge_eligibility()` - Checks Top Job Provider criteria
  - `evaluate_service_badge_eligibility()` - Checks Top Service Provider criteria

  ## Security
  - Functions are SECURITY DEFINER for controlled access
  - RLS policies control who can view results
  - No numeric trust scores exposed
*/

-- =====================================================
-- FUNCTION: Evaluate Job Badge Eligibility
-- =====================================================

CREATE OR REPLACE FUNCTION evaluate_job_badge_eligibility(p_provider_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_rating numeric;
  v_job_count bigint;
  v_trust_level integer;
  v_incident_rate numeric;
  v_completed_jobs_90d integer;
BEGIN
  -- Get job ratings
  SELECT
    AVG(rating) FILTER (WHERE booking_type = 'job')::numeric(3, 2),
    COUNT(*) FILTER (WHERE booking_type = 'job')
  INTO v_job_rating, v_job_count
  FROM (
    SELECT
      r.rating,
      CASE
        WHEN j.id IS NOT NULL THEN 'job'
        WHEN b.type = 'custom_service' THEN 'custom_service'
        ELSE 'service'
      END as booking_type
    FROM reviews r
    INNER JOIN bookings b ON b.id = r.booking_id
    LEFT JOIN jobs j ON j.id = b.job_id
    WHERE r.reviewee_id = p_provider_id
      AND r.review_direction = 'customer_to_provider'
      AND b.status = 'Completed'
  ) rating_data;

  -- Get provider trust level and metrics
  SELECT
    COALESCE(trust_level, 0),
    COALESCE(incident_rate_90d, 0),
    COALESCE(completed_jobs_90d, 0)
  INTO v_trust_level, v_incident_rate, v_completed_jobs_90d
  FROM provider_trust_scores
  WHERE provider_id = p_provider_id;

  -- Evaluate criteria
  RETURN (
    v_job_count >= 10 AND
    v_job_rating >= 4.5 AND
    v_trust_level <= 1 AND
    v_incident_rate < 0.10 AND
    v_completed_jobs_90d >= 5
  );
END;
$$;

-- =====================================================
-- FUNCTION: Evaluate Service Badge Eligibility
-- =====================================================

CREATE OR REPLACE FUNCTION evaluate_service_badge_eligibility(p_provider_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service_rating numeric;
  v_service_count bigint;
  v_custom_service_rating numeric;
  v_custom_service_count bigint;
  v_combined_rating numeric;
  v_combined_count bigint;
  v_trust_level integer;
  v_incident_rate numeric;
  v_completed_jobs_90d integer;
BEGIN
  -- Get service ratings (standard + custom)
  SELECT
    AVG(rating) FILTER (WHERE booking_type = 'service')::numeric(3, 2),
    COUNT(*) FILTER (WHERE booking_type = 'service'),
    AVG(rating) FILTER (WHERE booking_type = 'custom_service')::numeric(3, 2),
    COUNT(*) FILTER (WHERE booking_type = 'custom_service')
  INTO v_service_rating, v_service_count, v_custom_service_rating, v_custom_service_count
  FROM (
    SELECT
      r.rating,
      CASE
        WHEN j.id IS NOT NULL THEN 'job'
        WHEN b.type = 'custom_service' THEN 'custom_service'
        ELSE 'service'
      END as booking_type
    FROM reviews r
    INNER JOIN bookings b ON b.id = r.booking_id
    LEFT JOIN jobs j ON j.id = b.job_id
    WHERE r.reviewee_id = p_provider_id
      AND r.review_direction = 'customer_to_provider'
      AND b.status = 'Completed'
  ) rating_data;

  -- Calculate combined service rating
  v_combined_count := COALESCE(v_service_count, 0) + COALESCE(v_custom_service_count, 0);

  IF v_combined_count > 0 THEN
    IF v_service_rating IS NOT NULL AND v_custom_service_rating IS NOT NULL THEN
      v_combined_rating := (
        (v_service_rating * v_service_count) +
        (v_custom_service_rating * v_custom_service_count)
      ) / v_combined_count;
    ELSIF v_service_rating IS NOT NULL THEN
      v_combined_rating := v_service_rating;
    ELSE
      v_combined_rating := v_custom_service_rating;
    END IF;
  END IF;

  -- Get provider trust level and metrics
  SELECT
    COALESCE(trust_level, 0),
    COALESCE(incident_rate_90d, 0),
    COALESCE(completed_jobs_90d, 0)
  INTO v_trust_level, v_incident_rate, v_completed_jobs_90d
  FROM provider_trust_scores
  WHERE provider_id = p_provider_id;

  -- Evaluate criteria
  RETURN (
    v_combined_count >= 10 AND
    v_combined_rating >= 4.6 AND
    v_trust_level <= 1 AND
    v_incident_rate < 0.10 AND
    v_completed_jobs_90d >= 5
  );
END;
$$;

-- =====================================================
-- FUNCTION: Get Provider Trust Badges
-- =====================================================

CREATE OR REPLACE FUNCTION get_provider_trust_badges(p_provider_id uuid)
RETURNS TABLE (
  has_top_job_badge boolean,
  has_top_service_badge boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    evaluate_job_badge_eligibility(p_provider_id) as has_top_job_badge,
    evaluate_service_badge_eligibility(p_provider_id) as has_top_service_badge;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION evaluate_job_badge_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION evaluate_service_badge_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_trust_badges TO authenticated;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Ensure indexes exist for trust score queries
CREATE INDEX IF NOT EXISTS idx_provider_trust_scores_provider_level
  ON provider_trust_scores(provider_id, trust_level);

CREATE INDEX IF NOT EXISTS idx_provider_trust_scores_incident_rate
  ON provider_trust_scores(provider_id, incident_rate_90d);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION get_provider_trust_badges IS
'Returns trust badge eligibility for a provider without exposing numeric trust scores. Badges are earned based on high ratings, completion history, and good standing.';

COMMENT ON FUNCTION evaluate_job_badge_eligibility IS
'Determines if provider qualifies for Top Job Provider badge based on ratings, trust level, and reliability metrics.';

COMMENT ON FUNCTION evaluate_service_badge_eligibility IS
'Determines if provider qualifies for Top Service Provider badge based on service ratings (standard + custom), trust level, and reliability metrics.';
