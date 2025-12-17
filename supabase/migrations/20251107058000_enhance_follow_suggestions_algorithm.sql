/*
  # Enhanced Follow Suggestions Algorithm

  1. Multi-Factor Ranking
    - Mutual followers (strongest signal)
    - Similar service categories/interests
    - Geographic proximity
    - Verification status
    - Activity level
    - Popular providers in user's area

  2. New Functions
    - get_enhanced_follow_suggestions() - Main algorithm
    - get_popular_providers_nearby() - Location-based
    - get_similar_interest_users() - Category-based

  3. Scoring System
    - Each factor contributes to a relevance score
    - Weighted combination determines ranking
    - Filters out already-following and self
*/

-- Enhanced follow suggestions with multi-factor scoring
CREATE OR REPLACE FUNCTION get_enhanced_follow_suggestions(
  p_user_id uuid,
  result_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  user_type text,
  is_verified boolean,
  followers_count integer,
  following_count integer,
  location_city text,
  location_state text,
  relevance_score numeric,
  mutual_followers_count bigint,
  shared_categories_count bigint,
  distance_km numeric,
  suggestion_reason text
) AS $$
BEGIN
  RETURN QUERY
  WITH user_location AS (
    -- Get current user's location
    SELECT
      p.location_city,
      p.location_state,
      p.latitude,
      p.longitude
    FROM profiles p
    WHERE p.id = p_user_id
  ),
  user_interests AS (
    -- Get categories user has interacted with (bookings, listings)
    SELECT DISTINCT category_id
    FROM (
      SELECT sl.category_id
      FROM service_listings sl
      WHERE sl.provider_id = p_user_id
      UNION
      SELECT b.category_id
      FROM bookings b
      WHERE b.customer_id = p_user_id
    ) categories
  ),
  mutual_followers AS (
    -- Count mutual followers for each candidate
    SELECT
      p.id as user_id,
      COUNT(DISTINCT uf2.follower_id) as mutual_count
    FROM profiles p
    JOIN user_follows uf1 ON p.id = uf1.follower_id
    JOIN user_follows uf2
      ON uf1.following_id = uf2.following_id
      AND uf2.follower_id IN (
        SELECT following_id FROM user_follows WHERE follower_id = p_user_id
      )
    WHERE p.id != p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM user_follows
        WHERE follower_id = p_user_id AND following_id = p.id
      )
    GROUP BY p.id
  ),
  shared_interests AS (
    -- Count shared category interests
    SELECT
      p.id as user_id,
      COUNT(DISTINCT sl.category_id) as shared_count
    FROM profiles p
    JOIN service_listings sl ON p.id = sl.provider_id
    WHERE sl.category_id IN (SELECT category_id FROM user_interests)
      AND p.id != p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM user_follows
        WHERE follower_id = p_user_id AND following_id = p.id
      )
    GROUP BY p.id
  ),
  location_proximity AS (
    -- Calculate distance for users in same area
    SELECT
      p.id as user_id,
      CASE
        WHEN ul.latitude IS NOT NULL AND ul.longitude IS NOT NULL
          AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        THEN
          6371 * acos(
            cos(radians(ul.latitude)) * cos(radians(p.latitude)) *
            cos(radians(p.longitude) - radians(ul.longitude)) +
            sin(radians(ul.latitude)) * sin(radians(p.latitude))
          )
        ELSE NULL
      END as distance
    FROM profiles p, user_location ul
    WHERE p.id != p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM user_follows
        WHERE follower_id = p_user_id AND following_id = p.id
      )
  ),
  candidate_scores AS (
    -- Calculate comprehensive relevance score
    SELECT
      p.id,
      p.full_name,
      p.avatar_url,
      p.user_type,
      p.is_verified,
      p.followers_count,
      p.following_count,
      p.location_city,
      p.location_state,
      COALESCE(mf.mutual_count, 0) as mutual_followers_count,
      COALESCE(si.shared_count, 0) as shared_categories_count,
      lp.distance as distance_km,
      -- Weighted scoring system
      (
        -- Mutual followers (highest weight: 50 points per mutual)
        COALESCE(mf.mutual_count, 0) * 50.0 +

        -- Shared interests (30 points per category)
        COALESCE(si.shared_count, 0) * 30.0 +

        -- Verification bonus (40 points)
        CASE WHEN p.is_verified THEN 40.0 ELSE 0.0 END +

        -- Provider type bonus (25 points for providers)
        CASE WHEN p.user_type = 'provider' THEN 25.0 ELSE 0.0 END +

        -- Popularity factor (logarithmic scale: 0-30 points)
        LEAST(30.0, LOG(1 + p.followers_count) * 3.0) +

        -- Location proximity (50 points if < 10km, 30 if < 50km, 10 if < 100km)
        CASE
          WHEN lp.distance IS NULL THEN 0.0
          WHEN lp.distance < 10 THEN 50.0
          WHEN lp.distance < 50 THEN 30.0
          WHEN lp.distance < 100 THEN 10.0
          ELSE 0.0
        END +

        -- Activity factor (recent posts in last 30 days: 0-20 points)
        LEAST(20.0, (
          SELECT COUNT(*)::numeric * 2.0
          FROM community_posts cp
          WHERE cp.author_id = p.id
            AND cp.created_at > NOW() - INTERVAL '30 days'
        )) +

        -- Same city bonus (15 points)
        CASE
          WHEN p.location_city = (SELECT location_city FROM user_location)
            AND p.location_state = (SELECT location_state FROM user_location)
          THEN 15.0
          ELSE 0.0
        END
      ) as relevance_score,
      -- Generate reason text
      CASE
        WHEN COALESCE(mf.mutual_count, 0) > 0
          THEN mf.mutual_count || ' mutual ' ||
            CASE WHEN mf.mutual_count = 1 THEN 'follower' ELSE 'followers' END
        WHEN COALESCE(si.shared_count, 0) > 0
          THEN 'Similar interests'
        WHEN lp.distance IS NOT NULL AND lp.distance < 10
          THEN 'Nearby provider'
        WHEN p.is_verified
          THEN 'Verified provider'
        WHEN p.followers_count > 100
          THEN 'Popular in your area'
        ELSE 'Suggested for you'
      END as suggestion_reason
    FROM profiles p
    LEFT JOIN mutual_followers mf ON p.id = mf.user_id
    LEFT JOIN shared_interests si ON p.id = si.user_id
    LEFT JOIN location_proximity lp ON p.id = lp.user_id
    WHERE p.id != p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM user_follows
        WHERE follower_id = p_user_id AND following_id = p.id
      )
      -- Filter out users with no activity (spam/inactive accounts)
      AND (
        p.followers_count > 0
        OR p.following_count > 0
        OR EXISTS (
          SELECT 1 FROM community_posts
          WHERE author_id = p.id
        )
      )
  )
  SELECT
    cs.id,
    cs.full_name,
    cs.avatar_url,
    cs.user_type,
    cs.is_verified,
    cs.followers_count,
    cs.following_count,
    cs.location_city,
    cs.location_state,
    ROUND(cs.relevance_score, 2) as relevance_score,
    cs.mutual_followers_count,
    cs.shared_categories_count,
    ROUND(cs.distance_km::numeric, 1) as distance_km,
    cs.suggestion_reason
  FROM candidate_scores cs
  WHERE cs.relevance_score > 0  -- Only suggest users with positive score
  ORDER BY cs.relevance_score DESC, cs.followers_count DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get popular providers nearby (location-based discovery)
CREATE OR REPLACE FUNCTION get_popular_providers_nearby(
  p_user_id uuid,
  radius_km numeric DEFAULT 50,
  result_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  user_type text,
  is_verified boolean,
  followers_count integer,
  average_rating numeric,
  total_reviews integer,
  distance_km numeric,
  top_category text
) AS $$
BEGIN
  RETURN QUERY
  WITH user_location AS (
    SELECT latitude, longitude
    FROM profiles
    WHERE id = p_user_id
  )
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.user_type,
    p.is_verified,
    p.followers_count,
    COALESCE(
      (SELECT AVG(rating) FROM reviews WHERE provider_id = p.id),
      0
    )::numeric(3,2) as average_rating,
    COALESCE(
      (SELECT COUNT(*)::integer FROM reviews WHERE provider_id = p.id),
      0
    ) as total_reviews,
    ROUND(
      (6371 * acos(
        cos(radians(ul.latitude)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(ul.longitude)) +
        sin(radians(ul.latitude)) * sin(radians(p.latitude))
      ))::numeric,
      1
    ) as distance_km,
    (
      SELECT c.name
      FROM service_listings sl
      JOIN categories c ON sl.category_id = c.id
      WHERE sl.provider_id = p.id
      GROUP BY c.id, c.name
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as top_category
  FROM profiles p, user_location ul
  WHERE p.id != p_user_id
    AND p.user_type = 'provider'
    AND p.is_verified = true
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND ul.latitude IS NOT NULL
    AND ul.longitude IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM user_follows
      WHERE follower_id = p_user_id AND following_id = p.id
    )
    -- Calculate distance and filter
    AND (
      6371 * acos(
        cos(radians(ul.latitude)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(ul.longitude)) +
        sin(radians(ul.latitude)) * sin(radians(p.latitude))
      )
    ) <= radius_km
  ORDER BY
    average_rating DESC,
    followers_count DESC,
    distance_km ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get users with similar interests based on categories
CREATE OR REPLACE FUNCTION get_similar_interest_users(
  p_user_id uuid,
  result_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  user_type text,
  is_verified boolean,
  followers_count integer,
  shared_categories_count bigint,
  shared_categories text[]
) AS $$
BEGIN
  RETURN QUERY
  WITH user_categories AS (
    -- Get categories from user's bookings and listings
    SELECT DISTINCT category_id
    FROM (
      SELECT sl.category_id
      FROM service_listings sl
      WHERE sl.provider_id = p_user_id
      UNION
      SELECT b.category_id
      FROM bookings b
      WHERE b.customer_id = p_user_id
    ) uc
  )
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.user_type,
    p.is_verified,
    p.followers_count,
    COUNT(DISTINCT sl.category_id) as shared_categories_count,
    ARRAY_AGG(DISTINCT c.name) as shared_categories
  FROM profiles p
  JOIN service_listings sl ON p.id = sl.provider_id
  JOIN categories c ON sl.category_id = c.id
  WHERE sl.category_id IN (SELECT category_id FROM user_categories)
    AND p.id != p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM user_follows
      WHERE follower_id = p_user_id AND following_id = p.id
    )
  GROUP BY p.id, p.full_name, p.avatar_url, p.user_type, p.is_verified, p.followers_count
  HAVING COUNT(DISTINCT sl.category_id) > 0
  ORDER BY shared_categories_count DESC, p.followers_count DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get trending providers in user's categories
CREATE OR REPLACE FUNCTION get_trending_providers_in_categories(
  p_user_id uuid,
  days_back integer DEFAULT 30,
  result_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  user_type text,
  is_verified boolean,
  followers_count integer,
  recent_bookings_count bigint,
  recent_posts_count bigint,
  trending_score numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH user_categories AS (
    SELECT DISTINCT category_id
    FROM (
      SELECT sl.category_id
      FROM service_listings sl
      WHERE sl.provider_id = p_user_id
      UNION
      SELECT b.category_id
      FROM bookings b
      WHERE b.customer_id = p_user_id
    ) uc
  )
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.user_type,
    p.is_verified,
    p.followers_count,
    COALESCE(
      (SELECT COUNT(*)
       FROM bookings b
       WHERE b.provider_id = p.id
         AND b.created_at > NOW() - (days_back || ' days')::interval
         AND b.status IN ('confirmed', 'completed')
      ), 0
    ) as recent_bookings_count,
    COALESCE(
      (SELECT COUNT(*)
       FROM community_posts cp
       WHERE cp.author_id = p.id
         AND cp.created_at > NOW() - (days_back || ' days')::interval
      ), 0
    ) as recent_posts_count,
    (
      -- Bookings in period (5 points each)
      COALESCE(
        (SELECT COUNT(*) * 5.0
         FROM bookings b
         WHERE b.provider_id = p.id
           AND b.created_at > NOW() - (days_back || ' days')::interval
           AND b.status IN ('confirmed', 'completed')
        ), 0
      ) +
      -- Posts in period (3 points each)
      COALESCE(
        (SELECT COUNT(*) * 3.0
         FROM community_posts cp
         WHERE cp.author_id = p.id
           AND cp.created_at > NOW() - (days_back || ' days')::interval
        ), 0
      ) +
      -- New followers in period (2 points each)
      COALESCE(
        (SELECT COUNT(*) * 2.0
         FROM user_follows uf
         WHERE uf.following_id = p.id
           AND uf.created_at > NOW() - (days_back || ' days')::interval
        ), 0
      )
    )::numeric as trending_score
  FROM profiles p
  WHERE p.user_type = 'provider'
    AND p.id != p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM user_follows
      WHERE follower_id = p_user_id AND following_id = p.id
    )
    AND EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.provider_id = p.id
        AND sl.category_id IN (SELECT category_id FROM user_categories)
    )
  ORDER BY trending_score DESC, p.followers_count DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_location
  ON profiles(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_verified_providers
  ON profiles(user_type, is_verified)
  WHERE user_type = 'provider' AND is_verified = true;

CREATE INDEX IF NOT EXISTS idx_community_posts_author_recent
  ON community_posts(author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_provider_recent
  ON bookings(provider_id, created_at DESC, status);

COMMENT ON FUNCTION get_enhanced_follow_suggestions IS
'Returns personalized follow suggestions using multi-factor scoring algorithm including mutual followers, shared interests, location proximity, verification status, and activity level';

COMMENT ON FUNCTION get_popular_providers_nearby IS
'Returns highly-rated verified providers within specified radius, ranked by rating and popularity';

COMMENT ON FUNCTION get_similar_interest_users IS
'Returns users who share category interests based on bookings and listings';

COMMENT ON FUNCTION get_trending_providers_in_categories IS
'Returns providers trending in user''s categories of interest based on recent bookings, posts, and follower growth';
