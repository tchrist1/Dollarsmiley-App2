/*
  # Fix Status Case Sensitivity

  1. Purpose
    - Fix status filters to match actual database values
    - service_listings.status = 'Active' (not 'active')
    - jobs.status = 'open', 'in_progress' (lowercase)

  2. Changes
    - Update all functions to use correct case for status values
*/

-- ============================================================================
-- Fix get_home_feed_snapshot function
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
      sl.price,
      sl.featured_image_url as image_url,
      sl.created_at,
      sl.rating_average as rating,
      sl.provider_id,
      p.full_name as provider_name,
      COALESCE(sl.city || ', ' || sl.state, sl.city, 'Location TBD') as location,
      sl.listing_type
    FROM service_listings sl
    LEFT JOIN profiles p ON p.id = sl.provider_id
    WHERE sl.status = 'Active'
    ORDER BY sl.created_at DESC
    LIMIT p_limit
  ),
  jobs AS (
    SELECT 
      j.id,
      'Job'::TEXT as marketplace_type,
      j.title,
      COALESCE(j.fixed_price, j.budget_min, j.budget_max, 0) as price,
      COALESCE(j.featured_image_url, '') as image_url,
      j.created_at,
      NULL::DECIMAL as rating,
      j.customer_id as provider_id,
      p.full_name as provider_name,
      COALESCE(j.city || ', ' || j.state, j.city, 'Location TBD') as location,
      'Job'::TEXT as listing_type
    FROM jobs j
    LEFT JOIN profiles p ON p.id = j.customer_id
    WHERE j.status IN ('open', 'in_progress')
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
-- Fix get_services_cursor_paginated function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_services_cursor_paginated(
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_category_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_min_price DECIMAL DEFAULT NULL,
  p_max_price DECIMAL DEFAULT NULL,
  p_min_rating DECIMAL DEFAULT NULL,
  p_listing_types TEXT[] DEFAULT NULL
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
  rating DECIMAL,
  total_bookings INT,
  listing_type TEXT,
  provider_full_name TEXT,
  provider_avatar TEXT,
  provider_city TEXT,
  provider_state TEXT,
  latitude DECIMAL,
  longitude DECIMAL
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
    sl.rating_average as rating,
    sl.booking_count as total_bookings,
    sl.listing_type,
    p.full_name as provider_full_name,
    p.avatar_url as provider_avatar,
    p.city as provider_city,
    p.state as provider_state,
    sl.latitude,
    sl.longitude
  FROM service_listings sl
  LEFT JOIN profiles p ON p.id = sl.provider_id
  WHERE sl.status = 'Active'
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
  ORDER BY sl.created_at DESC, sl.id DESC
  LIMIT p_limit;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_home_feed_snapshot TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_services_cursor_paginated TO authenticated, anon;
