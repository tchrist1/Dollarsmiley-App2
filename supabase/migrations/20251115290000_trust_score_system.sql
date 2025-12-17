/*
  # Trust Score System

  1. New Tables
    - `trust_scores` - Composite trust scores
    - `trust_score_history` - Score changes over time
    - `trust_factors` - Individual trust factor scores
    - `trust_tiers` - Trust tier definitions
    - `verification_history` - Verification tracking

  2. Features
    - Composite trust score (0-100)
    - Multiple trust factors
    - Historical tracking
    - Trust tiers
    - Decay mechanism
    - Public badges

  3. Security
    - Public read for scores
    - System updates only
*/

-- Trust Tiers (trust level definitions)
CREATE TABLE IF NOT EXISTS trust_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  tier_key text UNIQUE NOT NULL,
  tier_name text NOT NULL,
  tier_level integer NOT NULL, -- 1 (lowest) to 5 (highest)

  -- Score range
  min_score numeric(4, 1) NOT NULL,
  max_score numeric(4, 1) NOT NULL,

  -- Display
  badge_color text,
  badge_icon text,
  badge_label text,

  -- Benefits
  benefits text[],
  features_unlocked text[],

  -- Requirements
  min_completed_jobs integer,
  min_positive_reviews integer,
  requires_id_verification boolean DEFAULT false,
  requires_background_check boolean DEFAULT false,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trust Scores (composite user trust scores)
CREATE TABLE IF NOT EXISTS trust_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Overall score
  overall_score numeric(4, 1) NOT NULL DEFAULT 50.0, -- 0-100
  previous_score numeric(4, 1),
  score_trend text, -- increasing, decreasing, stable

  -- Trust tier
  trust_tier_id uuid REFERENCES trust_tiers(id),
  tier_level integer DEFAULT 1,

  -- Factor scores (0-100 each)
  verification_score numeric(4, 1) DEFAULT 0,
  review_score numeric(4, 1) DEFAULT 50.0,
  completion_score numeric(4, 1) DEFAULT 50.0,
  response_score numeric(4, 1) DEFAULT 50.0,
  reliability_score numeric(4, 1) DEFAULT 50.0,
  dispute_score numeric(4, 1) DEFAULT 100.0,
  tenure_score numeric(4, 1) DEFAULT 0,
  activity_score numeric(4, 1) DEFAULT 50.0,

  -- Factor weights (should sum to 1.0)
  verification_weight numeric(3, 2) DEFAULT 0.20,
  review_weight numeric(3, 2) DEFAULT 0.20,
  completion_weight numeric(3, 2) DEFAULT 0.15,
  response_weight numeric(3, 2) DEFAULT 0.10,
  reliability_weight numeric(3, 2) DEFAULT 0.15,
  dispute_weight numeric(3, 2) DEFAULT 0.10,
  tenure_weight numeric(3, 2) DEFAULT 0.05,
  activity_weight numeric(3, 2) DEFAULT 0.05,

  -- Calculation
  last_calculated_at timestamptz DEFAULT now(),
  calculation_method text DEFAULT 'weighted_average',

  -- Public visibility
  is_public boolean DEFAULT true,
  show_badge boolean DEFAULT true,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Trust Score History (track changes over time)
CREATE TABLE IF NOT EXISTS trust_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Score at this point
  overall_score numeric(4, 1) NOT NULL,
  tier_level integer,

  -- Individual factors
  verification_score numeric(4, 1),
  review_score numeric(4, 1),
  completion_score numeric(4, 1),
  response_score numeric(4, 1),
  reliability_score numeric(4, 1),
  dispute_score numeric(4, 1),
  tenure_score numeric(4, 1),
  activity_score numeric(4, 1),

  -- Change info
  score_change numeric(5, 1), -- Can be negative
  change_reason text,
  triggered_by text, -- review_received, job_completed, verification, dispute, etc.

  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Trust Factors (detailed factor calculations)
CREATE TABLE IF NOT EXISTS trust_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  factor_key text NOT NULL,
  factor_name text NOT NULL,

  -- Score
  raw_value numeric,
  normalized_score numeric(4, 1), -- 0-100
  weight numeric(3, 2),

  -- Calculation
  calculation_formula text,
  data_points jsonb,

  -- Status
  is_active boolean DEFAULT true,

  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),

  UNIQUE(user_id, factor_key)
);

-- Verification History (verification audit trail)
CREATE TABLE IF NOT EXISTS verification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Verification type
  verification_type text NOT NULL,
  -- Types: email, phone, id_card, drivers_license, passport, background_check, business_license

  verification_method text, -- manual, automated, third_party
  verification_provider text,

  -- Status
  status text NOT NULL,
  -- Statuses: pending, verified, rejected, expired

  -- Details
  verified_data jsonb,
  verification_document_url text,

  -- Timestamps
  submitted_at timestamptz,
  verified_at timestamptz,
  expires_at timestamptz,

  -- Reviewer
  verified_by uuid REFERENCES profiles(id),
  rejection_reason text,

  -- Impact on trust
  trust_score_impact numeric(4, 1),

  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trust_tiers_level ON trust_tiers(tier_level);
CREATE INDEX IF NOT EXISTS idx_trust_tiers_key ON trust_tiers(tier_key);

CREATE INDEX IF NOT EXISTS idx_trust_scores_user ON trust_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_scores_overall ON trust_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_trust_scores_tier ON trust_scores(trust_tier_id);
CREATE INDEX IF NOT EXISTS idx_trust_scores_public ON trust_scores(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_trust_history_user ON trust_score_history(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_trust_history_recorded ON trust_score_history(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_trust_factors_user ON trust_factors(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_factors_key ON trust_factors(factor_key);
CREATE INDEX IF NOT EXISTS idx_trust_factors_active ON trust_factors(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_verification_history_user ON verification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_type ON verification_history(verification_type);
CREATE INDEX IF NOT EXISTS idx_verification_history_status ON verification_history(status);

-- Enable RLS
ALTER TABLE trust_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view trust tiers"
  ON trust_tiers FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can view public trust scores"
  ON trust_scores FOR SELECT
  TO authenticated, anon
  USING (is_public = true);

CREATE POLICY "Users can view own trust score"
  ON trust_scores FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own history"
  ON trust_score_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own factors"
  ON trust_factors FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own verification history"
  ON verification_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function: Calculate verification score
CREATE OR REPLACE FUNCTION calculate_verification_score(user_id_param uuid)
RETURNS numeric AS $$
DECLARE
  score numeric := 0;
  verifications record;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE verification_type = 'email' AND status = 'verified') > 0 AS email_verified,
    COUNT(*) FILTER (WHERE verification_type = 'phone' AND status = 'verified') > 0 AS phone_verified,
    COUNT(*) FILTER (WHERE verification_type IN ('id_card', 'drivers_license', 'passport') AND status = 'verified') > 0 AS id_verified,
    COUNT(*) FILTER (WHERE verification_type = 'background_check' AND status = 'verified') > 0 AS bg_verified,
    COUNT(*) FILTER (WHERE verification_type = 'business_license' AND status = 'verified') > 0 AS business_verified
  INTO verifications
  FROM verification_history
  WHERE user_id = user_id_param
  AND (expires_at IS NULL OR expires_at > now());

  -- Email: 20 points
  IF verifications.email_verified THEN
    score := score + 20;
  END IF;

  -- Phone: 20 points
  IF verifications.phone_verified THEN
    score := score + 20;
  END IF;

  -- ID: 30 points
  IF verifications.id_verified THEN
    score := score + 30;
  END IF;

  -- Background check: 20 points
  IF verifications.bg_verified THEN
    score := score + 20;
  END IF;

  -- Business: 10 points
  IF verifications.business_verified THEN
    score := score + 10;
  END IF;

  RETURN LEAST(100, score);
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate review score
CREATE OR REPLACE FUNCTION calculate_review_score(user_id_param uuid)
RETURNS numeric AS $$
DECLARE
  avg_rating numeric;
  review_count integer;
  score numeric;
BEGIN
  SELECT
    AVG(rating)::numeric,
    COUNT(*)
  INTO avg_rating, review_count
  FROM reviews
  WHERE provider_id = user_id_param;

  IF review_count = 0 THEN
    RETURN 50.0; -- Neutral score
  END IF;

  -- Convert 5-star rating to 0-100 scale
  score := (avg_rating / 5.0) * 100;

  -- Adjust for sample size (reduce confidence with fewer reviews)
  IF review_count < 10 THEN
    score := 50 + (score - 50) * (review_count / 10.0);
  END IF;

  RETURN ROUND(score, 1);
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate completion score
CREATE OR REPLACE FUNCTION calculate_completion_score(user_id_param uuid)
RETURNS numeric AS $$
DECLARE
  total_bookings integer;
  completed_bookings integer;
  cancelled_bookings integer;
  score numeric;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled_by_provider')
  INTO total_bookings, completed_bookings, cancelled_bookings
  FROM bookings
  WHERE provider_id = user_id_param;

  IF total_bookings = 0 THEN
    RETURN 50.0; -- Neutral
  END IF;

  -- Completion rate
  score := (completed_bookings::numeric / total_bookings) * 100;

  -- Penalty for cancellations
  IF cancelled_bookings > 0 THEN
    score := score - (cancelled_bookings::numeric / total_bookings * 20);
  END IF;

  RETURN ROUND(GREATEST(0, LEAST(100, score)), 1);
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate dispute score
CREATE OR REPLACE FUNCTION calculate_dispute_score(user_id_param uuid)
RETURNS numeric AS $$
DECLARE
  total_disputes integer;
  resolved_favorably integer;
  score numeric;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE resolution_favors = 'provider')
  INTO total_disputes, resolved_favorably
  FROM disputes
  WHERE provider_id = user_id_param;

  IF total_disputes = 0 THEN
    RETURN 100.0; -- Perfect if no disputes
  END IF;

  -- Start at 100, reduce for each dispute
  score := 100 - (total_disputes * 10);

  -- Add back for favorable resolutions
  score := score + (resolved_favorably * 5);

  RETURN ROUND(GREATEST(0, LEAST(100, score)), 1);
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate tenure score
CREATE OR REPLACE FUNCTION calculate_tenure_score(user_id_param uuid)
RETURNS numeric AS $$
DECLARE
  account_age_days integer;
  score numeric;
BEGIN
  SELECT DATE_PART('day', now() - created_at)
  INTO account_age_days
  FROM profiles
  WHERE id = user_id_param;

  -- 0-30 days: 0-30 points
  -- 30-180 days: 30-60 points
  -- 180-365 days: 60-80 points
  -- 365+ days: 80-100 points

  IF account_age_days < 30 THEN
    score := account_age_days;
  ELSIF account_age_days < 180 THEN
    score := 30 + ((account_age_days - 30) / 150.0 * 30);
  ELSIF account_age_days < 365 THEN
    score := 60 + ((account_age_days - 180) / 185.0 * 20);
  ELSE
    score := 80 + LEAST(20, (account_age_days - 365) / 365.0 * 20);
  END IF;

  RETURN ROUND(score, 1);
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate overall trust score
CREATE OR REPLACE FUNCTION calculate_trust_score(user_id_param uuid)
RETURNS numeric AS $$
DECLARE
  verification_score_val numeric;
  review_score_val numeric;
  completion_score_val numeric;
  dispute_score_val numeric;
  tenure_score_val numeric;
  overall_score numeric;
  trust_score_record record;
BEGIN
  -- Calculate individual scores
  verification_score_val := calculate_verification_score(user_id_param);
  review_score_val := calculate_review_score(user_id_param);
  completion_score_val := calculate_completion_score(user_id_param);
  dispute_score_val := calculate_dispute_score(user_id_param);
  tenure_score_val := calculate_tenure_score(user_id_param);

  -- Get current weights
  SELECT * INTO trust_score_record
  FROM trust_scores
  WHERE user_id = user_id_param;

  IF NOT FOUND THEN
    -- Create new trust score record with defaults
    INSERT INTO trust_scores (user_id) VALUES (user_id_param);
    SELECT * INTO trust_score_record FROM trust_scores WHERE user_id = user_id_param;
  END IF;

  -- Calculate weighted average
  overall_score :=
    (verification_score_val * trust_score_record.verification_weight) +
    (review_score_val * trust_score_record.review_weight) +
    (completion_score_val * trust_score_record.completion_weight) +
    (dispute_score_val * trust_score_record.dispute_weight) +
    (tenure_score_val * trust_score_record.tenure_weight);

  -- Update trust score
  UPDATE trust_scores
  SET
    previous_score = overall_score,
    overall_score = ROUND(overall_score, 1),
    verification_score = verification_score_val,
    review_score = review_score_val,
    completion_score = completion_score_val,
    dispute_score = dispute_score_val,
    tenure_score = tenure_score_val,
    last_calculated_at = now(),
    updated_at = now()
  WHERE user_id = user_id_param;

  -- Record in history
  INSERT INTO trust_score_history (
    user_id,
    overall_score,
    verification_score,
    review_score,
    completion_score,
    dispute_score,
    tenure_score,
    score_change,
    change_reason
  ) VALUES (
    user_id_param,
    ROUND(overall_score, 1),
    verification_score_val,
    review_score_val,
    completion_score_val,
    dispute_score_val,
    tenure_score_val,
    ROUND(overall_score - COALESCE(trust_score_record.overall_score, 50.0), 1),
    'scheduled_calculation'
  );

  RETURN ROUND(overall_score, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update trust tier
CREATE OR REPLACE FUNCTION update_trust_tier(user_id_param uuid)
RETURNS void AS $$
DECLARE
  current_score numeric;
  new_tier record;
BEGIN
  SELECT overall_score INTO current_score
  FROM trust_scores
  WHERE user_id = user_id_param;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Find appropriate tier
  SELECT * INTO new_tier
  FROM trust_tiers
  WHERE current_score >= min_score
  AND current_score <= max_score
  ORDER BY tier_level DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE trust_scores
    SET
      trust_tier_id = new_tier.id,
      tier_level = new_tier.tier_level,
      updated_at = now()
    WHERE user_id = user_id_param;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_verification_score TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_review_score TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_completion_score TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_dispute_score TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_tenure_score TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_trust_score TO authenticated;
GRANT EXECUTE ON FUNCTION update_trust_tier TO authenticated;

-- Seed trust tiers
INSERT INTO trust_tiers (tier_key, tier_name, tier_level, min_score, max_score, badge_color, badge_label, benefits) VALUES
  ('newcomer', 'Newcomer', 1, 0.0, 39.9, '#9CA3AF', 'New', ARRAY['Basic marketplace access', 'Limited booking capacity']),
  ('trusted', 'Trusted', 2, 40.0, 59.9, '#3B82F6', 'Trusted', ARRAY['Standard booking capacity', 'Priority support access', 'Profile badge']),
  ('verified', 'Verified Pro', 3, 60.0, 74.9, '#8B5CF6', 'Verified', ARRAY['Enhanced visibility', 'Featured listings eligibility', 'Advanced analytics']),
  ('elite', 'Elite', 4, 75.0, 89.9, '#F59E0B', 'Elite', ARRAY['Top search placement', 'Premium support', 'Exclusive promotions', 'Lower fees']),
  ('legendary', 'Legendary', 5, 90.0, 100.0, '#10B981', 'Legendary', ARRAY['Maximum visibility', 'VIP support', 'Zero platform fees', 'Custom features'])
ON CONFLICT (tier_key) DO NOTHING;
