/*
  # Fix Distance Type and Budget Column Issues

  1. Problems
    - distance_miles returns double precision but function expects DECIMAL
    - jobs table doesn't have budget column, only budget_min/budget_max/fixed_price

  2. Solutions
    - Cast distance_miles to DECIMAL for type consistency
    - Remove budget column from jobs function
    - Use COALESCE(fixed_price, budget_min, budget_max) for sorting

  3. Changes
    - Update get_services_cursor_paginated: cast distance to DECIMAL
    - Update get_jobs_cursor_paginated: remove budget column, fix sorting
*/

-- ============================================================================
-- STEP 1: Fix get_services_cursor_paginated distance type
-- ============================================================================

DROP FUNCTION IF EXISTS get_services_cursor_paginated(
  timestamp with time zone, uuid, integer, uuid[], text, numeric, numeric, numeric, text[], text, boolean, double precision, double precision, integer
);

CREATE OR REPLACE FUNCTION get_services_cursor_paginated(
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_category_ids UUID[] DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_min_price DECIMAL DEFAULT NULL,
  p_max_price DECIMAL DEFAULT NULL,
  p_min_rating DECIMAL DEFAULT NULL,
  p_listing_types TEXT[] DEFAULT NULL,
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
  price DECIMAL,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  status TEXT,
  provider_id UUID,
  category_id UUID,
  average_rating DECIMAL,
  total_bookings INT,
  listing_type TEXT,
  service_type TEXT,
  provider_full_name TEXT,
  provider_avatar TEXT,
  provider_location TEXT,
  provider_city TEXT,
  provider_state TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  provider_user_type TEXT,
  distance_miles DECIMAL
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
    sl.id,
    sl.title,
    sl.description,
    sl.price,
    sl.featured_image_url as image_url,
    sl.created_at,
    sl.status,
    sl.provider_id,
    sl.category_id,
    sl.rating_average as average_rating,
    sl.booking_count as total_bookings,
    sl.listing_type,
    sl.service_type,
    p.full_name as provider_full_name,
    p.avatar_url as provider_avatar,
    p.location as provider_location,
    p.city as provider_city,
    p.state as provider_state,
    p.latitude,
    p.longitude,
    p.user_type as provider_user_type,
    -- FIX: Cast to DECIMAL for type consistency
    CASE
      WHEN v_has_user_location AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
        CAST((point(p_user_lng, p_user_lat) <@> point(p.longitude::float, p.latitude::float)) AS DECIMAL)
      ELSE NULL
    END as distance_miles
  FROM service_listings sl
  LEFT JOIN profiles p ON p.id = sl.provider_id
  WHERE LOWER(sl.status) = 'active'
    AND (
      p_cursor_created_at IS NULL
      OR sl.created_at < p_cursor_created_at
      OR (sl.created_at = p_cursor_created_at AND sl.id < p_cursor_id)
    )
    AND (p_category_ids IS NULL OR sl.category_id = ANY(p_category_ids))
    AND (
      p_search IS NULL
      OR sl.title ILIKE '%' || p_search || '%'
      OR sl.description ILIKE '%' || p_search || '%'
    )
    AND (p_min_price IS NULL OR sl.price >= p_min_price)
    AND (p_max_price IS NULL OR sl.price <= p_max_price)
    AND (p_min_rating IS NULL OR sl.rating_average >= p_min_rating)
    AND (
      p_listing_types IS NULL
      OR sl.listing_type = ANY(p_listing_types)
    )
    AND (
      p_verified IS NULL
      OR p_verified = false
      OR (p_verified = true AND (p.id_verified = true OR p.business_verified = true))
    )
    AND (
      NOT v_apply_distance_filter
      OR (
        p.latitude IS NOT NULL
        AND p.longitude IS NOT NULL
        AND (point(p_user_lng, p_user_lat) <@> point(p.longitude::float, p.latitude::float)) <= p_distance
      )
    )
  ORDER BY
    CASE
      WHEN p_sort_by = 'distance' AND v_has_user_location THEN
        (point(p_user_lng, p_user_lat) <@> point(p.longitude::float, p.latitude::float))
      ELSE NULL
    END ASC NULLS LAST,
    CASE
      WHEN p_sort_by = 'price_low' THEN sl.price
      ELSE NULL
    END ASC NULLS LAST,
    CASE
      WHEN p_sort_by = 'price_high' THEN sl.price
      ELSE NULL
    END DESC NULLS LAST,
    CASE
      WHEN p_sort_by = 'rating' THEN sl.rating_average
      ELSE NULL
    END DESC NULLS LAST,
    CASE
      WHEN p_sort_by = 'popular' THEN sl.booking_count
      ELSE NULL
    END DESC NULLS LAST,
    sl.created_at DESC,
    sl.id DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- STEP 2: Fix get_jobs_cursor_paginated budget column
-- ============================================================================

DROP FUNCTION IF EXISTS get_jobs_cursor_paginated(
  timestamp with time zone, uuid, integer, uuid[], text, numeric, numeric, text, boolean, double precision, double precision, integer
);

CREATE OR REPLACE FUNCTION get_jobs_cursor_paginated(
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
  deadline TIMESTAMPTZ,
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
    -- FIX: Cast to DECIMAL for type consistency
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
    -- FIX: Use fixed_price, budget_min, or budget_max for filtering
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
    -- FIX: Use fixed_price or budget for price sorting
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
        SELECT COUNT(*) FROM job_applications WHERE job_id = j.id
      )
      ELSE NULL
    END DESC NULLS LAST,
    j.created_at DESC,
    j.id DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- STEP 3: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_services_cursor_paginated TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_jobs_cursor_paginated TO authenticated, anon;
