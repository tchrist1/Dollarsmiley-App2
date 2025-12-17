/*
  # Auto-Initialize Trust Scores and Regional Data

  1. New Features
    - Trigger to create trust score on profile creation
    - Trigger to create regional preferences on profile creation
    - Function to initialize trust score
    - Backfill existing profiles

  2. Security
    - Maintain RLS policies
*/

-- Function to initialize trust score for a user
CREATE OR REPLACE FUNCTION initialize_trust_score(user_id_param uuid)
RETURNS uuid AS $$
DECLARE
  trust_score_id uuid;
  newcomer_tier_id uuid;
BEGIN
  -- Get newcomer tier
  SELECT id INTO newcomer_tier_id
  FROM trust_tiers
  WHERE tier_key = 'newcomer'
  LIMIT 1;

  -- Create trust score if doesn't exist
  INSERT INTO trust_scores (
    user_id,
    overall_score,
    trust_tier_id,
    tier_level,
    verification_score,
    review_score,
    completion_score,
    response_score,
    reliability_score,
    dispute_score,
    tenure_score,
    activity_score,
    is_public,
    show_badge
  ) VALUES (
    user_id_param,
    50.0, -- Starting score
    newcomer_tier_id,
    1,
    0.0,
    50.0,
    50.0,
    50.0,
    50.0,
    100.0,
    0.0,
    50.0,
    true,
    true
  )
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO trust_score_id;

  -- Record initial history
  IF trust_score_id IS NOT NULL THEN
    INSERT INTO trust_score_history (
      user_id,
      overall_score,
      tier_level,
      score_change,
      change_reason,
      triggered_by
    ) VALUES (
      user_id_param,
      50.0,
      1,
      0,
      'Initial trust score',
      'system'
    );
  END IF;

  RETURN trust_score_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize regional preferences
CREATE OR REPLACE FUNCTION initialize_regional_preferences(user_id_param uuid)
RETURNS uuid AS $$
DECLARE
  pref_id uuid;
  user_region_code text;
  default_region_id uuid;
BEGIN
  -- Get user's region from profile
  SELECT region_code INTO user_region_code
  FROM profiles
  WHERE id = user_id_param;

  -- Get region id
  IF user_region_code IS NOT NULL THEN
    SELECT id INTO default_region_id
    FROM regions
    WHERE region_code = user_region_code
    LIMIT 1;
  END IF;

  -- Default to US if no region
  IF default_region_id IS NULL THEN
    SELECT id INTO default_region_id
    FROM regions
    WHERE region_code = 'US'
    LIMIT 1;
  END IF;

  -- Create preferences
  INSERT INTO user_regional_preferences (
    user_id,
    preferred_region_id,
    preferred_currency,
    preferred_language,
    auto_detect_region,
    auto_detect_currency,
    auto_detect_language
  )
  SELECT
    user_id_param,
    default_region_id,
    COALESCE(p.preferred_currency, 'USD'),
    'en',
    true,
    true,
    true
  FROM profiles p
  WHERE p.id = user_id_param
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO pref_id;

  RETURN pref_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for new profiles
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize trust score
  PERFORM initialize_trust_score(NEW.id);
  
  -- Initialize regional preferences
  PERFORM initialize_regional_preferences(NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_profile();

-- Backfill existing profiles
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT id FROM profiles 
    WHERE NOT EXISTS (
      SELECT 1 FROM trust_scores WHERE user_id = profiles.id
    )
  LOOP
    PERFORM initialize_trust_score(profile_record.id);
    PERFORM initialize_regional_preferences(profile_record.id);
  END LOOP;
END $$;

-- Function to update trust score based on user activity
CREATE OR REPLACE FUNCTION calculate_user_trust_score(user_id_param uuid)
RETURNS numeric AS $$
DECLARE
  new_score numeric;
  verification_score numeric := 0;
  review_score numeric := 50;
  completion_score numeric := 50;
  response_score numeric := 50;
  reliability_score numeric := 50;
  dispute_score numeric := 100;
  tenure_score numeric := 0;
  activity_score numeric := 50;
  
  completed_bookings integer;
  total_bookings integer;
  avg_rating numeric;
  dispute_count integer;
  days_since_join integer;
  verification_count integer;
BEGIN
  -- Get verification score
  SELECT COUNT(*) INTO verification_count
  FROM verification_history
  WHERE user_id = user_id_param
  AND status = 'verified';

  verification_score := LEAST(verification_count * 20, 100);

  -- Get review score
  SELECT AVG(rating) INTO avg_rating
  FROM reviews
  WHERE provider_id = user_id_param;

  IF avg_rating IS NOT NULL THEN
    review_score := (avg_rating / 5.0) * 100;
  END IF;

  -- Get completion score
  SELECT 
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*)
  INTO completed_bookings, total_bookings
  FROM bookings
  WHERE provider_id = user_id_param;

  IF total_bookings > 0 THEN
    completion_score := (completed_bookings::numeric / total_bookings) * 100;
  END IF;

  -- Get dispute score
  SELECT COUNT(*) INTO dispute_count
  FROM disputes
  WHERE provider_id = user_id_param
  AND resolution = 'provider_fault';

  dispute_score := GREATEST(100 - (dispute_count * 20), 0);

  -- Get tenure score
  SELECT EXTRACT(DAY FROM (now() - created_at)) INTO days_since_join
  FROM profiles
  WHERE id = user_id_param;

  tenure_score := LEAST((days_since_join / 365.0) * 100, 100);

  -- Calculate weighted average
  new_score := (
    verification_score * 0.20 +
    review_score * 0.20 +
    completion_score * 0.15 +
    response_score * 0.10 +
    reliability_score * 0.15 +
    dispute_score * 0.10 +
    tenure_score * 0.05 +
    activity_score * 0.05
  );

  -- Update trust score
  UPDATE trust_scores SET
    overall_score = new_score,
    verification_score = verification_score,
    review_score = review_score,
    completion_score = completion_score,
    response_score = response_score,
    reliability_score = reliability_score,
    dispute_score = dispute_score,
    tenure_score = tenure_score,
    activity_score = activity_score,
    last_calculated_at = now(),
    trust_tier_id = (
      SELECT id FROM trust_tiers
      WHERE new_score >= min_score AND new_score <= max_score
      LIMIT 1
    ),
    tier_level = (
      SELECT tier_level FROM trust_tiers
      WHERE new_score >= min_score AND new_score <= max_score
      LIMIT 1
    )
  WHERE user_id = user_id_param;

  -- Record history
  INSERT INTO trust_score_history (
    user_id, overall_score, tier_level,
    verification_score, review_score, completion_score,
    response_score, reliability_score, dispute_score,
    tenure_score, activity_score,
    change_reason, triggered_by
  ) VALUES (
    user_id_param, new_score,
    (SELECT tier_level FROM trust_tiers WHERE new_score >= min_score AND new_score <= max_score LIMIT 1),
    verification_score, review_score, completion_score,
    response_score, reliability_score, dispute_score,
    tenure_score, activity_score,
    'Automated calculation', 'system'
  );

  RETURN new_score;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION initialize_trust_score TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_regional_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_trust_score TO authenticated;

COMMENT ON FUNCTION initialize_trust_score IS 'Initialize trust score for new users';
COMMENT ON FUNCTION initialize_regional_preferences IS 'Initialize regional preferences for new users';
COMMENT ON FUNCTION calculate_user_trust_score IS 'Calculate trust score based on user activity';
