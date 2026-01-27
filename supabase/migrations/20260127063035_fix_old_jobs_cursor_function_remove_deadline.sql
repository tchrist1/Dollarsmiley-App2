/*
  # Fix Old Jobs Cursor Function - Remove Deadline Column

  ## Issue
  - get_jobs_cursor_paginated (old version) still references j.deadline
  - jobs table doesn't have deadline column
  
  ## Solution
  - Remove deadline from old function to match actual schema
  - Keep execution_date_start/execution_date_end instead
*/

DROP FUNCTION IF EXISTS get_jobs_cursor_paginated(
  TIMESTAMPTZ, UUID, INT, UUID[], TEXT, DECIMAL, DECIMAL, TEXT, BOOLEAN, DOUBLE PRECISION, DOUBLE PRECISION, INT
);

CREATE FUNCTION get_jobs_cursor_paginated(
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_category_ids UUID[] DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_min_budget DECIMAL DEFAULT NULL,
  p_max_budget DECIMAL DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'relevance',
  p_verified BOOLEAN DEFAULT NULL,
  p_user_lat DOUBLE PRECISION DEFAULT NULL,
  p_user_lng DOUBLE PRECISION DEFAULT NULL,
  p_distance INT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  photos TEXT[],
  created_at TIMESTAMPTZ,
  status TEXT,
  customer_id UUID,
  category_id UUID,
  customer_full_name TEXT,
  customer_avatar TEXT,
  customer_location TEXT,
  city TEXT,
  state TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  fixed_price DECIMAL,
  budget_min DECIMAL,
  budget_max DECIMAL,
  featured_image_url TEXT,
  customer_user_type TEXT,
  distance_miles DECIMAL,
  pricing_type TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  v_apply_distance_filter BOOLEAN;
  v_has_user_location BOOLEAN;
BEGIN
  v_apply_distance_filter := (
    p_user_lat IS NOT NULL AND
    p_user_lng IS NOT NULL AND
    p_distance IS NOT NULL
  );

  v_has_user_location := (
    p_user_lat IS NOT NULL AND
    p_user_lng IS NOT NULL
  );

  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.description,
    ARRAY(SELECT jsonb_array_elements_text(j.photos))::text[] as photos,
    j.created_at,
    j.status,
    j.customer_id,
    j.category_id,
    p.full_name as customer_full_name,
    p.avatar_url as customer_avatar,
    p.location as customer_location,
    j.city,
    j.state,
    j.latitude,
    j.longitude,
    j.fixed_price,
    j.budget_min,
    j.budget_max,
    j.featured_image_url,
    p.user_type as customer_user_type,
    -- Cast distance to DECIMAL for type consistency
    CASE
      WHEN v_has_user_location AND j.latitude IS NOT NULL AND j.longitude IS NOT NULL THEN
        CAST((point(p_user_lng, p_user_lat) <@> point(j.longitude::float, j.latitude::float)) AS DECIMAL)
      ELSE NULL
    END as distance_miles,
    j.pricing_type
  FROM jobs j
  LEFT JOIN profiles p ON p.id = j.customer_id
  WHERE j.status IN ('open', 'in_progress')
    AND (
      p_cursor_created_at IS NULL
      OR j.created_at < p_cursor_created_at
      OR (j.created_at = p_cursor_created_at AND j.id < p_cursor_id)
    )
    AND (p_category_ids IS NULL OR j.category_id = ANY(p_category_ids))
    AND (
      p_search IS NULL
      OR j.title ILIKE '%' || p_search || '%'
      OR j.description ILIKE '%' || p_search || '%'
    )
    AND (
      p_min_budget IS NULL OR
      COALESCE(j.fixed_price, j.budget_min, j.budget_max, 0) >= p_min_budget
    )
    AND (
      p_max_budget IS NULL OR
      COALESCE(j.fixed_price, j.budget_max, j.budget_min, 999999) <= p_max_budget
    )
    AND (
      p_verified IS NULL
      OR p_verified = false
      OR (p_verified = true AND (p.id_verified = true OR p.business_verified = true))
    )
    AND (
      NOT v_apply_distance_filter
      OR (
        j.latitude IS NOT NULL
        AND j.longitude IS NOT NULL
        AND (point(p_user_lng, p_user_lat) <@> point(j.longitude::float, j.latitude::float)) <= p_distance
      )
    )
  ORDER BY
    CASE
      WHEN p_sort_by = 'distance' AND v_has_user_location THEN
        (point(p_user_lng, p_user_lat) <@> point(j.longitude::float, j.latitude::float))
      ELSE NULL
    END ASC NULLS LAST,
    CASE
      WHEN p_sort_by = 'price_low' THEN
        COALESCE(j.fixed_price, j.budget_min, j.budget_max)
      ELSE NULL
    END ASC NULLS LAST,
    CASE
      WHEN p_sort_by = 'price_high' THEN
        COALESCE(j.fixed_price, j.budget_max, j.budget_min)
      ELSE NULL
    END DESC NULLS LAST,
    CASE
      WHEN p_sort_by = 'popular' THEN (
        SELECT COUNT(*) FROM bookings WHERE job_id = j.id
      )
      ELSE NULL
    END DESC NULLS LAST,
    j.created_at DESC,
    j.id DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_jobs_cursor_paginated TO authenticated, anon;
