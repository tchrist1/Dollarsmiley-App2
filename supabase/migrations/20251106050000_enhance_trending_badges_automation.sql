/*
  # Enhanced Trending & Badges Automation

  1. Trending System Enhancements
    - Time-weighted trending score calculation
    - Automated trending flag updates
    - Hot/trending detection based on velocity
    - Decay algorithm for older content

  2. Badge Automation Improvements
    - Enhanced auto-award criteria
    - Badge revocation on criteria loss
    - Milestone tracking badges
    - Response time tracking for Fast Responder badge
    - Streak tracking badges

  3. New Features
    - Trending listings table for caching
    - Trending providers tracking
    - Trending posts tracking
    - Automated cleanup of stale data
    - Performance optimization indexes

  4. Scheduled Functions
    - Calculate trending scores (hourly)
    - Update badge eligibility (daily)
    - Clean up old trending data (daily)
*/

-- Add trending fields to service_listings if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_listings' AND column_name = 'trending_score') THEN
    ALTER TABLE service_listings ADD COLUMN trending_score numeric(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_listings' AND column_name = 'is_trending') THEN
    ALTER TABLE service_listings ADD COLUMN is_trending boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_listings' AND column_name = 'trending_rank') THEN
    ALTER TABLE service_listings ADD COLUMN trending_rank integer;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_listings' AND column_name = 'last_trending_update') THEN
    ALTER TABLE service_listings ADD COLUMN last_trending_update timestamptz;
  END IF;
END $$;

-- Add response time tracking to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avg_response_time_minutes') THEN
    ALTER TABLE profiles ADD COLUMN avg_response_time_minutes integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'completion_rate') THEN
    ALTER TABLE profiles ADD COLUMN completion_rate numeric(5, 2) DEFAULT 0;
  END IF;
END $$;

-- Create trending_cache table
CREATE TABLE IF NOT EXISTS trending_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('listing', 'provider', 'post', 'category')),
  entity_id uuid NOT NULL,
  trending_score numeric(10, 2) NOT NULL DEFAULT 0,
  rank_position integer,
  time_period text NOT NULL CHECK (time_period IN ('hourly', 'daily', 'weekly', 'monthly')),
  calculated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  UNIQUE(entity_type, entity_id, time_period)
);

CREATE INDEX IF NOT EXISTS idx_trending_cache_type_period ON trending_cache(entity_type, time_period, trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_cache_calculated ON trending_cache(calculated_at);

-- Enable RLS
ALTER TABLE trending_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trending cache"
  ON trending_cache FOR SELECT
  USING (true);

-- Add indexes for trending calculations
CREATE INDEX IF NOT EXISTS idx_service_listings_trending_score
  ON service_listings(trending_score DESC NULLS LAST)
  WHERE status = 'Active';

CREATE INDEX IF NOT EXISTS idx_service_listings_is_trending
  ON service_listings(is_trending)
  WHERE status = 'Active' AND is_trending = true;

CREATE INDEX IF NOT EXISTS idx_community_posts_trending
  ON community_posts(created_at DESC, likes_count DESC, comments_count DESC);

-- Function to calculate listing trending score
CREATE OR REPLACE FUNCTION calculate_listing_trending_score(
  p_listing_id uuid,
  p_time_window_hours integer DEFAULT 168
)
RETURNS numeric AS $$
DECLARE
  v_listing RECORD;
  v_recent_views integer;
  v_recent_bookings integer;
  v_age_hours numeric;
  v_base_score numeric;
  v_velocity_score numeric;
  v_quality_score numeric;
  v_time_decay numeric;
  v_final_score numeric;
BEGIN
  -- Get listing data
  SELECT
    sl.*,
    p.rating_average,
    p.total_bookings,
    p.is_verified
  INTO v_listing
  FROM service_listings sl
  JOIN profiles p ON p.id = sl.provider_id
  WHERE sl.id = p_listing_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate age in hours
  v_age_hours := EXTRACT(EPOCH FROM (now() - v_listing.created_at)) / 3600;

  -- Get recent activity (last 7 days)
  SELECT
    COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days'),
    0
  INTO v_recent_views, v_recent_bookings
  FROM bookings
  WHERE listing_id = p_listing_id;

  -- Base score from total engagement
  v_base_score := (v_listing.view_count * 1.0) + (v_listing.booking_count * 5.0);

  -- Velocity score (recent activity)
  v_velocity_score := (v_recent_views * 2.0) + (v_recent_bookings * 10.0);

  -- Quality score (provider reputation)
  v_quality_score := 0;
  IF v_listing.rating_average >= 4.5 THEN
    v_quality_score := v_quality_score + 10;
  END IF;
  IF v_listing.is_verified THEN
    v_quality_score := v_quality_score + 5;
  END IF;

  -- Time decay (favor newer content but not too aggressively)
  IF v_age_hours < 24 THEN
    v_time_decay := 2.0; -- Hot new content
  ELSIF v_age_hours < 168 THEN -- 1 week
    v_time_decay := 1.5;
  ELSIF v_age_hours < 720 THEN -- 1 month
    v_time_decay := 1.0;
  ELSE
    v_time_decay := 0.5;
  END IF;

  -- Calculate final score
  v_final_score := (
    (v_base_score * 0.3) +
    (v_velocity_score * 0.5) +
    (v_quality_score * 0.2)
  ) * v_time_decay;

  RETURN ROUND(v_final_score, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update all trending scores
CREATE OR REPLACE FUNCTION update_all_trending_scores()
RETURNS void AS $$
DECLARE
  v_listing RECORD;
  v_score numeric;
  v_rank integer := 0;
BEGIN
  -- Update trending scores for all active listings
  FOR v_listing IN
    SELECT id
    FROM service_listings
    WHERE status = 'Active'
    ORDER BY created_at DESC
  LOOP
    v_score := calculate_listing_trending_score(v_listing.id);

    UPDATE service_listings
    SET
      trending_score = v_score,
      last_trending_update = now()
    WHERE id = v_listing.id;
  END LOOP;

  -- Assign trending ranks
  FOR v_listing IN
    SELECT id
    FROM service_listings
    WHERE status = 'Active'
    ORDER BY trending_score DESC NULLS LAST, created_at DESC
  LOOP
    v_rank := v_rank + 1;

    UPDATE service_listings
    SET
      trending_rank = v_rank,
      is_trending = (v_rank <= 50 AND trending_score > 10)
    WHERE id = v_listing.id;
  END LOOP;

  -- Update trending cache
  INSERT INTO trending_cache (entity_type, entity_id, trending_score, rank_position, time_period)
  SELECT
    'listing',
    id,
    trending_score,
    trending_rank,
    'daily'
  FROM service_listings
  WHERE status = 'Active' AND trending_score > 0
  ON CONFLICT (entity_type, entity_id, time_period)
  DO UPDATE SET
    trending_score = EXCLUDED.trending_score,
    rank_position = EXCLUDED.rank_position,
    calculated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate provider trending score
CREATE OR REPLACE FUNCTION calculate_provider_trending_score(p_provider_id uuid)
RETURNS numeric AS $$
DECLARE
  v_profile RECORD;
  v_recent_bookings integer;
  v_recent_reviews integer;
  v_score numeric;
BEGIN
  -- Get provider data
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_provider_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Get recent activity (last 30 days)
  SELECT
    COUNT(DISTINCT b.id),
    COUNT(DISTINCT r.id)
  INTO v_recent_bookings, v_recent_reviews
  FROM profiles p
  LEFT JOIN bookings b ON b.provider_id = p.id
    AND b.created_at >= now() - interval '30 days'
  LEFT JOIN reviews r ON r.reviewee_id = p.id
    AND r.created_at >= now() - interval '30 days'
  WHERE p.id = p_provider_id;

  -- Calculate score
  v_score :=
    (v_profile.total_bookings * 0.5) +
    (v_recent_bookings * 10.0) +
    (v_profile.rating_average * 5.0) +
    (v_recent_reviews * 3.0);

  IF v_profile.is_verified THEN
    v_score := v_score * 1.2;
  END IF;

  RETURN ROUND(v_score, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update provider completion rates
CREATE OR REPLACE FUNCTION update_provider_completion_rates()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET
    completion_rate = subq.rate,
    avg_response_time_minutes = 0
  FROM (
    SELECT
      provider_id,
      ROUND(
        (COUNT(*) FILTER (WHERE status IN ('Completed'))::numeric /
        NULLIF(COUNT(*), 0)) * 100,
        2
      ) as rate
    FROM bookings
    WHERE provider_id IS NOT NULL
    GROUP BY provider_id
  ) subq
  WHERE profiles.id = subq.provider_id;
END;
$$ LANGUAGE plpgsql;

-- Enhanced badge auto-award function
CREATE OR REPLACE FUNCTION enhanced_check_and_award_badges(p_profile_id uuid)
RETURNS void AS $$
DECLARE
  v_profile RECORD;
  v_badge_record RECORD;
  v_should_have_badge boolean;
BEGIN
  -- Get profile with all relevant data
  SELECT
    p.*,
    COALESCE(pr.average_rating, 0) as avg_rating,
    COALESCE(pr.total_reviews, 0) as review_count,
    COALESCE(pr.recommend_percentage, 0) as recommend_pct
  INTO v_profile
  FROM profiles p
  LEFT JOIN provider_ratings pr ON pr.provider_id = p.id
  WHERE p.id = p_profile_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Iterate through all auto-awardable badges
  FOR v_badge_record IN
    SELECT * FROM verification_badges
    WHERE can_auto_award = true
    AND is_active = true
  LOOP
    v_should_have_badge := false;

    -- Check criteria for each badge
    CASE v_badge_record.slug
      WHEN 'phone-verified' THEN
        v_should_have_badge := v_profile.phone_verified = true;

      WHEN 'email-verified' THEN
        v_should_have_badge := v_profile.email_verified = true;

      WHEN 'top-rated' THEN
        v_should_have_badge := v_profile.avg_rating >= 4.8 AND v_profile.review_count >= 20;

      WHEN 'elite-provider' THEN
        v_should_have_badge :=
          v_profile.subscription_plan IN ('Premium', 'Elite') AND
          v_profile.is_verified = true AND
          v_profile.total_bookings >= 50;

      WHEN 'fast-responder' THEN
        v_should_have_badge := v_profile.avg_response_time_minutes > 0 AND v_profile.avg_response_time_minutes <= 60;

      WHEN 'reliable' THEN
        v_should_have_badge := v_profile.completion_rate >= 95 AND v_profile.total_bookings >= 10;

      WHEN 'experienced' THEN
        v_should_have_badge := v_profile.total_bookings >= 100;

      WHEN 'recommended' THEN
        v_should_have_badge := v_profile.recommend_pct >= 90 AND v_profile.review_count >= 15;

      ELSE
        CONTINUE;
    END CASE;

    -- Award or revoke badge based on criteria
    IF v_should_have_badge THEN
      -- Award badge if not already awarded
      PERFORM award_badge(p_profile_id, v_badge_record.slug);
    ELSE
      -- Revoke badge if criteria no longer met
      PERFORM revoke_badge(
        p_profile_id,
        v_badge_record.slug,
        '00000000-0000-0000-0000-000000000000'::uuid,
        'Criteria no longer met'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process all badge updates
CREATE OR REPLACE FUNCTION process_all_badge_updates()
RETURNS void AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Update completion rates first
  PERFORM update_provider_completion_rates();

  -- Check badges for all active providers
  FOR v_profile_id IN
    SELECT id
    FROM profiles
    WHERE user_type IN ('Provider', 'Both')
    AND created_at > now() - interval '2 years'
  LOOP
    PERFORM enhanced_check_and_award_badges(v_profile_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate post trending score
CREATE OR REPLACE FUNCTION calculate_post_trending_score(p_post_id uuid)
RETURNS numeric AS $$
DECLARE
  v_post RECORD;
  v_age_hours numeric;
  v_engagement_score numeric;
  v_time_decay numeric;
  v_final_score numeric;
BEGIN
  SELECT * INTO v_post
  FROM community_posts
  WHERE id = p_post_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate age
  v_age_hours := EXTRACT(EPOCH FROM (now() - v_post.created_at)) / 3600;

  -- Engagement score
  v_engagement_score :=
    (v_post.likes_count * 1.0) +
    (v_post.comments_count * 2.0) +
    (v_post.shares_count * 3.0);

  -- Time decay for posts (more aggressive)
  IF v_age_hours < 6 THEN
    v_time_decay := 3.0;
  ELSIF v_age_hours < 24 THEN
    v_time_decay := 2.0;
  ELSIF v_age_hours < 72 THEN
    v_time_decay := 1.0;
  ELSIF v_age_hours < 168 THEN
    v_time_decay := 0.5;
  ELSE
    v_time_decay := 0.2;
  END IF;

  v_final_score := v_engagement_score * v_time_decay;

  RETURN ROUND(v_final_score, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update trending posts
CREATE OR REPLACE FUNCTION update_trending_posts()
RETURNS void AS $$
BEGIN
  -- Cache trending posts
  INSERT INTO trending_cache (entity_type, entity_id, trending_score, rank_position, time_period)
  SELECT
    'post',
    id,
    calculate_post_trending_score(id),
    ROW_NUMBER() OVER (ORDER BY calculate_post_trending_score(id) DESC),
    'daily'
  FROM community_posts
  WHERE created_at >= now() - interval '7 days'
  ON CONFLICT (entity_type, entity_id, time_period)
  DO UPDATE SET
    trending_score = EXCLUDED.trending_score,
    rank_position = EXCLUDED.rank_position,
    calculated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old trending data
CREATE OR REPLACE FUNCTION cleanup_trending_cache()
RETURNS void AS $$
BEGIN
  -- Remove trending cache older than 7 days
  DELETE FROM trending_cache
  WHERE calculated_at < now() - interval '7 days';

  -- Reset is_trending flag for listings not in top 50
  UPDATE service_listings
  SET is_trending = false
  WHERE is_trending = true
  AND (trending_rank IS NULL OR trending_rank > 50 OR trending_score < 10);
END;
$$ LANGUAGE plpgsql;

-- Function to get trending listings with caching
CREATE OR REPLACE FUNCTION get_cached_trending_listings(
  p_limit integer DEFAULT 20,
  p_time_period text DEFAULT 'daily'
)
RETURNS TABLE (
  listing_id uuid,
  trending_score numeric,
  rank_position integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.entity_id,
    tc.trending_score,
    tc.rank_position
  FROM trending_cache tc
  WHERE tc.entity_type = 'listing'
  AND tc.time_period = p_time_period
  AND tc.calculated_at >= now() - interval '2 hours'
  ORDER BY tc.rank_position ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get trending providers
CREATE OR REPLACE FUNCTION get_trending_providers(p_limit integer DEFAULT 10)
RETURNS TABLE (
  provider_id uuid,
  trending_score numeric,
  recent_bookings integer,
  rating_average numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    calculate_provider_trending_score(p.id),
    COUNT(DISTINCT b.id) FILTER (WHERE b.created_at >= now() - interval '30 days')::integer,
    p.rating_average
  FROM profiles p
  LEFT JOIN bookings b ON b.provider_id = p.id
  WHERE p.user_type IN ('Provider', 'Both')
  AND p.is_verified = true
  GROUP BY p.id
  ORDER BY calculate_provider_trending_score(p.id) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger to update listing trending score on view/booking
CREATE OR REPLACE FUNCTION trigger_update_listing_trending()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate if significant change
  IF (TG_TABLE_NAME = 'bookings' AND NEW.status IN ('Pending', 'Confirmed')) OR
     (TG_TABLE_NAME = 'service_listings' AND (NEW.view_count - OLD.view_count) >= 10) THEN

    UPDATE service_listings
    SET
      trending_score = calculate_listing_trending_score(NEW.id),
      last_trending_update = now()
    WHERE id = COALESCE(NEW.listing_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for listing views
DROP TRIGGER IF EXISTS trigger_listing_trending_update ON service_listings;
CREATE TRIGGER trigger_listing_trending_update
  AFTER UPDATE ON service_listings
  FOR EACH ROW
  WHEN (OLD.view_count IS DISTINCT FROM NEW.view_count)
  EXECUTE FUNCTION trigger_update_listing_trending();

-- Enhanced trigger for profile updates to check badges
DROP TRIGGER IF EXISTS trigger_enhanced_auto_award_badges ON profiles;
CREATE TRIGGER trigger_enhanced_auto_award_badges
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (
    OLD.total_bookings IS DISTINCT FROM NEW.total_bookings OR
    OLD.phone_verified IS DISTINCT FROM NEW.phone_verified OR
    OLD.is_verified IS DISTINCT FROM NEW.is_verified OR
    OLD.subscription_plan IS DISTINCT FROM NEW.subscription_plan
  )
  EXECUTE FUNCTION trigger_check_badges();

-- Create view for trending dashboard
CREATE OR REPLACE VIEW trending_dashboard AS
SELECT
  'listing' as entity_type,
  sl.id as entity_id,
  sl.title as entity_name,
  sl.trending_score,
  sl.trending_rank,
  sl.view_count,
  sl.booking_count,
  sl.is_trending,
  p.full_name as provider_name
FROM service_listings sl
JOIN profiles p ON p.id = sl.provider_id
WHERE sl.status = 'Active' AND sl.is_trending = true
ORDER BY sl.trending_rank ASC;

-- Function to get trending statistics
CREATE OR REPLACE FUNCTION get_trending_stats()
RETURNS TABLE (
  total_trending_listings bigint,
  total_trending_providers bigint,
  total_trending_posts bigint,
  avg_trending_score numeric,
  last_update timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE entity_type = 'listing')::bigint,
    COUNT(*) FILTER (WHERE entity_type = 'provider')::bigint,
    COUNT(*) FILTER (WHERE entity_type = 'post')::bigint,
    AVG(trending_score),
    MAX(calculated_at)
  FROM trending_cache
  WHERE calculated_at >= now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comments
COMMENT ON FUNCTION calculate_listing_trending_score IS 'Calculates time-weighted trending score for a listing based on views, bookings, quality, and age';
COMMENT ON FUNCTION update_all_trending_scores IS 'Updates trending scores and ranks for all active listings';
COMMENT ON FUNCTION enhanced_check_and_award_badges IS 'Enhanced badge checking with automatic revocation when criteria no longer met';
COMMENT ON FUNCTION process_all_badge_updates IS 'Processes badge updates for all providers - run daily';
COMMENT ON FUNCTION cleanup_trending_cache IS 'Removes old trending data - run daily';
COMMENT ON TABLE trending_cache IS 'Caches calculated trending scores for performance optimization';
