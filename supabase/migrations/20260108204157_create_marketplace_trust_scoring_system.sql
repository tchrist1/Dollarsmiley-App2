/*
  # Marketplace Trust Scoring System

  ## Overview
  Unified trust scoring framework for CUSTOMERS and PROVIDERS with role-appropriate metrics.

  ## Design Principles
  1. Detect patterns, not one-offs
  2. Recent behavior weighs more than older behavior
  3. Trust decays over time with good behavior
  4. Transparent to affected party
  5. No public trust labels
  6. No automatic financial penalties
  7. Symmetry: each role scored only on actions they control

  ## Customer Trust Scoring
  - Based on no-show reliability
  - Levels: 0 (Normal), 1 (Soft Warning), 2 (Reliability Risk), 3 (High Risk)
  - Metrics: no-show count, rate, recency, provider diversity

  ## Provider Trust Scoring
  - Based on reliability and conduct
  - Levels: 0 (Good Standing), 1 (Advisory), 2 (Reliability Risk), 3 (High Risk)
  - Metrics: incident count, rate, recency, customer diversity

  ## New Tables
  - `customer_trust_scores` - Customer reliability scoring
  - `provider_trust_scores` - Provider reliability scoring
  - `trust_score_events` - Audit trail for all trust-affecting events
  - `trust_score_snapshots` - Historical snapshots for trend analysis

  ## Functions
  - `calculate_customer_trust_score()` - Compute customer trust metrics
  - `calculate_provider_trust_score()` - Compute provider trust metrics
  - `update_customer_trust_level()` - Determine customer trust level (0-3)
  - `update_provider_trust_level()` - Determine provider trust level (0-3)
  - `record_trust_event()` - Log trust-affecting events
  - `get_trust_improvement_guidance()` - Generate actionable improvement tips

  ## Security
  - RLS enabled on all tables
  - Users can only see their own trust status
  - Admins have full visibility for support/review
  - No cross-party visibility (customers can't see provider trust, vice versa)
*/

-- =====================================================
-- TRUST SCORE TABLES
-- =====================================================

-- Customer Trust Scores
CREATE TABLE IF NOT EXISTS customer_trust_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Core Metrics
  no_show_count_30d integer DEFAULT 0,
  no_show_count_90d integer DEFAULT 0,
  no_show_count_180d integer DEFAULT 0,
  no_show_count_lifetime integer DEFAULT 0,

  completed_jobs_30d integer DEFAULT 0,
  completed_jobs_90d integer DEFAULT 0,
  completed_jobs_180d integer DEFAULT 0,
  completed_jobs_lifetime integer DEFAULT 0,

  -- Calculated Rates
  no_show_rate_30d numeric(5,4) DEFAULT 0.0,
  no_show_rate_90d numeric(5,4) DEFAULT 0.0,
  no_show_rate_180d numeric(5,4) DEFAULT 0.0,
  no_show_rate_lifetime numeric(5,4) DEFAULT 0.0,

  -- Provider Diversity (signals pattern vs. isolated incident)
  unique_providers_affected_30d integer DEFAULT 0,
  unique_providers_affected_90d integer DEFAULT 0,
  unique_providers_affected_180d integer DEFAULT 0,

  -- Trust Level (0 = Normal, 1 = Soft Warning, 2 = Reliability Risk, 3 = High Risk)
  trust_level integer DEFAULT 0 CHECK (trust_level BETWEEN 0 AND 3),
  previous_trust_level integer DEFAULT 0,

  -- Recency Weighting
  last_no_show_at timestamptz,
  last_completed_job_at timestamptz,

  -- Recovery Tracking
  consecutive_completed_jobs integer DEFAULT 0,
  trust_improved_at timestamptz,

  -- Metadata
  score_calculated_at timestamptz DEFAULT now(),
  last_event_at timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(customer_id)
);

-- Provider Trust Scores
CREATE TABLE IF NOT EXISTS provider_trust_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Core Incident Metrics (provider-caused issues only)
  provider_no_show_count_30d integer DEFAULT 0,
  provider_no_show_count_90d integer DEFAULT 0,
  provider_no_show_count_180d integer DEFAULT 0,
  provider_no_show_count_lifetime integer DEFAULT 0,

  late_arrival_count_30d integer DEFAULT 0,
  late_arrival_count_90d integer DEFAULT 0,
  late_arrival_count_180d integer DEFAULT 0,

  excessive_extension_count_30d integer DEFAULT 0,
  excessive_extension_count_90d integer DEFAULT 0,
  excessive_extension_count_180d integer DEFAULT 0,

  disputed_jobs_upheld_30d integer DEFAULT 0,
  disputed_jobs_upheld_90d integer DEFAULT 0,
  disputed_jobs_upheld_180d integer DEFAULT 0,

  abandoned_jobs_30d integer DEFAULT 0,
  abandoned_jobs_90d integer DEFAULT 0,
  abandoned_jobs_180d integer DEFAULT 0,

  -- Completed Jobs (positive signal)
  completed_jobs_30d integer DEFAULT 0,
  completed_jobs_90d integer DEFAULT 0,
  completed_jobs_180d integer DEFAULT 0,
  completed_jobs_lifetime integer DEFAULT 0,

  -- Calculated Rates
  incident_rate_30d numeric(5,4) DEFAULT 0.0,
  incident_rate_90d numeric(5,4) DEFAULT 0.0,
  incident_rate_180d numeric(5,4) DEFAULT 0.0,

  -- Customer Diversity (signals pattern vs. isolated incident)
  unique_customers_affected_30d integer DEFAULT 0,
  unique_customers_affected_90d integer DEFAULT 0,
  unique_customers_affected_180d integer DEFAULT 0,

  -- Trust Level (0 = Good Standing, 1 = Advisory, 2 = Reliability Risk, 3 = High Risk)
  trust_level integer DEFAULT 0 CHECK (trust_level BETWEEN 0 AND 3),
  previous_trust_level integer DEFAULT 0,

  -- Recency Weighting
  last_incident_at timestamptz,
  last_completed_job_at timestamptz,

  -- Recovery Tracking
  consecutive_completed_jobs integer DEFAULT 0,
  trust_improved_at timestamptz,

  -- Metadata
  score_calculated_at timestamptz DEFAULT now(),
  last_event_at timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(provider_id)
);

-- Trust Score Events (Audit Trail)
CREATE TABLE IF NOT EXISTS trust_score_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event Subject
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_role text NOT NULL CHECK (user_role IN ('customer', 'provider')),

  -- Event Details
  event_type text NOT NULL,
  event_category text NOT NULL CHECK (event_category IN ('negative', 'positive', 'neutral')),

  -- Related Records
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  incident_id uuid,

  -- Impact
  trust_level_before integer,
  trust_level_after integer,
  trust_level_changed boolean DEFAULT false,

  -- Context
  event_metadata jsonb DEFAULT '{}',
  notes text,

  -- Recency Weight (decays over time)
  weight numeric(3,2) DEFAULT 1.0,
  expires_at timestamptz,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trust_events_user ON trust_score_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trust_events_type ON trust_score_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trust_events_expires ON trust_score_events(expires_at) WHERE expires_at IS NOT NULL;

-- Trust Score Snapshots (for trend analysis)
CREATE TABLE IF NOT EXISTS trust_score_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_role text NOT NULL CHECK (user_role IN ('customer', 'provider')),

  trust_level integer NOT NULL,
  score_data jsonb NOT NULL,

  snapshot_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trust_snapshots_user ON trust_score_snapshots(user_id, created_at DESC);

-- =====================================================
-- TRUST SCORE CALCULATION FUNCTIONS
-- =====================================================

-- Calculate Customer Trust Score
CREATE OR REPLACE FUNCTION calculate_customer_trust_score(p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_no_show_30d integer;
  v_no_show_90d integer;
  v_no_show_180d integer;
  v_no_show_lifetime integer;
  v_completed_30d integer;
  v_completed_90d integer;
  v_completed_180d integer;
  v_completed_lifetime integer;
  v_providers_30d integer;
  v_providers_90d integer;
  v_providers_180d integer;
  v_last_no_show timestamptz;
  v_last_completed timestamptz;
  v_consecutive_completed integer;
BEGIN
  -- Count customer no-shows (strict: only provider-confirmed no-shows)
  SELECT
    COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days'),
    COUNT(*) FILTER (WHERE created_at >= now() - interval '90 days'),
    COUNT(*) FILTER (WHERE created_at >= now() - interval '180 days'),
    COUNT(*),
    MAX(created_at)
  INTO
    v_no_show_30d, v_no_show_90d, v_no_show_180d, v_no_show_lifetime, v_last_no_show
  FROM job_customer_incidents
  WHERE customer_id = p_customer_id
    AND incident_type = 'no_show'
    AND status IN ('acknowledged', 'resolved');

  -- Count unique providers affected (diversity signal)
  SELECT
    COUNT(DISTINCT provider_id) FILTER (WHERE created_at >= now() - interval '30 days'),
    COUNT(DISTINCT provider_id) FILTER (WHERE created_at >= now() - interval '90 days'),
    COUNT(DISTINCT provider_id) FILTER (WHERE created_at >= now() - interval '180 days')
  INTO
    v_providers_30d, v_providers_90d, v_providers_180d
  FROM job_customer_incidents
  WHERE customer_id = p_customer_id
    AND incident_type = 'no_show'
    AND status IN ('acknowledged', 'resolved');

  -- Count completed jobs (positive signal)
  SELECT
    COUNT(*) FILTER (WHERE j.completed_at >= now() - interval '30 days'),
    COUNT(*) FILTER (WHERE j.completed_at >= now() - interval '90 days'),
    COUNT(*) FILTER (WHERE j.completed_at >= now() - interval '180 days'),
    COUNT(*),
    MAX(j.completed_at)
  INTO
    v_completed_30d, v_completed_90d, v_completed_180d, v_completed_lifetime, v_last_completed
  FROM jobs j
  WHERE j.customer_id = p_customer_id
    AND j.status = 'completed';

  -- Calculate consecutive completed jobs since last no-show
  SELECT COUNT(*)
  INTO v_consecutive_completed
  FROM jobs j
  WHERE j.customer_id = p_customer_id
    AND j.status = 'completed'
    AND (v_last_no_show IS NULL OR j.completed_at > v_last_no_show)
  ORDER BY j.completed_at DESC;

  -- Upsert customer trust score
  INSERT INTO customer_trust_scores (
    customer_id,
    no_show_count_30d,
    no_show_count_90d,
    no_show_count_180d,
    no_show_count_lifetime,
    completed_jobs_30d,
    completed_jobs_90d,
    completed_jobs_180d,
    completed_jobs_lifetime,
    no_show_rate_30d,
    no_show_rate_90d,
    no_show_rate_180d,
    no_show_rate_lifetime,
    unique_providers_affected_30d,
    unique_providers_affected_90d,
    unique_providers_affected_180d,
    last_no_show_at,
    last_completed_job_at,
    consecutive_completed_jobs,
    score_calculated_at,
    last_event_at,
    updated_at
  ) VALUES (
    p_customer_id,
    v_no_show_30d,
    v_no_show_90d,
    v_no_show_180d,
    v_no_show_lifetime,
    v_completed_30d,
    v_completed_90d,
    v_completed_180d,
    v_completed_lifetime,
    CASE WHEN v_completed_30d + v_no_show_30d > 0 THEN v_no_show_30d::numeric / (v_completed_30d + v_no_show_30d) ELSE 0 END,
    CASE WHEN v_completed_90d + v_no_show_90d > 0 THEN v_no_show_90d::numeric / (v_completed_90d + v_no_show_90d) ELSE 0 END,
    CASE WHEN v_completed_180d + v_no_show_180d > 0 THEN v_no_show_180d::numeric / (v_completed_180d + v_no_show_180d) ELSE 0 END,
    CASE WHEN v_completed_lifetime + v_no_show_lifetime > 0 THEN v_no_show_lifetime::numeric / (v_completed_lifetime + v_no_show_lifetime) ELSE 0 END,
    v_providers_30d,
    v_providers_90d,
    v_providers_180d,
    v_last_no_show,
    v_last_completed,
    v_consecutive_completed,
    now(),
    now(),
    now()
  )
  ON CONFLICT (customer_id) DO UPDATE SET
    no_show_count_30d = EXCLUDED.no_show_count_30d,
    no_show_count_90d = EXCLUDED.no_show_count_90d,
    no_show_count_180d = EXCLUDED.no_show_count_180d,
    no_show_count_lifetime = EXCLUDED.no_show_count_lifetime,
    completed_jobs_30d = EXCLUDED.completed_jobs_30d,
    completed_jobs_90d = EXCLUDED.completed_jobs_90d,
    completed_jobs_180d = EXCLUDED.completed_jobs_180d,
    completed_jobs_lifetime = EXCLUDED.completed_jobs_lifetime,
    no_show_rate_30d = EXCLUDED.no_show_rate_30d,
    no_show_rate_90d = EXCLUDED.no_show_rate_90d,
    no_show_rate_180d = EXCLUDED.no_show_rate_180d,
    no_show_rate_lifetime = EXCLUDED.no_show_rate_lifetime,
    unique_providers_affected_30d = EXCLUDED.unique_providers_affected_30d,
    unique_providers_affected_90d = EXCLUDED.unique_providers_affected_90d,
    unique_providers_affected_180d = EXCLUDED.unique_providers_affected_180d,
    last_no_show_at = EXCLUDED.last_no_show_at,
    last_completed_job_at = EXCLUDED.last_completed_job_at,
    consecutive_completed_jobs = EXCLUDED.consecutive_completed_jobs,
    score_calculated_at = EXCLUDED.score_calculated_at,
    last_event_at = EXCLUDED.last_event_at,
    updated_at = now();

  -- Update trust level based on metrics
  PERFORM update_customer_trust_level(p_customer_id);
END;
$$;

-- Calculate Provider Trust Score
CREATE OR REPLACE FUNCTION calculate_provider_trust_score(p_provider_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_incidents_30d integer;
  v_incidents_90d integer;
  v_incidents_180d integer;
  v_completed_30d integer;
  v_completed_90d integer;
  v_completed_180d integer;
  v_completed_lifetime integer;
  v_customers_30d integer;
  v_customers_90d integer;
  v_customers_180d integer;
  v_last_incident timestamptz;
  v_last_completed timestamptz;
  v_consecutive_completed integer;
BEGIN
  -- Count provider incidents (provider-caused only, excluding customer no-shows)
  SELECT
    COUNT(*) FILTER (WHERE b.updated_at >= now() - interval '30 days'),
    COUNT(*) FILTER (WHERE b.updated_at >= now() - interval '90 days'),
    COUNT(*) FILTER (WHERE b.updated_at >= now() - interval '180 days'),
    MAX(b.updated_at)
  INTO
    v_incidents_30d, v_incidents_90d, v_incidents_180d, v_last_incident
  FROM bookings b
  WHERE b.provider_id = p_provider_id
    AND b.status IN ('cancelled_by_provider', 'disputed');

  -- Count unique customers affected (diversity signal)
  SELECT
    COUNT(DISTINCT j.customer_id) FILTER (WHERE b.updated_at >= now() - interval '30 days'),
    COUNT(DISTINCT j.customer_id) FILTER (WHERE b.updated_at >= now() - interval '90 days'),
    COUNT(DISTINCT j.customer_id) FILTER (WHERE b.updated_at >= now() - interval '180 days')
  INTO
    v_customers_30d, v_customers_90d, v_customers_180d
  FROM bookings b
  JOIN jobs j ON b.job_id = j.id
  WHERE b.provider_id = p_provider_id
    AND b.status IN ('cancelled_by_provider', 'disputed');

  -- Count completed jobs (positive signal)
  SELECT
    COUNT(*) FILTER (WHERE b.completed_at >= now() - interval '30 days'),
    COUNT(*) FILTER (WHERE b.completed_at >= now() - interval '90 days'),
    COUNT(*) FILTER (WHERE b.completed_at >= now() - interval '180 days'),
    COUNT(*),
    MAX(b.completed_at)
  INTO
    v_completed_30d, v_completed_90d, v_completed_180d, v_completed_lifetime, v_last_completed
  FROM bookings b
  WHERE b.provider_id = p_provider_id
    AND b.status = 'completed';

  -- Calculate consecutive completed jobs since last incident
  SELECT COUNT(*)
  INTO v_consecutive_completed
  FROM bookings b
  WHERE b.provider_id = p_provider_id
    AND b.status = 'completed'
    AND (v_last_incident IS NULL OR b.completed_at > v_last_incident)
  ORDER BY b.completed_at DESC;

  -- Upsert provider trust score
  INSERT INTO provider_trust_scores (
    provider_id,
    provider_no_show_count_30d,
    provider_no_show_count_90d,
    provider_no_show_count_180d,
    completed_jobs_30d,
    completed_jobs_90d,
    completed_jobs_180d,
    completed_jobs_lifetime,
    incident_rate_30d,
    incident_rate_90d,
    incident_rate_180d,
    unique_customers_affected_30d,
    unique_customers_affected_90d,
    unique_customers_affected_180d,
    last_incident_at,
    last_completed_job_at,
    consecutive_completed_jobs,
    score_calculated_at,
    last_event_at,
    updated_at
  ) VALUES (
    p_provider_id,
    v_incidents_30d,
    v_incidents_90d,
    v_incidents_180d,
    v_completed_30d,
    v_completed_90d,
    v_completed_180d,
    v_completed_lifetime,
    CASE WHEN v_completed_30d + v_incidents_30d > 0 THEN v_incidents_30d::numeric / (v_completed_30d + v_incidents_30d) ELSE 0 END,
    CASE WHEN v_completed_90d + v_incidents_90d > 0 THEN v_incidents_90d::numeric / (v_completed_90d + v_incidents_90d) ELSE 0 END,
    CASE WHEN v_completed_180d + v_incidents_180d > 0 THEN v_incidents_180d::numeric / (v_completed_180d + v_incidents_180d) ELSE 0 END,
    v_customers_30d,
    v_customers_90d,
    v_customers_180d,
    v_last_incident,
    v_last_completed,
    v_consecutive_completed,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider_id) DO UPDATE SET
    provider_no_show_count_30d = EXCLUDED.provider_no_show_count_30d,
    provider_no_show_count_90d = EXCLUDED.provider_no_show_count_90d,
    provider_no_show_count_180d = EXCLUDED.provider_no_show_count_180d,
    completed_jobs_30d = EXCLUDED.completed_jobs_30d,
    completed_jobs_90d = EXCLUDED.completed_jobs_90d,
    completed_jobs_180d = EXCLUDED.completed_jobs_180d,
    completed_jobs_lifetime = EXCLUDED.completed_jobs_lifetime,
    incident_rate_30d = EXCLUDED.incident_rate_30d,
    incident_rate_90d = EXCLUDED.incident_rate_90d,
    incident_rate_180d = EXCLUDED.incident_rate_180d,
    unique_customers_affected_30d = EXCLUDED.unique_customers_affected_30d,
    unique_customers_affected_90d = EXCLUDED.unique_customers_affected_90d,
    unique_customers_affected_180d = EXCLUDED.unique_customers_affected_180d,
    last_incident_at = EXCLUDED.last_incident_at,
    last_completed_job_at = EXCLUDED.last_completed_job_at,
    consecutive_completed_jobs = EXCLUDED.consecutive_completed_jobs,
    score_calculated_at = EXCLUDED.score_calculated_at,
    last_event_at = EXCLUDED.last_event_at,
    updated_at = now();

  -- Update trust level based on metrics
  PERFORM update_provider_trust_level(p_provider_id);
END;
$$;

-- Update Customer Trust Level
CREATE OR REPLACE FUNCTION update_customer_trust_level(p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score record;
  v_new_level integer;
  v_old_level integer;
BEGIN
  SELECT * INTO v_score
  FROM customer_trust_scores
  WHERE customer_id = p_customer_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_old_level := v_score.trust_level;

  -- Determine trust level based on metrics
  -- Level 0: Normal (0-1 no-shows in 6 months)
  -- Level 1: Soft Warning (2 no-shows in 90 days OR elevated rate)
  -- Level 2: Reliability Risk (3-4 no-shows in 90-180 days)
  -- Level 3: High Risk (persistent pattern across providers)

  IF v_score.no_show_count_180d = 0 THEN
    v_new_level := 0;
  ELSIF v_score.no_show_count_180d = 1 THEN
    v_new_level := 0;
  ELSIF v_score.no_show_count_90d >= 2 AND v_score.no_show_count_90d < 3 THEN
    v_new_level := 1;
  ELSIF v_score.no_show_rate_90d >= 0.15 THEN
    v_new_level := 1;
  ELSIF v_score.no_show_count_180d BETWEEN 3 AND 4 THEN
    v_new_level := 2;
  ELSIF v_score.no_show_count_180d >= 5 AND v_score.unique_providers_affected_180d >= 3 THEN
    v_new_level := 3;
  ELSIF v_score.no_show_count_90d >= 3 THEN
    v_new_level := 2;
  ELSE
    v_new_level := 0;
  END IF;

  -- Apply recovery bonus: if customer has 5+ consecutive completed jobs, reduce level by 1
  IF v_score.consecutive_completed_jobs >= 5 AND v_new_level > 0 THEN
    v_new_level := v_new_level - 1;
  END IF;

  -- Update trust level
  UPDATE customer_trust_scores
  SET
    trust_level = v_new_level,
    previous_trust_level = v_old_level,
    trust_improved_at = CASE WHEN v_new_level < v_old_level THEN now() ELSE trust_improved_at END,
    updated_at = now()
  WHERE customer_id = p_customer_id;

  -- Create snapshot if level changed
  IF v_new_level != v_old_level THEN
    INSERT INTO trust_score_snapshots (user_id, user_role, trust_level, score_data, snapshot_reason)
    VALUES (
      p_customer_id,
      'customer',
      v_new_level,
      jsonb_build_object(
        'no_show_count_30d', v_score.no_show_count_30d,
        'no_show_count_90d', v_score.no_show_count_90d,
        'no_show_count_180d', v_score.no_show_count_180d,
        'no_show_rate_90d', v_score.no_show_rate_90d,
        'completed_jobs_90d', v_score.completed_jobs_90d,
        'consecutive_completed_jobs', v_score.consecutive_completed_jobs,
        'unique_providers_affected_180d', v_score.unique_providers_affected_180d
      ),
      'Trust level changed from ' || v_old_level || ' to ' || v_new_level
    );
  END IF;
END;
$$;

-- Update Provider Trust Level
CREATE OR REPLACE FUNCTION update_provider_trust_level(p_provider_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score record;
  v_new_level integer;
  v_old_level integer;
BEGIN
  SELECT * INTO v_score
  FROM provider_trust_scores
  WHERE provider_id = p_provider_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_old_level := v_score.trust_level;

  -- Determine trust level based on metrics
  -- Level 0: Good Standing (no significant issues)
  -- Level 1: Advisory (pattern emerging)
  -- Level 2: Reliability Risk (repeated issues)
  -- Level 3: High Risk (sustained negative pattern)

  IF v_score.provider_no_show_count_180d = 0 AND v_score.incident_rate_180d < 0.05 THEN
    v_new_level := 0;
  ELSIF v_score.provider_no_show_count_90d >= 1 AND v_score.provider_no_show_count_90d < 2 THEN
    v_new_level := 1;
  ELSIF v_score.incident_rate_90d >= 0.10 AND v_score.incident_rate_90d < 0.20 THEN
    v_new_level := 1;
  ELSIF v_score.provider_no_show_count_90d >= 2 OR v_score.incident_rate_90d >= 0.20 THEN
    v_new_level := 2;
  ELSIF v_score.provider_no_show_count_180d >= 4 AND v_score.unique_customers_affected_180d >= 3 THEN
    v_new_level := 3;
  ELSE
    v_new_level := 0;
  END IF;

  -- Apply recovery bonus: if provider has 10+ consecutive completed jobs, reduce level by 1
  IF v_score.consecutive_completed_jobs >= 10 AND v_new_level > 0 THEN
    v_new_level := v_new_level - 1;
  END IF;

  -- Update trust level
  UPDATE provider_trust_scores
  SET
    trust_level = v_new_level,
    previous_trust_level = v_old_level,
    trust_improved_at = CASE WHEN v_new_level < v_old_level THEN now() ELSE trust_improved_at END,
    updated_at = now()
  WHERE provider_id = p_provider_id;

  -- Create snapshot if level changed
  IF v_new_level != v_old_level THEN
    INSERT INTO trust_score_snapshots (user_id, user_role, trust_level, score_data, snapshot_reason)
    VALUES (
      p_provider_id,
      'provider',
      v_new_level,
      jsonb_build_object(
        'provider_no_show_count_30d', v_score.provider_no_show_count_30d,
        'provider_no_show_count_90d', v_score.provider_no_show_count_90d,
        'incident_rate_90d', v_score.incident_rate_90d,
        'completed_jobs_90d', v_score.completed_jobs_90d,
        'consecutive_completed_jobs', v_score.consecutive_completed_jobs,
        'unique_customers_affected_180d', v_score.unique_customers_affected_180d
      ),
      'Trust level changed from ' || v_old_level || ' to ' || v_new_level
    );
  END IF;
END;
$$;

-- Record Trust Event
CREATE OR REPLACE FUNCTION record_trust_event(
  p_user_id uuid,
  p_user_role text,
  p_event_type text,
  p_event_category text,
  p_job_id uuid DEFAULT NULL,
  p_booking_id uuid DEFAULT NULL,
  p_incident_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
  v_trust_level_before integer;
  v_trust_level_after integer;
  v_expires_at timestamptz;
BEGIN
  -- Get current trust level
  IF p_user_role = 'customer' THEN
    SELECT trust_level INTO v_trust_level_before
    FROM customer_trust_scores
    WHERE customer_id = p_user_id;
  ELSIF p_user_role = 'provider' THEN
    SELECT trust_level INTO v_trust_level_before
    FROM provider_trust_scores
    WHERE provider_id = p_user_id;
  END IF;

  -- Set expiration based on event category
  IF p_event_category = 'negative' THEN
    v_expires_at := now() + interval '180 days';
  ELSIF p_event_category = 'positive' THEN
    v_expires_at := NULL;
  ELSE
    v_expires_at := now() + interval '90 days';
  END IF;

  -- Insert event
  INSERT INTO trust_score_events (
    user_id,
    user_role,
    event_type,
    event_category,
    job_id,
    booking_id,
    incident_id,
    trust_level_before,
    notes,
    event_metadata,
    expires_at
  ) VALUES (
    p_user_id,
    p_user_role,
    p_event_type,
    p_event_category,
    p_job_id,
    p_booking_id,
    p_incident_id,
    v_trust_level_before,
    p_notes,
    p_metadata,
    v_expires_at
  )
  RETURNING id INTO v_event_id;

  -- Recalculate trust score
  IF p_user_role = 'customer' THEN
    PERFORM calculate_customer_trust_score(p_user_id);

    SELECT trust_level INTO v_trust_level_after
    FROM customer_trust_scores
    WHERE customer_id = p_user_id;
  ELSIF p_user_role = 'provider' THEN
    PERFORM calculate_provider_trust_score(p_user_id);

    SELECT trust_level INTO v_trust_level_after
    FROM provider_trust_scores
    WHERE provider_id = p_user_id;
  END IF;

  -- Update event with after-level
  UPDATE trust_score_events
  SET
    trust_level_after = v_trust_level_after,
    trust_level_changed = (v_trust_level_before IS DISTINCT FROM v_trust_level_after)
  WHERE id = v_event_id;

  RETURN v_event_id;
END;
$$;

-- Get Trust Improvement Guidance
CREATE OR REPLACE FUNCTION get_trust_improvement_guidance(
  p_user_id uuid,
  p_user_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guidance jsonb;
  v_trust_level integer;
  v_score record;
BEGIN
  IF p_user_role = 'customer' THEN
    SELECT trust_level INTO v_trust_level
    FROM customer_trust_scores
    WHERE customer_id = p_user_id;

    SELECT * INTO v_score
    FROM customer_trust_scores
    WHERE customer_id = p_user_id;

    v_guidance := jsonb_build_object(
      'trust_level', COALESCE(v_trust_level, 0),
      'trust_level_label', CASE COALESCE(v_trust_level, 0)
        WHEN 0 THEN 'Normal'
        WHEN 1 THEN 'Soft Warning'
        WHEN 2 THEN 'Reliability Risk'
        WHEN 3 THEN 'High Risk'
        ELSE 'Unknown'
      END,
      'status', CASE COALESCE(v_trust_level, 0)
        WHEN 0 THEN 'good'
        WHEN 1 THEN 'advisory'
        WHEN 2 THEN 'warning'
        WHEN 3 THEN 'risk'
        ELSE 'unknown'
      END,
      'no_show_count_90d', COALESCE(v_score.no_show_count_90d, 0),
      'completed_jobs_90d', COALESCE(v_score.completed_jobs_90d, 0),
      'consecutive_completed_jobs', COALESCE(v_score.consecutive_completed_jobs, 0),
      'improvement_tips', CASE COALESCE(v_trust_level, 0)
        WHEN 0 THEN jsonb_build_array(
          'You have excellent reliability! Keep it up.',
          'Complete jobs as scheduled to maintain your standing.'
        )
        WHEN 1 THEN jsonb_build_array(
          'Recent no-shows detected. Ensure you can attend before booking.',
          'If plans change, cancel at least 24 hours in advance.',
          'Complete ' || (5 - COALESCE(v_score.consecutive_completed_jobs, 0)) || ' more jobs to improve your standing.'
        )
        WHEN 2 THEN jsonb_build_array(
          'Multiple no-shows detected. This affects your ability to post jobs.',
          'You must add a no-show fee to new job postings.',
          'Complete ' || (5 - COALESCE(v_score.consecutive_completed_jobs, 0)) || ' consecutive jobs to reduce restrictions.',
          'Contact support if you have questions.'
        )
        WHEN 3 THEN jsonb_build_array(
          'Your reliability score requires attention.',
          'Time-sensitive job posting is currently limited.',
          'Complete ' || (5 - COALESCE(v_score.consecutive_completed_jobs, 0)) || ' consecutive jobs to improve.',
          'Your account may be reviewed by our trust & safety team.',
          'Contact support for assistance.'
        )
        ELSE jsonb_build_array('No guidance available.')
      END,
      'recovery_progress', CASE
        WHEN COALESCE(v_score.consecutive_completed_jobs, 0) >= 5 THEN jsonb_build_object(
          'eligible_for_improvement', true,
          'completed', 5,
          'required', 5,
          'message', 'You qualify for trust level improvement!'
        )
        ELSE jsonb_build_object(
          'eligible_for_improvement', false,
          'completed', COALESCE(v_score.consecutive_completed_jobs, 0),
          'required', 5,
          'message', 'Complete ' || (5 - COALESCE(v_score.consecutive_completed_jobs, 0)) || ' more consecutive jobs to improve your trust level.'
        )
      END
    );

  ELSIF p_user_role = 'provider' THEN
    SELECT trust_level INTO v_trust_level
    FROM provider_trust_scores
    WHERE provider_id = p_user_id;

    SELECT * INTO v_score
    FROM provider_trust_scores
    WHERE provider_id = p_user_id;

    v_guidance := jsonb_build_object(
      'trust_level', COALESCE(v_trust_level, 0),
      'trust_level_label', CASE COALESCE(v_trust_level, 0)
        WHEN 0 THEN 'Good Standing'
        WHEN 1 THEN 'Advisory'
        WHEN 2 THEN 'Reliability Risk'
        WHEN 3 THEN 'High Risk'
        ELSE 'Unknown'
      END,
      'status', CASE COALESCE(v_trust_level, 0)
        WHEN 0 THEN 'good'
        WHEN 1 THEN 'advisory'
        WHEN 2 THEN 'warning'
        WHEN 3 THEN 'risk'
        ELSE 'unknown'
      END,
      'incident_count_90d', COALESCE(v_score.provider_no_show_count_90d, 0),
      'completed_jobs_90d', COALESCE(v_score.completed_jobs_90d, 0),
      'consecutive_completed_jobs', COALESCE(v_score.consecutive_completed_jobs, 0),
      'improvement_tips', CASE COALESCE(v_trust_level, 0)
        WHEN 0 THEN jsonb_build_array(
          'You have excellent reliability! Keep up the great work.',
          'Continue arriving on time and completing jobs successfully.'
        )
        WHEN 1 THEN jsonb_build_array(
          'A pattern is emerging. Please review job commitments carefully.',
          'Arrive on time and communicate any delays immediately.',
          'Complete ' || (10 - COALESCE(v_score.consecutive_completed_jobs, 0)) || ' more jobs successfully to improve your standing.'
        )
        WHEN 2 THEN jsonb_build_array(
          'Repeated reliability issues detected.',
          'Only accept jobs you can definitely complete.',
          'Communicate proactively with customers about any issues.',
          'Complete ' || (10 - COALESCE(v_score.consecutive_completed_jobs, 0)) || ' consecutive jobs to reduce restrictions.',
          'Contact support if you need assistance.'
        )
        WHEN 3 THEN jsonb_build_array(
          'Your reliability score requires immediate attention.',
          'Access to high-urgency jobs is currently limited.',
          'Complete ' || (10 - COALESCE(v_score.consecutive_completed_jobs, 0)) || ' consecutive jobs to improve.',
          'Your account may be reviewed by our trust & safety team.',
          'Contact support for guidance.'
        )
        ELSE jsonb_build_array('No guidance available.')
      END,
      'recovery_progress', CASE
        WHEN COALESCE(v_score.consecutive_completed_jobs, 0) >= 10 THEN jsonb_build_object(
          'eligible_for_improvement', true,
          'completed', 10,
          'required', 10,
          'message', 'You qualify for trust level improvement!'
        )
        ELSE jsonb_build_object(
          'eligible_for_improvement', false,
          'completed', COALESCE(v_score.consecutive_completed_jobs, 0),
          'required', 10,
          'message', 'Complete ' || (10 - COALESCE(v_score.consecutive_completed_jobs, 0)) || ' more consecutive jobs to improve your trust level.'
        )
      END
    );
  ELSE
    v_guidance := jsonb_build_object('error', 'Invalid user role');
  END IF;

  RETURN v_guidance;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Update customer trust score when no-show is acknowledged
CREATE OR REPLACE FUNCTION trigger_update_customer_trust_on_no_show()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only process when status changes to acknowledged or resolved
  IF NEW.status IN ('acknowledged', 'resolved') AND
     OLD.status NOT IN ('acknowledged', 'resolved') AND
     NEW.incident_type = 'no_show' THEN

    -- Record trust event
    PERFORM record_trust_event(
      NEW.customer_id,
      'customer',
      'customer_no_show',
      'negative',
      NEW.job_id,
      NULL,
      NEW.id,
      'Customer no-show confirmed',
      jsonb_build_object(
        'provider_id', NEW.provider_id,
        'grace_period_elapsed', true,
        'contact_attempts', NEW.contact_attempts
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_customer_trust_on_no_show
  AFTER UPDATE ON job_customer_incidents
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_customer_trust_on_no_show();

-- Trigger: Update customer trust score when job is completed
CREATE OR REPLACE FUNCTION trigger_update_customer_trust_on_job_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Record positive trust event
    PERFORM record_trust_event(
      NEW.customer_id,
      'customer',
      'job_completed',
      'positive',
      NEW.id,
      NULL,
      NULL,
      'Job completed successfully',
      jsonb_build_object('job_type', NEW.job_type)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_customer_trust_on_job_complete
  AFTER UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_customer_trust_on_job_complete();

-- Trigger: Update provider trust score when booking is completed
CREATE OR REPLACE FUNCTION trigger_update_provider_trust_on_booking_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Record positive trust event
    PERFORM record_trust_event(
      NEW.provider_id,
      'provider',
      'booking_completed',
      'positive',
      NEW.job_id,
      NEW.id,
      NULL,
      'Booking completed successfully',
      '{}'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_provider_trust_on_booking_complete
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_provider_trust_on_booking_complete();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Customer Trust Scores RLS
ALTER TABLE customer_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customer trust score"
  ON customer_trust_scores
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can view all customer trust scores"
  ON customer_trust_scores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Provider Trust Scores RLS
ALTER TABLE provider_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own provider trust score"
  ON provider_trust_scores
  FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Admins can view all provider trust scores"
  ON provider_trust_scores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Trust Score Events RLS
ALTER TABLE trust_score_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trust events"
  ON trust_score_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all trust events"
  ON trust_score_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Trust Score Snapshots RLS
ALTER TABLE trust_score_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trust snapshots"
  ON trust_score_snapshots
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all trust snapshots"
  ON trust_score_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_customer_trust_scores_customer_id ON customer_trust_scores(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_trust_scores_trust_level ON customer_trust_scores(trust_level);
CREATE INDEX IF NOT EXISTS idx_provider_trust_scores_provider_id ON provider_trust_scores(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_trust_scores_trust_level ON provider_trust_scores(trust_level);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE customer_trust_scores IS 'Customer reliability scoring based on no-show patterns. Pattern detection, not punishment for one-offs.';
COMMENT ON TABLE provider_trust_scores IS 'Provider reliability scoring based on conduct patterns. Pattern detection, not punishment for one-offs.';
COMMENT ON TABLE trust_score_events IS 'Audit trail for all trust-affecting events. Used for transparency and dispute resolution.';
COMMENT ON TABLE trust_score_snapshots IS 'Historical snapshots of trust scores for trend analysis and recovery tracking.';

COMMENT ON FUNCTION calculate_customer_trust_score IS 'Recalculates customer trust score based on no-show history and completed jobs. Recent behavior weighs more.';
COMMENT ON FUNCTION calculate_provider_trust_score IS 'Recalculates provider trust score based on incident history and completed jobs. Recent behavior weighs more.';
COMMENT ON FUNCTION update_customer_trust_level IS 'Determines customer trust level (0-3) based on calculated metrics. Applies recovery bonuses.';
COMMENT ON FUNCTION update_provider_trust_level IS 'Determines provider trust level (0-3) based on calculated metrics. Applies recovery bonuses.';
COMMENT ON FUNCTION record_trust_event IS 'Records a trust-affecting event and recalculates trust score. Returns event ID.';
COMMENT ON FUNCTION get_trust_improvement_guidance IS 'Returns actionable guidance for improving trust score. Transparent to user.';
