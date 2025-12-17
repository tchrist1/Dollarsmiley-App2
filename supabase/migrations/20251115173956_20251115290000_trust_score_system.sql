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
  tier_level integer NOT NULL,

  min_score numeric(4, 1) NOT NULL,
  max_score numeric(4, 1) NOT NULL,

  badge_color text,
  badge_icon text,
  badge_label text,

  benefits text[],
  features_unlocked text[],

  min_completed_jobs integer,
  min_positive_reviews integer,
  requires_id_verification boolean DEFAULT false,
  requires_background_check boolean DEFAULT false,

  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trust Scores (composite user trust scores)
CREATE TABLE IF NOT EXISTS trust_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  overall_score numeric(4, 1) NOT NULL DEFAULT 50.0,
  previous_score numeric(4, 1),
  score_trend text,

  trust_tier_id uuid REFERENCES trust_tiers(id),
  tier_level integer DEFAULT 1,

  verification_score numeric(4, 1) DEFAULT 0,
  review_score numeric(4, 1) DEFAULT 50.0,
  completion_score numeric(4, 1) DEFAULT 50.0,
  response_score numeric(4, 1) DEFAULT 50.0,
  reliability_score numeric(4, 1) DEFAULT 50.0,
  dispute_score numeric(4, 1) DEFAULT 100.0,
  tenure_score numeric(4, 1) DEFAULT 0,
  activity_score numeric(4, 1) DEFAULT 50.0,

  verification_weight numeric(3, 2) DEFAULT 0.20,
  review_weight numeric(3, 2) DEFAULT 0.20,
  completion_weight numeric(3, 2) DEFAULT 0.15,
  response_weight numeric(3, 2) DEFAULT 0.10,
  reliability_weight numeric(3, 2) DEFAULT 0.15,
  dispute_weight numeric(3, 2) DEFAULT 0.10,
  tenure_weight numeric(3, 2) DEFAULT 0.05,
  activity_weight numeric(3, 2) DEFAULT 0.05,

  last_calculated_at timestamptz DEFAULT now(),
  calculation_method text DEFAULT 'weighted_average',

  is_public boolean DEFAULT true,
  show_badge boolean DEFAULT true,

  metadata jsonb DEFAULT '{}',

  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Trust Score History (track changes over time)
CREATE TABLE IF NOT EXISTS trust_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  overall_score numeric(4, 1) NOT NULL,
  tier_level integer,

  verification_score numeric(4, 1),
  review_score numeric(4, 1),
  completion_score numeric(4, 1),
  response_score numeric(4, 1),
  reliability_score numeric(4, 1),
  dispute_score numeric(4, 1),
  tenure_score numeric(4, 1),
  activity_score numeric(4, 1),

  score_change numeric(5, 1),
  change_reason text,
  triggered_by text,

  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Trust Factors (detailed factor calculations)
CREATE TABLE IF NOT EXISTS trust_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  factor_key text NOT NULL,
  factor_name text NOT NULL,

  raw_value numeric,
  normalized_score numeric(4, 1),
  weight numeric(3, 2),

  calculation_formula text,
  data_points jsonb,

  is_active boolean DEFAULT true,

  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),

  UNIQUE(user_id, factor_key)
);

-- Verification History (verification audit trail)
CREATE TABLE IF NOT EXISTS verification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  verification_type text NOT NULL,

  verification_method text,
  verification_provider text,

  status text NOT NULL,

  verified_data jsonb,
  verification_document_url text,

  submitted_at timestamptz,
  verified_at timestamptz,
  expires_at timestamptz,

  verified_by uuid REFERENCES profiles(id),
  rejection_reason text,

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

-- Seed trust tiers
INSERT INTO trust_tiers (tier_key, tier_name, tier_level, min_score, max_score, badge_color, badge_label, benefits) VALUES
  ('newcomer', 'Newcomer', 1, 0.0, 39.9, '#9CA3AF', 'New', ARRAY['Basic marketplace access', 'Limited booking capacity']),
  ('trusted', 'Trusted', 2, 40.0, 59.9, '#3B82F6', 'Trusted', ARRAY['Standard booking capacity', 'Priority support access', 'Profile badge']),
  ('verified', 'Verified Pro', 3, 60.0, 74.9, '#8B5CF6', 'Verified', ARRAY['Enhanced visibility', 'Featured listings eligibility', 'Advanced analytics']),
  ('elite', 'Elite', 4, 75.0, 89.9, '#F59E0B', 'Elite', ARRAY['Top search placement', 'Premium support', 'Exclusive promotions', 'Lower fees']),
  ('legendary', 'Legendary', 5, 90.0, 100.0, '#10B981', 'Legendary', ARRAY['Maximum visibility', 'VIP support', 'Zero platform fees', 'Custom features'])
ON CONFLICT (tier_key) DO NOTHING;
