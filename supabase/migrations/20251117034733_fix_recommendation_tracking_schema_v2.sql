/*
  # Fix Recommendation Engine and Behavior Tracking Schema

  Fixes all schema mismatches causing errors in recommendation and tracking systems
*/

-- 1. Add user_id column to recommendation_cache
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recommendation_cache' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE recommendation_cache ADD COLUMN user_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
    UPDATE recommendation_cache SET user_id = profile_id WHERE user_id IS NULL;
    ALTER TABLE recommendation_cache ALTER COLUMN user_id SET NOT NULL;
    CREATE INDEX idx_recommendation_cache_user_id ON recommendation_cache(user_id);
  END IF;
END $$;

-- 2. Add app_version to user_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_sessions' AND column_name = 'app_version'
  ) THEN
    ALTER TABLE user_sessions ADD COLUMN app_version text;
  END IF;
END $$;

-- 3. Add device_info to user_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_events' AND column_name = 'device_info'
  ) THEN
    ALTER TABLE user_events ADD COLUMN device_info jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 4. Drop existing get_personalized_recommendations function
DROP FUNCTION IF EXISTS get_personalized_recommendations(uuid, text, integer);

-- 5. Create new function with correct signature matching app expectations
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
  p_limit integer DEFAULT 10,
  p_recommendation_type text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  image_url text,
  provider_id uuid,
  category_id uuid,
  rating numeric,
  relevance_score numeric
) AS $$
BEGIN
  IF p_user_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      l.id,
      l.name,
      l.description,
      l.price,
      l.image_url,
      l.provider_id,
      l.category_id,
      COALESCE(l.average_rating, 0) as rating,
      1.0 as relevance_score
    FROM recommendation_cache rc
    CROSS JOIN LATERAL unnest(rc.item_ids) WITH ORDINALITY AS t(item_id, ordinality)
    JOIN listings l ON l.id = t.item_id
    WHERE rc.user_id = p_user_id
    AND (p_recommendation_type IS NULL OR rc.recommendation_type = p_recommendation_type)
    AND rc.expires_at > now()
    AND l.status = 'Active'
    ORDER BY t.ordinality
    LIMIT p_limit;
    
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.description,
    l.price,
    l.image_url,
    l.provider_id,
    l.category_id,
    COALESCE(l.average_rating, 0) as rating,
    COALESCE(l.view_count::numeric / 100, 0) as relevance_score
  FROM listings l
  WHERE l.status = 'Active'
  ORDER BY l.view_count DESC NULLS LAST, l.average_rating DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create helper function for trending items
CREATE OR REPLACE FUNCTION get_trending_items_safe(
  p_item_type text DEFAULT 'listing',
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  image_url text,
  score numeric,
  interaction_count bigint
) AS $$
BEGIN
  IF p_item_type = 'listing' THEN
    RETURN QUERY
    SELECT 
      l.id,
      l.name,
      l.description,
      l.image_url,
      COALESCE(l.view_count::numeric, 0) as score,
      COALESCE(l.view_count, 0) as interaction_count
    FROM listings l
    WHERE l.status = 'Active'
    ORDER BY l.view_count DESC NULLS LAST, l.created_at DESC
    LIMIT p_limit;
  ELSIF p_item_type = 'job' THEN
    RETURN QUERY
    SELECT 
      j.id,
      j.title as name,
      j.description,
      NULL::text as image_url,
      0::numeric as score,
      0::bigint as interaction_count
    FROM jobs j
    WHERE j.status = 'Open'
    ORDER BY j.created_at DESC
    LIMIT p_limit;
  ELSE
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update RLS policies
DROP POLICY IF EXISTS "Users can view own cache" ON recommendation_cache;
DROP POLICY IF EXISTS "Users can insert own cache" ON recommendation_cache;
DROP POLICY IF EXISTS "Users can update own cache" ON recommendation_cache;

CREATE POLICY "Users can view own cache"
  ON recommendation_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = profile_id);

CREATE POLICY "Users can insert own cache"
  ON recommendation_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.uid() = profile_id);

CREATE POLICY "Users can update own cache"
  ON recommendation_cache FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = profile_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = profile_id);

-- 8. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_events_user_session ON user_events(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, last_active DESC);
