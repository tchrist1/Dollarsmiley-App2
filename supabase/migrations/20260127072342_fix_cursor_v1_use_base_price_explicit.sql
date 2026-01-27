/*
  # Fix get_services_cursor_paginated to use base_price
  
  ## Summary
  Updates the v1 cursor function to return `base_price` as `price` so home screen displays correct prices.
  
  ## Issues Fixed
  - Home screen cards showing $0 in list/grid/map views
  - The v1 function was selecting sl.price (NULL) instead of sl.base_price (has values)
  
  ## Changes
  1. Update get_services_cursor_paginated to select base_price as price
  2. Update get_home_feed_snapshot to use base_price as well
*/

-- ============================================================================
-- FIX V1 CURSOR FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS get_services_cursor_paginated(
  TIMESTAMPTZ, UUID, INT, UUID[], TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT[], TEXT, BOOLEAN, DOUBLE PRECISION, DOUBLE PRECISION, INT
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
      sl.id,
      sl.title,
      sl.description,
      sl.base_price,
      sl.featured_image_url,
      sl.created_at,
      sl.status,
      sl.provider_id,
      sl.category_id,
      sl.rating_average,
      sl.booking_count,
      sl.listing_type,
      sl.service_type,
      p.full_name,
      p.avatar_url,
      p.location,
      p.city,
      p.state,
      p.latitude,
      p.longitude,
      p.user_type,
      CASE
        WHEN v_apply_distance_filter AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
          (point(p_user_lng, p_user_lat) <@> point(p.longitude::float, p.latitude::float))
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
        v_search_query IS NULL
        OR sl.search_vector @@ v_search_query
      )
      AND (p_min_price IS NULL OR sl.base_price >= p_min_price)
      AND (p_max_price IS NULL OR sl.base_price <= p_max_price)
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
  )
  SELECT
    dc.id,
    dc.title,
    dc.description,
    dc.base_price as price,
    dc.featured_image_url as image_url,
    dc.created_at,
    dc.status,
    dc.provider_id,
    dc.category_id,
    dc.rating_average as average_rating,
    dc.booking_count as total_bookings,
    dc.listing_type,
    dc.service_type,
    dc.full_name as provider_full_name,
    dc.avatar_url as provider_avatar,
    dc.location as provider_location,
    dc.city as provider_city,
    dc.state as provider_state,
    dc.latitude,
    dc.longitude,
    dc.user_type as provider_user_type,
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
      WHEN p_sort_by = 'price_low' THEN dc.base_price
      ELSE NULL
    END ASC NULLS LAST,
    CASE
      WHEN p_sort_by = 'price_high' THEN dc.base_price
      ELSE NULL
    END DESC NULLS LAST,
    CASE
      WHEN p_sort_by = 'rating' THEN dc.rating_average
      ELSE NULL
    END DESC NULLS LAST,
    CASE
      WHEN p_sort_by = 'popular' THEN dc.booking_count
      ELSE NULL
    END DESC NULLS LAST,
    dc.created_at DESC,
    dc.id DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- FIX SNAPSHOT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_home_feed_snapshot(
  p_user_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  marketplace_type TEXT,
  title TEXT,
  price DECIMAL,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  rating DECIMAL,
  provider_id UUID,
  provider_name TEXT,
  location TEXT,
  listing_type TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH services AS (
    SELECT 
      sl.id,
      'Service'::TEXT as marketplace_type,
      sl.title,
      sl.base_price as price,
      sl.featured_image_url as image_url,
      sl.created_at,
      sl.rating_average as rating,
      sl.provider_id,
      p.full_name as provider_name,
      COALESCE(p.city || ', ' || p.state, p.city, 'Location TBD') as location,
      sl.listing_type
    FROM service_listings sl
    LEFT JOIN profiles p ON p.id = sl.provider_id
    WHERE LOWER(sl.status) = 'active'
    ORDER BY sl.created_at DESC
    LIMIT p_limit
  ),
  jobs AS (
    SELECT 
      j.id,
      'Job'::TEXT as marketplace_type,
      j.title,
      COALESCE(j.fixed_price, j.budget_min) as price,
      j.featured_image_url as image_url,
      j.created_at,
      NULL::DECIMAL as rating,
      j.customer_id as provider_id,
      p.full_name as provider_name,
      COALESCE(j.city || ', ' || j.state, j.city, 'Location TBD') as location,
      'Job'::TEXT as listing_type
    FROM jobs j
    LEFT JOIN profiles p ON p.id = j.customer_id
    WHERE LOWER(j.status) IN ('open', 'in_progress')
    ORDER BY j.created_at DESC
    LIMIT p_limit
  )
  SELECT * FROM (
    SELECT * FROM services
    UNION ALL
    SELECT * FROM jobs
  ) combined
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- MAINTAIN PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_services_cursor_paginated TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_home_feed_snapshot TO authenticated, anon;
