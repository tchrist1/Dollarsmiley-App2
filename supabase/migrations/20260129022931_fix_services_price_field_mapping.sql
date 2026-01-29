/*
  # Fix Services Price Field Mapping - Use base_price Instead of price

  ## Issue
  Services display "$0" on Home screen despite having valid prices in database
  
  ## Root Cause
  - service_listings table has base_price as primary price field (71/71 services have it)
  - Only 2/71 services have "price" field populated
  - RPC function get_services_cursor_paginated_v2 queries sl.price (line 100)
  - Returns null for 69/71 services → formatCurrency(null) → "$0"

  ## Solution
  - Use COALESCE(sl.base_price, sl.price) to prioritize base_price
  - Ensures all services with valid pricing display correctly
  - Maintains backward compatibility if any service uses "price" field

  ## Verification Query
  SELECT COUNT(*) as total, 
         COUNT(CASE WHEN price IS NOT NULL THEN 1 END) as with_price,
         COUNT(CASE WHEN base_price IS NOT NULL THEN 1 END) as with_base_price
  FROM service_listings WHERE status = 'active';
  -- Result: 71 total, 2 with_price, 71 with_base_price
*/

DROP FUNCTION IF EXISTS get_services_cursor_paginated_v2(
  TIMESTAMPTZ, UUID, INT, UUID[], TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT[], TEXT, BOOLEAN, DOUBLE PRECISION, DOUBLE PRECISION, INT, TEXT
);

CREATE FUNCTION get_services_cursor_paginated_v2(
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
  p_distance INT DEFAULT NULL,
  p_service_type TEXT DEFAULT NULL
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
  distance_miles DOUBLE PRECISION,
  pricing_type TEXT
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
      COALESCE(sl.base_price, sl.price) as price,
      sl.featured_image_url,
      sl.created_at,
      sl.status,
      sl.provider_id,
      sl.category_id,
      sl.rating_average,
      sl.rating_count,
      sl.booking_count,
      sl.listing_type,
      sl.service_type,
      sl.pricing_type,
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
      AND (p_min_price IS NULL OR COALESCE(sl.base_price, sl.price) >= p_min_price)
      AND (p_max_price IS NULL OR COALESCE(sl.base_price, sl.price) <= p_max_price)
      AND (p_min_rating IS NULL OR sl.rating_average >= p_min_rating)
      AND (
        p_listing_types IS NULL
        OR sl.listing_type = ANY(p_listing_types)
      )
      AND (
        p_service_type IS NULL
        OR sl.service_type = p_service_type
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
    dc.price,
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
    dc.distance_miles,
    dc.pricing_type
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
      WHEN p_sort_by = 'price_low' THEN dc.price
      ELSE NULL
    END ASC NULLS LAST,
    CASE
      WHEN p_sort_by = 'price_high' THEN dc.price
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
    CASE
      WHEN p_sort_by = 'reviews' THEN dc.rating_count
      ELSE NULL
    END DESC NULLS LAST,
    CASE
      WHEN p_sort_by = 'recent' THEN dc.created_at
      ELSE NULL
    END DESC NULLS LAST,
    dc.created_at DESC,
    dc.id DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_services_cursor_paginated_v2 TO authenticated, anon;
