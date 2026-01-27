/*
  # Fix Case-Insensitive Status Filters

  ## Issue
  - Jobs have status 'Open' (capitalized) in database
  - Cursor functions filter for 'open' (lowercase)
  - Services already use LOWER() but jobs don't
  
  ## Solution
  - Update both cursor functions to use LOWER() for case-insensitive status checks
  - Ensures 'Open', 'open', 'OPEN' all match correctly
*/

-- ============================================================================
-- FIX OLD JOBS CURSOR FUNCTION
-- ============================================================================

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
    CASE
      WHEN v_has_user_location AND j.latitude IS NOT NULL AND j.longitude IS NOT NULL THEN
        CAST((point(p_user_lng, p_user_lat) <@> point(j.longitude::float, j.latitude::float)) AS DECIMAL)
      ELSE NULL
    END as distance_miles,
    j.pricing_type
  FROM jobs j
  LEFT JOIN profiles p ON p.id = j.customer_id
  WHERE LOWER(j.status) IN ('open', 'in_progress')
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

-- ============================================================================
-- FIX NEW JOBS CURSOR FUNCTION (_v2)
-- ============================================================================

DROP FUNCTION IF EXISTS get_jobs_cursor_paginated_v2(
  TIMESTAMPTZ, UUID, INT, UUID[], TEXT, DECIMAL, DECIMAL, TEXT, BOOLEAN, DOUBLE PRECISION, DOUBLE PRECISION, INT
);

CREATE FUNCTION get_jobs_cursor_paginated_v2(
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
  budget DECIMAL,
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
  distance_miles DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  v_apply_distance_filter BOOLEAN;
  v_search_query tsquery;
BEGIN
  v_apply_distance_filter := (
    p_user_lat IS NOT NULL AND
    p_user_lng IS NOT NULL AND
    p_distance IS NOT NULL
  );

  IF p_search IS NOT NULL AND p_search != '' THEN
    v_search_query := plainto_tsquery('english', p_search);
  END IF;

  RETURN QUERY
  WITH distance_calc AS (
    SELECT
      j.id,
      j.title,
      j.description,
      COALESCE(j.fixed_price, j.budget_min) as budget,
      ARRAY(SELECT jsonb_array_elements_text(j.photos))::text[] as photos,
      j.created_at,
      j.status,
      j.customer_id,
      j.category_id,
      p.full_name,
      p.avatar_url,
      p.location,
      j.city,
      j.state,
      j.latitude,
      j.longitude,
      j.fixed_price,
      j.budget_min,
      j.budget_max,
      j.featured_image_url,
      p.user_type,
      CASE
        WHEN v_apply_distance_filter AND j.latitude IS NOT NULL AND j.longitude IS NOT NULL THEN
          (point(p_user_lng, p_user_lat) <@> point(j.longitude::float, j.latitude::float))
        ELSE NULL
      END as distance_miles
    FROM jobs j
    LEFT JOIN profiles p ON p.id = j.customer_id
    WHERE LOWER(j.status) IN ('open', 'in_progress')
      AND (
        p_cursor_created_at IS NULL
        OR j.created_at < p_cursor_created_at
        OR (j.created_at = p_cursor_created_at AND j.id < p_cursor_id)
      )
      AND (p_category_ids IS NULL OR j.category_id = ANY(p_category_ids))
      AND (
        v_search_query IS NULL
        OR j.search_vector @@ v_search_query
      )
      AND (
        p_min_budget IS NULL
        OR COALESCE(j.fixed_price, j.budget_min) >= p_min_budget
      )
      AND (
        p_max_budget IS NULL
        OR COALESCE(j.fixed_price, j.budget_max, j.budget_min) <= p_max_budget
      )
      AND (
        p_verified IS NULL
        OR p_verified = false
        OR (p_verified = true AND (p.id_verified = true OR p.business_verified = true))
      )
  )
  SELECT
    dc.id,
    dc.title,
    dc.description,
    dc.budget,
    dc.photos,
    dc.created_at,
    dc.status,
    dc.customer_id,
    dc.category_id,
    dc.full_name as customer_full_name,
    dc.avatar_url as customer_avatar,
    dc.location as customer_location,
    dc.city,
    dc.state,
    dc.latitude,
    dc.longitude,
    dc.fixed_price,
    dc.budget_min,
    dc.budget_max,
    dc.featured_image_url,
    dc.user_type as customer_user_type,
    dc.distance_miles
  FROM distance_calc dc
  WHERE (
    NOT v_apply_distance_filter
    OR (dc.distance_miles IS NOT NULL AND dc.distance_miles <= p_distance)
  )
  ORDER BY
    CASE
      WHEN p_sort_by = 'distance' AND v_apply_distance_filter THEN dc.distance_miles
      ELSE NULL
    END ASC NULLS LAST,
    CASE
      WHEN p_sort_by = 'price_low' THEN dc.budget
      ELSE NULL
    END ASC NULLS LAST,
    CASE
      WHEN p_sort_by = 'price_high' THEN dc.budget
      ELSE NULL
    END DESC NULLS LAST,
    CASE
      WHEN p_sort_by = 'popular' THEN (
        SELECT COUNT(*) FROM bookings WHERE job_id = dc.id
      )
      ELSE NULL
    END DESC NULLS LAST,
    dc.created_at DESC,
    dc.id DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_jobs_cursor_paginated TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_jobs_cursor_paginated_v2 TO authenticated, anon;
