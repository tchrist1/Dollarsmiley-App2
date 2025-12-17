/*
  # Create Similarity Scores Table

  Creates the similarity_scores table needed by recommendation engine
  for content-based and collaborative filtering
*/

-- Create similarity_scores table
CREATE TABLE IF NOT EXISTS similarity_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (item_type IN ('listing', 'job', 'post', 'provider')),
  item_id uuid NOT NULL,
  similar_item_id uuid NOT NULL,
  similarity_score numeric NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  algorithm text NOT NULL CHECK (algorithm IN ('content_based', 'collaborative', 'hybrid')),
  features jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(item_type, item_id, similar_item_id, algorithm)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_similarity_scores_item ON similarity_scores(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_similarity_scores_similar ON similarity_scores(item_type, similar_item_id);
CREATE INDEX IF NOT EXISTS idx_similarity_scores_score ON similarity_scores(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_similarity_scores_algorithm ON similarity_scores(algorithm);

-- Enable RLS
ALTER TABLE similarity_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policy - anyone can read similarity scores
CREATE POLICY "Anyone can view similarity scores"
  ON similarity_scores FOR SELECT
  TO authenticated
  USING (true);

-- Only system can update similarity scores
CREATE POLICY "System can manage similarity scores"
  ON similarity_scores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'Admin'
    )
  );

-- Function to update similarity scores for an item
CREATE OR REPLACE FUNCTION update_similarity_scores(
  p_item_type text,
  p_item_id uuid
)
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- For listings, calculate content-based similarity
  IF p_item_type = 'listing' THEN
    -- Delete old scores for this item
    DELETE FROM similarity_scores 
    WHERE item_type = p_item_type 
    AND item_id = p_item_id;
    
    -- Calculate similarity based on category and price
    INSERT INTO similarity_scores (
      item_type,
      item_id,
      similar_item_id,
      similarity_score,
      algorithm,
      features
    )
    SELECT 
      'listing',
      p_item_id,
      l.id,
      CASE 
        -- Same category = higher score
        WHEN l.category_id = source.category_id THEN 0.8
        -- Similar price range = medium score
        WHEN ABS(l.price - source.price) < (source.price * 0.3) THEN 0.6
        ELSE 0.4
      END as similarity_score,
      'content_based',
      jsonb_build_object(
        'same_category', l.category_id = source.category_id,
        'price_diff', ABS(l.price - source.price)
      )
    FROM listings source
    CROSS JOIN listings l
    WHERE source.id = p_item_id
    AND l.id != p_item_id
    AND l.status = 'Active'
    AND source.status = 'Active'
    LIMIT 20;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get similar items
CREATE OR REPLACE FUNCTION get_similar_items(
  p_item_type text,
  p_item_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  similarity_score numeric,
  algorithm text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.similar_item_id as id,
    ss.similarity_score,
    ss.algorithm
  FROM similarity_scores ss
  WHERE ss.item_type = p_item_type
  AND ss.item_id = p_item_id
  ORDER BY ss.similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_similarity_scores TO authenticated;
GRANT EXECUTE ON FUNCTION get_similar_items TO authenticated;

-- Add comments
COMMENT ON TABLE similarity_scores IS 'Stores pre-calculated similarity scores between items for recommendations';
COMMENT ON FUNCTION update_similarity_scores IS 'Updates similarity scores for a given item';
COMMENT ON FUNCTION get_similar_items IS 'Returns items similar to the given item';
