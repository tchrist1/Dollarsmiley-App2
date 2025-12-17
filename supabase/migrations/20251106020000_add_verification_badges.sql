/*
  # Verification Badges System

  1. New Tables
    - `verification_badges` - Available badge types
    - `profile_badges` - Badges earned by users

  2. Badge Types
    - Identity Verified - Government ID verified
    - Business Verified - Business license verified
    - Background Checked - Background check completed
    - Phone Verified - Phone number verified
    - Email Verified - Email address verified
    - Top Rated - 4.8+ rating with 20+ reviews
    - Elite Provider - Premium subscription + verified + 50+ bookings
    - Fast Responder - Responds within 1 hour average
    - Reliable - 95%+ completion rate
    - Professional - Business verified + insurance + certifications
    - Experienced - 100+ completed bookings
    - Recommended - 90%+ would recommend rate

  3. Features
    - Automatic badge awarding based on criteria
    - Manual admin-awarded badges
    - Badge display on profiles and listings
    - Badge verification dates
    - Badge descriptions and icons

  4. Security
    - RLS policies for badge access
    - Admin-only badge management
*/

-- Create verification_badges table
CREATE TABLE IF NOT EXISTS verification_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL,
  icon text,
  badge_color text DEFAULT '#0066FF',
  badge_type text NOT NULL CHECK (badge_type IN ('verification', 'achievement', 'status', 'premium')),
  criteria jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  can_auto_award boolean DEFAULT true,
  requires_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create profile_badges table
CREATE TABLE IF NOT EXISTS profile_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES verification_badges(id) ON DELETE CASCADE,
  awarded_at timestamptz DEFAULT now(),
  awarded_by uuid REFERENCES profiles(id),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES profiles(id),
  revoked_reason text,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  UNIQUE(profile_id, badge_id)
);

-- Enable RLS
ALTER TABLE verification_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification_badges
CREATE POLICY "Anyone can view active badges"
  ON verification_badges FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage badges"
  ON verification_badges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- RLS Policies for profile_badges
CREATE POLICY "Anyone can view active profile badges"
  ON profile_badges FOR SELECT
  USING (is_active = true AND revoked_at IS NULL);

CREATE POLICY "Admins can manage profile badges"
  ON profile_badges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_verification_badges_slug ON verification_badges(slug);
CREATE INDEX IF NOT EXISTS idx_verification_badges_type ON verification_badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_profile_badges_profile ON profile_badges(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_badges_badge ON profile_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_profile_badges_active ON profile_badges(is_active, revoked_at);

-- Insert default badge types
INSERT INTO verification_badges (name, slug, description, badge_type, badge_color, display_order, can_auto_award, requires_admin, criteria) VALUES
  (
    'Identity Verified',
    'identity-verified',
    'Government-issued ID has been verified',
    'verification',
    '#0066FF',
    1,
    false,
    true,
    '{"requires": ["id_verification"]}'
  ),
  (
    'Business Verified',
    'business-verified',
    'Business license and documentation verified',
    'verification',
    '#0066FF',
    2,
    false,
    true,
    '{"requires": ["business_verification"]}'
  ),
  (
    'Background Checked',
    'background-checked',
    'Successfully completed background check',
    'verification',
    '#0066FF',
    3,
    false,
    true,
    '{"requires": ["background_check"]}'
  ),
  (
    'Phone Verified',
    'phone-verified',
    'Phone number has been verified',
    'verification',
    '#10B981',
    4,
    true,
    false,
    '{"requires": ["phone_verified"]}'
  ),
  (
    'Email Verified',
    'email-verified',
    'Email address has been verified',
    'verification',
    '#10B981',
    5,
    true,
    false,
    '{"requires": ["email_verified"]}'
  ),
  (
    'Top Rated',
    'top-rated',
    'Maintains 4.8+ star rating with 20+ reviews',
    'achievement',
    '#F59E0B',
    10,
    true,
    false,
    '{"min_rating": 4.8, "min_reviews": 20}'
  ),
  (
    'Elite Provider',
    'elite-provider',
    'Premium member with verified status and 50+ bookings',
    'premium',
    '#8B5CF6',
    11,
    true,
    false,
    '{"subscription": "Premium", "verified": true, "min_bookings": 50}'
  ),
  (
    'Fast Responder',
    'fast-responder',
    'Responds to messages within 1 hour on average',
    'achievement',
    '#06B6D4',
    12,
    true,
    false,
    '{"max_response_time_hours": 1, "min_messages": 20}'
  ),
  (
    'Reliable',
    'reliable',
    'Maintains 95%+ booking completion rate',
    'achievement',
    '#10B981',
    13,
    true,
    false,
    '{"min_completion_rate": 95, "min_bookings": 10}'
  ),
  (
    'Professional',
    'professional',
    'Business verified with professional credentials',
    'status',
    '#3B82F6',
    14,
    false,
    true,
    '{"requires": ["business_verified", "insurance", "certifications"]}'
  ),
  (
    'Experienced',
    'experienced',
    'Completed 100+ successful bookings',
    'achievement',
    '#EC4899',
    15,
    true,
    false,
    '{"min_bookings": 100}'
  ),
  (
    'Recommended',
    'recommended',
    '90%+ customers would recommend',
    'achievement',
    '#F59E0B',
    16,
    true,
    false,
    '{"min_recommend_rate": 90, "min_reviews": 15}'
  )
ON CONFLICT (slug) DO NOTHING;

-- Function to award badge to profile
CREATE OR REPLACE FUNCTION award_badge(
  p_profile_id uuid,
  p_badge_slug text,
  p_awarded_by uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_badge_id uuid;
  v_profile_badge_id uuid;
BEGIN
  -- Get badge ID
  SELECT id INTO v_badge_id
  FROM verification_badges
  WHERE slug = p_badge_slug
  AND is_active = true;

  IF v_badge_id IS NULL THEN
    RAISE EXCEPTION 'Badge not found: %', p_badge_slug;
  END IF;

  -- Check if already awarded
  SELECT id INTO v_profile_badge_id
  FROM profile_badges
  WHERE profile_id = p_profile_id
  AND badge_id = v_badge_id;

  IF v_profile_badge_id IS NOT NULL THEN
    -- Reactivate if revoked
    UPDATE profile_badges
    SET
      is_active = true,
      revoked_at = NULL,
      revoked_by = NULL,
      revoked_reason = NULL,
      awarded_at = now()
    WHERE id = v_profile_badge_id;

    RETURN v_profile_badge_id;
  END IF;

  -- Award new badge
  INSERT INTO profile_badges (profile_id, badge_id, awarded_by)
  VALUES (p_profile_id, v_badge_id, p_awarded_by)
  RETURNING id INTO v_profile_badge_id;

  RETURN v_profile_badge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke badge from profile
CREATE OR REPLACE FUNCTION revoke_badge(
  p_profile_id uuid,
  p_badge_slug text,
  p_revoked_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_badge_id uuid;
BEGIN
  SELECT id INTO v_badge_id
  FROM verification_badges
  WHERE slug = p_badge_slug;

  IF v_badge_id IS NULL THEN
    RAISE EXCEPTION 'Badge not found: %', p_badge_slug;
  END IF;

  UPDATE profile_badges
  SET
    is_active = false,
    revoked_at = now(),
    revoked_by = p_revoked_by,
    revoked_reason = p_reason
  WHERE profile_id = p_profile_id
  AND badge_id = v_badge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and auto-award badges
CREATE OR REPLACE FUNCTION check_and_award_badges(p_profile_id uuid)
RETURNS void AS $$
DECLARE
  v_profile RECORD;
  v_ratings RECORD;
  v_completion_rate numeric;
BEGIN
  -- Get profile data
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_profile_id;

  -- Phone Verified
  IF v_profile.phone_verified THEN
    PERFORM award_badge(p_profile_id, 'phone-verified');
  END IF;

  -- Get rating data
  SELECT * INTO v_ratings
  FROM provider_ratings
  WHERE provider_id = p_profile_id;

  IF v_ratings.total_reviews IS NOT NULL THEN
    -- Top Rated (4.8+ rating, 20+ reviews)
    IF v_ratings.average_rating >= 4.8 AND v_ratings.total_reviews >= 20 THEN
      PERFORM award_badge(p_profile_id, 'top-rated');
    END IF;

    -- Recommended (90%+ would recommend, 15+ reviews)
    IF v_ratings.recommend_percentage >= 90 AND v_ratings.total_reviews >= 15 THEN
      PERFORM award_badge(p_profile_id, 'recommended');
    END IF;
  END IF;

  -- Experienced (100+ bookings)
  IF v_profile.total_bookings >= 100 THEN
    PERFORM award_badge(p_profile_id, 'experienced');
  END IF;

  -- Elite Provider (Premium + verified + 50+ bookings)
  IF v_profile.subscription_plan IN ('Premium', 'Elite')
     AND v_profile.is_verified = true
     AND v_profile.total_bookings >= 50 THEN
    PERFORM award_badge(p_profile_id, 'elite-provider');
  END IF;

  -- Calculate completion rate for Reliable badge
  IF v_profile.total_bookings >= 10 THEN
    SELECT
      ROUND((COUNT(*) FILTER (WHERE status = 'Completed')::numeric / COUNT(*)) * 100, 1)
      INTO v_completion_rate
    FROM bookings
    WHERE provider_id = p_profile_id;

    IF v_completion_rate >= 95 THEN
      PERFORM award_badge(p_profile_id, 'reliable');
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-award badges on profile update
CREATE OR REPLACE FUNCTION trigger_check_badges()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_and_award_badges(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_award_badges ON profiles;
CREATE TRIGGER trigger_auto_award_badges
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_badges();

-- Trigger to award identity verification badge
CREATE OR REPLACE FUNCTION award_identity_badge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
    PERFORM award_badge(NEW.provider_id, 'identity-verified');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_award_identity_verification ON provider_verification_requests;
CREATE TRIGGER trigger_award_identity_verification
  AFTER UPDATE ON provider_verification_requests
  FOR EACH ROW
  WHEN (NEW.status = 'Approved')
  EXECUTE FUNCTION award_identity_badge();

-- Function to get profile badges
CREATE OR REPLACE FUNCTION get_profile_badges(p_profile_id uuid)
RETURNS TABLE (
  badge_id uuid,
  name text,
  slug text,
  description text,
  badge_color text,
  badge_type text,
  awarded_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vb.id,
    vb.name,
    vb.slug,
    vb.description,
    vb.badge_color,
    vb.badge_type,
    pb.awarded_at
  FROM profile_badges pb
  JOIN verification_badges vb ON vb.id = pb.badge_id
  WHERE pb.profile_id = p_profile_id
  AND pb.is_active = true
  AND pb.revoked_at IS NULL
  AND vb.is_active = true
  ORDER BY vb.display_order ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get badge statistics
CREATE OR REPLACE FUNCTION get_badge_stats()
RETURNS TABLE (
  badge_slug text,
  badge_name text,
  total_awarded bigint,
  active_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vb.slug,
    vb.name,
    COUNT(pb.id)::bigint as total_awarded,
    COUNT(pb.id) FILTER (WHERE pb.is_active = true AND pb.revoked_at IS NULL)::bigint as active_count
  FROM verification_badges vb
  LEFT JOIN profile_badges pb ON pb.badge_id = vb.id
  WHERE vb.is_active = true
  GROUP BY vb.slug, vb.name, vb.display_order
  ORDER BY vb.display_order;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE verification_badges IS 'Defines available verification badges and achievements';
COMMENT ON TABLE profile_badges IS 'Tracks which badges each profile has earned';
COMMENT ON FUNCTION award_badge IS 'Awards a badge to a profile, reactivating if previously revoked';
COMMENT ON FUNCTION revoke_badge IS 'Revokes a badge from a profile with reason tracking';
COMMENT ON FUNCTION check_and_award_badges IS 'Automatically checks and awards eligible badges based on criteria';
COMMENT ON FUNCTION get_profile_badges IS 'Returns all active badges for a profile in display order';
COMMENT ON FUNCTION get_badge_stats IS 'Returns statistics about badge distribution';
