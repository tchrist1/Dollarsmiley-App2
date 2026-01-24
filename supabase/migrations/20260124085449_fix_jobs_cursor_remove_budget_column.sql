/*
  # Fix Jobs Cursor - Remove Budget Column Reference

  1. Problem
    - Function references j.budget which doesn't exist
    - Jobs table only has budget_min, budget_max, fixed_price
    - Causing SQL errors on query

  2. Solution
    - Remove budget from return table
    - Keep budget_min, budget_max, fixed_price for client-side calculation
    - Update WHERE clauses to use COALESCE for budget filtering
*/

DROP FUNCTION IF EXISTS get_jobs_cursor_paginated(
  TIMESTAMPTZ, UUID, INT, UUID, TEXT, DECIMAL, DECIMAL, TEXT, BOOLEAN, DOUBLE PRECISION, DOUBLE PRECISION, INT
);

CREATE OR REPLACE FUNCTION get_jobs_cursor_paginated(
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_category_id UUID DEFAULT NULL,
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
  deadline TIMESTAMPTZ,
  fixed_price DECIMAL,
  budget_min DECIMAL,
  budget_max DECIMAL,
  featured_image_url TEXT,
  customer_user_type TEXT,
  customer_rating_average DECIMAL,
  customer_rating_count INT,
  pricing_type TEXT,
  distance_miles DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  v_apply_distance_filter BOOLEAN;
BEGIN
  v_apply_distance_filter := (
    p_user_lat IS NOT NULL AND 
    p_user_lng IS NOT NULL AND 
    p_distance IS NOT NULL
  );

  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.description,
    j.photos,
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
    j.deadline,
    j.fixed_price,
    j.budget_min,
    j.budget_max,
    j.featured_image_url,
    p.user_type as customer_user_type,
    p.rating_average as customer_rating_average,
    p.rating_count as customer_rating_count,
    j.pricing_type,
    CASE 
      WHEN v_apply_distance_filter AND j.latitude IS NOT NULL AND j.longitude IS NOT NULL THEN
        (point(p_user_lng, p_user_lat) <@> point(j.longitude::float, j.latitude::float))
      ELSE NULL
    END as distance_miles
  FROM jobs j
  LEFT JOIN profiles p ON p.id = j.customer_id
  WHERE j.status IN ('open', 'in_progress')
    AND (
      p_cursor_created_at IS NULL
      OR j.created_at < p_cursor_created_at
      OR (j.created_at = p_cursor_created_at AND j.id < p_cursor_id)
    )
    AND (p_category_id IS NULL OR j.category_id = p_category_id)
    AND (
      p_search IS NULL
      OR j.title ILIKE '%' || p_search || '%'
      OR j.description ILIKE '%' || p_search || '%'
    )
    AND (
      p_min_budget IS NULL 
      OR COALESCE(j.fixed_price, j.budget_min, 0) >= p_min_budget
    )
    AND (
      p_max_budget IS NULL 
      OR COALESCE(j.fixed_price, j.budget_max, j.budget_min, 0) <= p_max_budget
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
      WHEN p_sort_by = 'distance' AND v_apply_distance_filter THEN
        (point(p_user_lng, p_user_lat) <@> point(j.longitude::float, j.latitude::float))
      ELSE NULL
    END ASC NULLS LAST,
    CASE
      WHEN p_sort_by = 'price_low' THEN COALESCE(j.fixed_price, j.budget_min, 0)
      ELSE NULL
    END ASC NULLS LAST,
    CASE
      WHEN p_sort_by = 'price_high' THEN COALESCE(j.fixed_price, j.budget_max, j.budget_min, 0)
      ELSE NULL
    END DESC NULLS LAST,
    CASE
      WHEN p_sort_by = 'popular' THEN (
        SELECT COUNT(*) FROM job_applications WHERE job_id = j.id
      )
      ELSE NULL
    END DESC NULLS LAST,
    j.created_at DESC,
    j.id DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_jobs_cursor_paginated TO authenticated, anon;
