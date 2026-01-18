/*
  # Fix get_trending_items RPC Function

  Creates a database function to get trending items based on user interactions.
  This replaces the broken client-side aggregate query that was trying to use
  COUNT() and SUM() in a .select() call.

  1. New Function
    - `get_trending_items(p_item_type, p_hours_ago, p_limit)`
      - Aggregates interactions by item_id
      - Counts interactions and sums weights
      - Filters by item type and time range
      - Returns trending items ordered by total weight
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_trending_items(text, integer, integer);

-- Create function to get trending items
CREATE OR REPLACE FUNCTION get_trending_items(
  p_item_type text,
  p_hours_ago integer DEFAULT 24,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  item_id uuid,
  interaction_count bigint,
  total_weight numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uii.item_id,
    COUNT(*)::bigint as interaction_count,
    COALESCE(SUM(uii.interaction_weight), 0) as total_weight
  FROM user_item_interactions uii
  WHERE
    uii.item_type = p_item_type
    AND uii.timestamp >= (NOW() - (p_hours_ago || ' hours')::interval)
  GROUP BY uii.item_id
  ORDER BY total_weight DESC, interaction_count DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_trending_items(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_items(text, integer, integer) TO anon;
