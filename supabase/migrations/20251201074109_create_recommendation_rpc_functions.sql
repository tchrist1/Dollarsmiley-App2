/*
  # Create Recommendation RPC Functions

  1. Functions
    - `record_user_interaction` - Record user interaction with items
    - `calculate_provider_similarity` - Calculate similar providers
    - `get_collaborative_recommendations` - Get collaborative filtering recommendations
    - `update_similarity_scores` - Update similarity scores for items
*/

-- Function to record user interaction
CREATE OR REPLACE FUNCTION record_user_interaction(
  p_user_id uuid,
  p_item_type text,
  p_item_id uuid,
  p_interaction_type text,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_interaction_id uuid;
  v_weight numeric := 1.0;
BEGIN
  -- Calculate interaction weight based on type
  v_weight := CASE p_interaction_type
    WHEN 'book' THEN 10.0
    WHEN 'review' THEN 8.0
    WHEN 'contact' THEN 5.0
    WHEN 'like' THEN 3.0
    WHEN 'bookmark' THEN 4.0
    WHEN 'share' THEN 5.0
    WHEN 'follow' THEN 6.0
    WHEN 'comment' THEN 4.0
    WHEN 'view' THEN 1.0
    ELSE 1.0
  END;

  -- Insert interaction
  INSERT INTO user_item_interactions (
    user_id,
    item_type,
    item_id,
    interaction_type,
    interaction_weight,
    metadata
  ) VALUES (
    p_user_id,
    p_item_type,
    p_item_id,
    p_interaction_type,
    v_weight,
    p_context
  )
  RETURNING id INTO v_interaction_id;

  RETURN v_interaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate provider similarity
CREATE OR REPLACE FUNCTION calculate_provider_similarity(
  p_provider_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  provider_id uuid,
  similarity_score numeric,
  common_categories integer
) AS $$
BEGIN
  RETURN QUERY
  WITH target_provider AS (
    SELECT 
      p.id,
      COALESCE(array_agg(DISTINCT sl.category_id), ARRAY[]::uuid[]) as categories
    FROM profiles p
    LEFT JOIN service_listings sl ON sl.provider_id = p.id AND sl.status = 'Active'
    WHERE p.id = p_provider_id
    GROUP BY p.id
  ),
  similar_providers AS (
    SELECT 
      p.id as provider_id,
      COALESCE(array_agg(DISTINCT sl.category_id), ARRAY[]::uuid[]) as categories,
      COALESCE(AVG(r.rating), 0) as avg_rating
    FROM profiles p
    LEFT JOIN service_listings sl ON sl.provider_id = p.id AND sl.status = 'Active'
    LEFT JOIN reviews r ON r.provider_id = p.id
    WHERE p.id != p_provider_id
      AND p.user_type = 'provider'
    GROUP BY p.id
  )
  SELECT 
    sp.provider_id,
    LEAST(
      (
        COALESCE(cardinality(tp.categories & sp.categories), 0)::numeric / 
        NULLIF(GREATEST(cardinality(tp.categories), cardinality(sp.categories)), 0)::numeric
      ) * 0.7 + sp.avg_rating / 5.0 * 0.3,
      1.0
    ) as similarity_score,
    COALESCE(cardinality(tp.categories & sp.categories), 0) as common_categories
  FROM similar_providers sp, target_provider tp
  WHERE cardinality(tp.categories & sp.categories) > 0
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get collaborative recommendations
CREATE OR REPLACE FUNCTION get_collaborative_recommendations(
  p_user_id uuid,
  p_recommendation_type text DEFAULT 'providers',
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  item_id uuid,
  item_type text,
  score numeric,
  reason text
) AS $$
BEGIN
  -- Find users with similar interaction patterns
  RETURN QUERY
  WITH similar_users AS (
    SELECT 
      uii2.user_id,
      COUNT(*) as common_interactions
    FROM user_item_interactions uii1
    JOIN user_item_interactions uii2 
      ON uii1.item_id = uii2.item_id 
      AND uii1.item_type = uii2.item_type
      AND uii2.user_id != p_user_id
    WHERE uii1.user_id = p_user_id
    GROUP BY uii2.user_id
    ORDER BY common_interactions DESC
    LIMIT 20
  ),
  recommendations AS (
    SELECT 
      uii.item_id,
      uii.item_type,
      SUM(uii.interaction_weight) as score
    FROM user_item_interactions uii
    JOIN similar_users su ON su.user_id = uii.user_id
    WHERE uii.item_id NOT IN (
      SELECT item_id 
      FROM user_item_interactions 
      WHERE user_id = p_user_id
    )
    GROUP BY uii.item_id, uii.item_type
    ORDER BY score DESC
    LIMIT p_limit
  )
  SELECT 
    r.item_id,
    r.item_type,
    r.score,
    'Users like you also liked this'::text as reason
  FROM recommendations r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update similarity scores
CREATE OR REPLACE FUNCTION update_similarity_scores(
  p_item_type text,
  p_batch_size integer DEFAULT 100
)
RETURNS integer AS $$
DECLARE
  v_updated_count integer := 0;
BEGIN
  -- This is a placeholder for batch updating similarity scores
  -- In production, this would use more sophisticated algorithms
  
  -- For now, just return 0
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;