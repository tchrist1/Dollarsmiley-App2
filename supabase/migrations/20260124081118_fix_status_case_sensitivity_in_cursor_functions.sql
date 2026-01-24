/*
  # Fix Status Case Sensitivity in Cursor Functions

  1. Problem
    - Functions check for sl.status = 'active' (lowercase)
    - Actual data has status = 'Active' (capital A)
    - This caused zero results from cursor queries

  2. Changes
    - Use case-insensitive comparison with ILIKE
    - OR change filter to match actual casing 'Active'

  3. Strategy
    - Use lowercase comparison to be more flexible
*/

-- ============================================================================
-- STEP 1: Fix get_services_cursor_paginated status check
-- ============================================================================

DROP FUNCTION IF EXISTS get_services_cursor_paginated(
  TIMESTAMPTZ, UUID, INT, UUID, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT[], TEXT, BOOLEAN
);

CREATE OR REPLACE FUNCTION get_services_cursor_paginated(
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_category_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_min_price DECIMAL DEFAULT NULL,
  p_max_price DECIMAL DEFAULT NULL,
  p_min_rating DECIMAL DEFAULT NULL,
  p_listing_types TEXT[] DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'relevance',
  p_verified BOOLEAN DEFAULT NULL
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
  provider_full_name TEXT,
  provider_avatar TEXT,
  provider_city TEXT,
  provider_state TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  provider_user_type TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
BEGIN
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
    p.full_name as provider_full_name,
    p.avatar_url as provider_avatar,
    p.city as provider_city,
    p.state as provider_state,
    p.latitude,
    p.longitude,
    p.user_type as provider_user_type
  FROM service_listings sl
  LEFT JOIN profiles p ON p.id = sl.provider_id
  WHERE LOWER(sl.status) = 'active'
    AND (
      p_cursor_created_at IS NULL
      OR sl.created_at < p_cursor_created_at
      OR (sl.created_at = p_cursor_created_at AND sl.id < p_cursor_id)
    )
    AND (p_category_id IS NULL OR sl.category_id = p_category_id)
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
  ORDER BY
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
-- STEP 2: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_services_cursor_paginated TO authenticated, anon;
