/*
  # Create Recommendation Database Functions

  1. Functions
    - `get_personalized_recommendations` - Get personalized recommendations for a user
    - Helper functions for recommendation algorithms
*/

-- Create function to get personalized recommendations
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
  p_limit integer DEFAULT 10,
  p_recommendation_type text DEFAULT 'providers',
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  item_id uuid,
  item_type text,
  score numeric,
  reason text
) AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user ID from auth context or parameter
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- If no user, return empty result
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- For providers recommendation type
  IF p_recommendation_type = 'providers' THEN
    RETURN QUERY
    SELECT 
      p.id as item_id,
      'provider'::text as item_type,
      COALESCE(
        (SELECT AVG(rating) FROM reviews WHERE provider_id = p.id),
        0
      ) as score,
      'Popular provider'::text as reason
    FROM profiles p
    WHERE p.user_type = 'provider'
      AND p.id != v_user_id
    ORDER BY score DESC
    LIMIT p_limit;
    
  -- For jobs recommendation type
  ELSIF p_recommendation_type = 'jobs' THEN
    RETURN QUERY
    SELECT 
      j.id as item_id,
      'job'::text as item_type,
      1.0::numeric as score,
      'Recent job'::text as reason
    FROM jobs j
    WHERE j.status = 'Open'
      AND j.customer_id != v_user_id
    ORDER BY j.created_at DESC
    LIMIT p_limit;
    
  -- For posts recommendation type
  ELSIF p_recommendation_type = 'posts' THEN
    RETURN QUERY
    SELECT 
      cp.id as item_id,
      'post'::text as item_type,
      (cp.like_count::numeric + cp.comment_count::numeric) as score,
      'Trending post'::text as reason
    FROM community_posts cp
    WHERE cp.user_id != v_user_id
      AND cp.status = 'published'
    ORDER BY score DESC
    LIMIT p_limit;
    
  -- For trending recommendation type
  ELSIF p_recommendation_type = 'trending' THEN
    RETURN QUERY
    SELECT 
      sl.id as item_id,
      'listing'::text as item_type,
      (sl.view_count::numeric + sl.booking_count::numeric * 5) as score,
      'Trending service'::text as reason
    FROM service_listings sl
    WHERE sl.status = 'Active'
    ORDER BY score DESC
    LIMIT p_limit;
    
  -- Default: return popular service listings
  ELSE
    RETURN QUERY
    SELECT 
      sl.id as item_id,
      'listing'::text as item_type,
      sl.booking_count::numeric as score,
      'Popular service'::text as reason
    FROM service_listings sl
    WHERE sl.status = 'Active'
    ORDER BY score DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;