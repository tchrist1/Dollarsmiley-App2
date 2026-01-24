/*
  # Add Verified Providers Filter to Cursor Functions

  1. Purpose
    - Connect Verified Providers checkbox to backend queries
    - Enable filtering by provider verification status
    - Maintain cursor pagination efficiency

  2. Changes
    - Add p_verified parameter to get_services_cursor_paginated
    - Add p_verified parameter to get_jobs_cursor_paginated
    - Filter by id_verified OR business_verified when enabled

  3. Verification Logic
    - p_verified = true: Only verified providers (id_verified OR business_verified)
    - p_verified = false/NULL: No verification filtering

  4. Strategy
    - Join with profiles table already exists
    - Add WHERE clause condition for verification status
    - No index changes needed (verification filters are optional)
*/

-- ============================================================================
-- STEP 1: Update get_services_cursor_paginated with verified filter
-- ============================================================================

DROP FUNCTION IF EXISTS get_services_cursor_paginated(
  TIMESTAMPTZ, UUID, INT, UUID, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT[], TEXT
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
    sl.image_url,
    sl.created_at,
    sl.status,
    sl.provider_id,
    sl.category_id,
    sl.average_rating,
    sl.total_bookings,
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
  WHERE sl.status = 'active'
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
    AND (p_min_rating IS NULL OR sl.average_rating >= p_min_rating)
    -- Listing type filter
    AND (
      p_listing_types IS NULL
      OR sl.listing_type = ANY(p_listing_types)
    )
    -- Verified providers filter
    AND (
      p_verified IS NULL
      OR p_verified = false
      OR (p_verified = true AND (p.id_verified = true OR p.business_verified = true))
    )
  ORDER BY
    -- Dynamic sort based on p_sort_by
    CASE
      WHEN p_sort_by = 'price_low' THEN sl.price
      ELSE NULL
    END ASC NULLS LAST,
    CASE
      WHEN p_sort_by = 'price_high' THEN sl.price
      ELSE NULL
    END DESC NULLS LAST,
    CASE
      WHEN p_sort_by = 'rating' THEN sl.average_rating
      ELSE NULL
    END DESC NULLS LAST,
    CASE
      WHEN p_sort_by = 'popular' THEN sl.total_bookings
      ELSE NULL
    END DESC NULLS LAST,
    -- Always sort by created_at and id for cursor consistency
    sl.created_at DESC,
    sl.id DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- STEP 2: Update get_jobs_cursor_paginated with verified filter
-- ============================================================================

DROP FUNCTION IF EXISTS get_jobs_cursor_paginated(
  TIMESTAMPTZ, UUID, INT, UUID, TEXT, DECIMAL, DECIMAL, TEXT
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
  p_verified BOOLEAN DEFAULT NULL
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
  city TEXT,
  state TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  deadline TIMESTAMPTZ,
  fixed_price DECIMAL,
  budget_min DECIMAL,
  budget_max DECIMAL,
  featured_image_url TEXT,
  customer_user_type TEXT
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
    j.city,
    j.state,
    j.latitude,
    j.longitude,
    j.deadline,
    j.fixed_price,
    j.budget_min,
    j.budget_max,
    j.featured_image_url,
    p.user_type as customer_user_type
  FROM jobs j
  LEFT JOIN profiles p ON p.id = j.customer_id
  WHERE j.status IN ('open', 'in_progress')
    -- Cursor-based pagination
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
    AND (p_min_budget IS NULL OR j.budget >= p_min_budget)
    AND (p_max_budget IS NULL OR j.budget <= p_max_budget)
    -- Verified customers filter (jobs posted by verified users)
    AND (
      p_verified IS NULL
      OR p_verified = false
      OR (p_verified = true AND (p.id_verified = true OR p.business_verified = true))
    )
  ORDER BY
    -- Dynamic sort based on p_sort_by
    CASE
      WHEN p_sort_by = 'price_low' THEN j.budget
      ELSE NULL
    END ASC NULLS LAST,
    CASE
      WHEN p_sort_by = 'price_high' THEN j.budget
      ELSE NULL
    END DESC NULLS LAST,
    CASE
      WHEN p_sort_by = 'popular' THEN (
        SELECT COUNT(*) FROM job_applications WHERE job_id = j.id
      )
      ELSE NULL
    END DESC NULLS LAST,
    -- Always sort by created_at and id for cursor consistency
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
