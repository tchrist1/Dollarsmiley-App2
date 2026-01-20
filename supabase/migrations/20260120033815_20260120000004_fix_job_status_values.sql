/*
  # Fix Job Status Values in Queries

  1. Purpose
    - Update functions to match actual job status values
    - Jobs use 'Open' and 'Booked' (capitalized), not lowercase

  2. Changes
    - Update get_home_feed_snapshot to use correct status values
    - Update get_jobs_cursor_paginated to use correct status values
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
    WHERE j.status IN ('Open', 'Booked')
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
-- Fix get_jobs_cursor_paginated function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_jobs_cursor_paginated(
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_category_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_min_budget DECIMAL DEFAULT NULL,
  p_max_budget DECIMAL DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  budget DECIMAL,
  photos JSONB,
  created_at TIMESTAMPTZ,
  status TEXT,
  customer_id UUID,
  category_id UUID,
  customer_full_name TEXT,
  customer_avatar TEXT,
  city TEXT,
  state TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  deadline TIMESTAMPTZ,
  featured_image_url TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.description,
    COALESCE(j.fixed_price, j.budget_min, j.budget_max, 0) as budget,
    j.photos,
    j.created_at,
    j.status,
    j.customer_id,
    j.category_id,
    p.full_name as customer_full_name,
    p.avatar_url as customer_avatar,
    j.city,
    j.state,
    j.latitude,
    j.longitude,
    j.expires_at as deadline,
    j.featured_image_url
  FROM jobs j
  LEFT JOIN profiles p ON p.id = j.customer_id
  WHERE j.status IN ('Open', 'Booked')
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
      OR j.fixed_price >= p_min_budget 
      OR j.budget_min >= p_min_budget 
      OR j.budget_max >= p_min_budget
    )
    AND (
      p_max_budget IS NULL 
      OR j.fixed_price <= p_max_budget 
      OR j.budget_min <= p_max_budget 
      OR j.budget_max <= p_max_budget
    )
  ORDER BY j.created_at DESC, j.id DESC
  LIMIT p_limit;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_home_feed_snapshot TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_jobs_cursor_paginated TO authenticated, anon;
