/*
  # Fix cursor pagination functions with correct column names

  1. Changes
    - Uses actual database column names:
      - service_listings: featured_image_url (not image_url)
      - service_listings: price (not base_price for price field)
      - service_listings: rating_average (correct)
      - service_listings: booking_count (not total_bookings)
      - profiles: id_verified (not is_verified)
      - profiles: NO business_name column (removed from output)

  2. Reason
    - Previous migration used incorrect column names causing query failures
    - Provider pins couldn't load due to SQL errors
*/

-- ============================================================================
-- Drop existing functions
-- ============================================================================

DROP FUNCTION IF EXISTS get_services_cursor_paginated(
  TIMESTAMPTZ, UUID, INT, UUID, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT[]
);

DROP FUNCTION IF EXISTS get_jobs_cursor_paginated(
  TIMESTAMPTZ, UUID, INT, UUID, TEXT, DECIMAL, DECIMAL
);

-- ============================================================================
-- Recreate get_services_cursor_paginated with correct column names
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
  provider_user_type TEXT,
  provider_rating_average DECIMAL,
  provider_rating_count INT,
  provider_id_verified BOOLEAN,
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
    p.user_type as provider_user_type,
    p.rating_average as provider_rating_average,
    p.rating_count as provider_rating_count,
    p.id_verified as provider_id_verified,
    p.latitude,
    p.longitude
  FROM service_listings sl
  LEFT JOIN profiles p ON p.id = sl.provider_id
  WHERE sl.status = 'Active'
    -- Cursor-based pagination (faster than OFFSET)
    AND (
      p_cursor_created_at IS NULL
      OR sl.created_at < p_cursor_created_at
      OR (sl.created_at = p_cursor_created_at AND sl.id < p_cursor_id)
    )
    -- Category filter
    AND (p_category_id IS NULL OR sl.category_id = p_category_id)
    -- Search filter
    AND (
      p_search IS NULL
      OR sl.title ILIKE '%' || p_search || '%'
      OR sl.description ILIKE '%' || p_search || '%'
    )
    -- Price filters
    AND (p_min_price IS NULL OR sl.price >= p_min_price)
    AND (p_max_price IS NULL OR sl.price <= p_max_price)
    -- Rating filter
    AND (p_min_rating IS NULL OR sl.rating_average >= p_min_rating)
    -- Listing type filter
    AND (
      p_listing_types IS NULL
      OR sl.listing_type = ANY(p_listing_types)
    )
  ORDER BY sl.created_at DESC, sl.id DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- Recreate get_jobs_cursor_paginated with correct column names
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
  customer_user_type TEXT,
  customer_rating_average DECIMAL,
  customer_rating_count INT,
  customer_id_verified BOOLEAN,
  city TEXT,
  state TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  deadline TIMESTAMPTZ,
  featured_image_url TEXT,
  fixed_price DECIMAL,
  budget_min DECIMAL,
  budget_max DECIMAL,
  pricing_type TEXT
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
    j.budget,
    j.photos,
    j.created_at,
    j.status,
    j.customer_id,
    j.category_id,
    p.full_name as customer_full_name,
    p.avatar_url as customer_avatar,
    p.user_type as customer_user_type,
    p.rating_average as customer_rating_average,
    p.rating_count as customer_rating_count,
    p.id_verified as customer_id_verified,
    j.city,
    j.state,
    j.latitude,
    j.longitude,
    j.deadline,
    j.featured_image_url,
    j.fixed_price,
    j.budget_min,
    j.budget_max,
    j.pricing_type
  FROM jobs j
  LEFT JOIN profiles p ON p.id = j.customer_id
  WHERE j.status = 'open'
    -- Cursor-based pagination (faster than OFFSET)
    AND (
      p_cursor_created_at IS NULL
      OR j.created_at < p_cursor_created_at
      OR (j.created_at = p_cursor_created_at AND j.id < p_cursor_id)
    )
    -- Category filter
    AND (p_category_id IS NULL OR j.category_id = p_category_id)
    -- Search filter
    AND (
      p_search IS NULL
      OR j.title ILIKE '%' || p_search || '%'
      OR j.description ILIKE '%' || p_search || '%'
    )
    -- Budget filters
    AND (
      p_min_budget IS NULL
      OR COALESCE(j.fixed_price, j.budget_min, j.budget, 0) >= p_min_budget
    )
    AND (
      p_max_budget IS NULL
      OR COALESCE(j.fixed_price, j.budget_max, j.budget, 0) <= p_max_budget
    )
  ORDER BY j.created_at DESC, j.id DESC
  LIMIT p_limit;
END;
$$;