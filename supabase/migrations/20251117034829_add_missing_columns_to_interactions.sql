/*
  # Add Missing Columns to User Item Interactions

  Adds missing columns expected by recommendation engine:
  - user_id (alias for profile_id)
  - interaction_weight (for scoring interactions)
  - timestamp (for time-based queries)
  - context (for additional metadata)
*/

-- 1. Add user_id column (alias for profile_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_item_interactions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE user_item_interactions ADD COLUMN user_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
    UPDATE user_item_interactions SET user_id = profile_id WHERE user_id IS NULL;
    ALTER TABLE user_item_interactions ALTER COLUMN user_id SET NOT NULL;
    CREATE INDEX idx_user_item_interactions_user_id ON user_item_interactions(user_id);
  END IF;
END $$;

-- 2. Add interaction_weight column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_item_interactions' AND column_name = 'interaction_weight'
  ) THEN
    ALTER TABLE user_item_interactions ADD COLUMN interaction_weight numeric DEFAULT 1.0;
    
    -- Set weights based on interaction type
    UPDATE user_item_interactions 
    SET interaction_weight = CASE interaction_type
      WHEN 'book' THEN 10.0
      WHEN 'contact' THEN 5.0
      WHEN 'like' THEN 3.0
      WHEN 'bookmark' THEN 3.0
      WHEN 'share' THEN 2.0
      WHEN 'view' THEN 1.0
      ELSE 1.0
    END
    WHERE interaction_weight = 1.0;
  END IF;
END $$;

-- 3. Add timestamp column (alias for created_at)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_item_interactions' AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE user_item_interactions ADD COLUMN timestamp timestamptz;
    UPDATE user_item_interactions SET timestamp = created_at WHERE timestamp IS NULL;
    ALTER TABLE user_item_interactions ALTER COLUMN timestamp SET DEFAULT now();
    ALTER TABLE user_item_interactions ALTER COLUMN timestamp SET NOT NULL;
    CREATE INDEX idx_user_item_interactions_timestamp ON user_item_interactions(timestamp DESC);
  END IF;
END $$;

-- 4. Add context column for metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_item_interactions' AND column_name = 'context'
  ) THEN
    ALTER TABLE user_item_interactions ADD COLUMN context jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 5. Update RLS policies to support both user_id and profile_id
DROP POLICY IF EXISTS "Users can view own interactions" ON user_item_interactions;
DROP POLICY IF EXISTS "Users can insert own interactions" ON user_item_interactions;
DROP POLICY IF EXISTS "Users manage own interactions" ON user_item_interactions;

CREATE POLICY "Users can view own interactions"
  ON user_item_interactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = profile_id);

CREATE POLICY "Users can insert own interactions"
  ON user_item_interactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.uid() = profile_id);

CREATE POLICY "Users can update own interactions"
  ON user_item_interactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = profile_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = profile_id);

-- 6. Create materialized view for trending items (better performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_items_24h AS
SELECT 
  item_type,
  item_id,
  COUNT(*) as interaction_count,
  SUM(interaction_weight) as total_weight,
  MAX(timestamp) as last_interaction
FROM user_item_interactions
WHERE timestamp > (NOW() - INTERVAL '24 hours')
GROUP BY item_type, item_id
ORDER BY total_weight DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_items_24h_item ON trending_items_24h(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_trending_items_24h_weight ON trending_items_24h(total_weight DESC);

-- 7. Create function to refresh trending items
CREATE OR REPLACE FUNCTION refresh_trending_items()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY trending_items_24h;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create helper function to track interactions
CREATE OR REPLACE FUNCTION track_user_interaction(
  p_user_id uuid,
  p_item_type text,
  p_item_id uuid,
  p_interaction_type text,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_weight numeric;
  v_interaction_id uuid;
BEGIN
  -- Calculate weight based on interaction type
  v_weight := CASE p_interaction_type
    WHEN 'book' THEN 10.0
    WHEN 'review' THEN 8.0
    WHEN 'contact' THEN 5.0
    WHEN 'like' THEN 3.0
    WHEN 'bookmark' THEN 3.0
    WHEN 'follow' THEN 4.0
    WHEN 'comment' THEN 2.0
    WHEN 'share' THEN 2.0
    WHEN 'view' THEN 1.0
    ELSE 1.0
  END;
  
  -- Insert interaction
  INSERT INTO user_item_interactions (
    user_id,
    profile_id,
    item_type,
    item_id,
    interaction_type,
    interaction_weight,
    context,
    timestamp
  ) VALUES (
    p_user_id,
    p_user_id,
    p_item_type,
    p_item_id,
    p_interaction_type,
    v_weight,
    p_context,
    NOW()
  )
  RETURNING id INTO v_interaction_id;
  
  RETURN v_interaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION track_user_interaction TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_trending_items TO authenticated;

-- Add comments
COMMENT ON COLUMN user_item_interactions.user_id IS 'User ID - alias for profile_id for backward compatibility';
COMMENT ON COLUMN user_item_interactions.interaction_weight IS 'Weight of interaction for recommendation scoring';
COMMENT ON COLUMN user_item_interactions.timestamp IS 'Timestamp - alias for created_at for backward compatibility';
COMMENT ON COLUMN user_item_interactions.context IS 'Additional metadata about the interaction';
COMMENT ON FUNCTION track_user_interaction IS 'Track user interaction with automatic weight calculation';
