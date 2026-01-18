/*
  # Priority 2: Home Screen Query Optimization (22-Second Query Fix)

  ## Problem Analysis
  Home screen queries were taking 11-38 seconds due to:
  - Full table scans on text searches (title, description, location)
  - Missing composite indexes for common filter patterns
  - Slow ilike operations without full-text search
  - Inefficient price range filtering

  ## Solution Strategy
  1. Add full-text search indexes for title/description
  2. Add trigram indexes for location search (ilike patterns)
  3. Create composite indexes matching exact query patterns
  4. Add covering indexes to avoid table lookups
  5. Optimize price filtering for both services and jobs

  ## Performance Impact
  - Expected 90-95% query time reduction (22s → <2s)
  - Improved scalability for large datasets
  - Better concurrent query performance
*/

-- ============================================================================
-- STEP 1: Enable required extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm; -- Trigram matching for ILIKE
CREATE EXTENSION IF NOT EXISTS btree_gin; -- Multi-column GIN indexes

-- ============================================================================
-- STEP 2: SERVICE LISTINGS - Full-Text Search & Pattern Matching
-- ============================================================================

-- Full-text search for title and description (handles search query)
CREATE INDEX IF NOT EXISTS idx_service_listings_search_text
  ON service_listings USING gin(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  );

-- Trigram index for location ILIKE matching (handles location filter)
CREATE INDEX IF NOT EXISTS idx_service_listings_location_trgm
  ON service_listings USING gist(location gist_trgm_ops)
  WHERE status = 'Active';

-- Composite index for category filtering + sorting (most common pattern)
CREATE INDEX IF NOT EXISTS idx_service_listings_category_status_created
  ON service_listings(category_id, status, created_at DESC)
  WHERE status = 'Active';

-- Composite index for price range filtering (handles priceMin/priceMax)
CREATE INDEX IF NOT EXISTS idx_service_listings_price_status_created
  ON service_listings(base_price, status, created_at DESC)
  WHERE status = 'Active' AND base_price IS NOT NULL;

-- Covering index for active listings with all filter columns
CREATE INDEX IF NOT EXISTS idx_service_listings_active_filters
  ON service_listings(status, category_id, base_price, created_at DESC, provider_id)
  WHERE status = 'Active';

-- Index for listing type filtering (Service vs CustomService)
CREATE INDEX IF NOT EXISTS idx_service_listings_type_status_created
  ON service_listings(listing_type, status, created_at DESC)
  WHERE status = 'Active';

-- ============================================================================
-- STEP 3: JOBS - Full-Text Search & Complex Price Filtering
-- ============================================================================

-- Full-text search for title and description
CREATE INDEX IF NOT EXISTS idx_jobs_search_text
  ON jobs USING gin(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  );

-- Trigram index for location ILIKE matching
CREATE INDEX IF NOT EXISTS idx_jobs_location_trgm
  ON jobs USING gist(location gist_trgm_ops)
  WHERE status = 'Open';

-- Composite index for category filtering + sorting
CREATE INDEX IF NOT EXISTS idx_jobs_category_status_created
  ON jobs(category_id, status, created_at DESC)
  WHERE status = 'Open';

-- Indexes for price filtering (complex OR conditions in query)
-- Budget range filtering
CREATE INDEX IF NOT EXISTS idx_jobs_budget_min_status
  ON jobs(budget_min, status, created_at DESC)
  WHERE status = 'Open' AND budget_min IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_budget_max_status
  ON jobs(budget_max, status, created_at DESC)
  WHERE status = 'Open' AND budget_max IS NOT NULL;

-- Fixed price filtering
CREATE INDEX IF NOT EXISTS idx_jobs_fixed_price_status
  ON jobs(fixed_price, status, created_at DESC)
  WHERE status = 'Open' AND fixed_price IS NOT NULL;

-- Pricing type for quote-based jobs (always included in price filters)
CREATE INDEX IF NOT EXISTS idx_jobs_pricing_type_status_created
  ON jobs(pricing_type, status, created_at DESC)
  WHERE status = 'Open';

-- Covering index for open jobs with all filter columns
CREATE INDEX IF NOT EXISTS idx_jobs_open_filters
  ON jobs(status, category_id, pricing_type, created_at DESC, customer_id)
  INCLUDE (budget_min, budget_max, fixed_price, location)
  WHERE status = 'Open';

-- ============================================================================
-- STEP 4: PROFILES - Join Optimization
-- ============================================================================

-- Every query joins with profiles - optimize the join
CREATE INDEX IF NOT EXISTS idx_profiles_rating_lookup
  ON profiles(id, rating_average, rating_count);

-- Composite index for verified provider filtering (using actual columns)
CREATE INDEX IF NOT EXISTS idx_profiles_verified_rating
  ON profiles(id_verified, phone_verified, business_verified, rating_average DESC, rating_count DESC)
  WHERE id_verified = true OR phone_verified = true OR business_verified = true;

-- ============================================================================
-- STEP 5: CATEGORIES - Join Optimization
-- ============================================================================

-- Optimize category joins
CREATE INDEX IF NOT EXISTS idx_categories_active_lookup
  ON categories(id, name, is_active)
  WHERE is_active = true;

-- ============================================================================
-- STEP 6: Query-Specific Optimizations
-- ============================================================================

-- Optimize view count sorting (for trending/popular)
CREATE INDEX IF NOT EXISTS idx_service_listings_view_count_desc
  ON service_listings(view_count DESC, created_at DESC)
  WHERE status = 'Active' AND view_count > 0;

-- Optimize combined marketplace queries (services + jobs)
CREATE INDEX IF NOT EXISTS idx_service_listings_status_category
  ON service_listings(status, category_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_status_category
  ON jobs(status, category_id, created_at DESC);

-- ============================================================================
-- STEP 7: Statistics Update for Better Query Planning
-- ============================================================================

ANALYZE service_listings;
ANALYZE jobs;
ANALYZE profiles;
ANALYZE categories;

-- ============================================================================
-- STEP 8: Create optimized search functions
-- ============================================================================

CREATE OR REPLACE FUNCTION search_service_listings(
  p_query text,
  p_limit int DEFAULT 40
)
RETURNS SETOF service_listings
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM service_listings
  WHERE status = 'Active'
    AND (
      to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
      @@ plainto_tsquery('english', p_query)
    )
  ORDER BY
    ts_rank(
      to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')),
      plainto_tsquery('english', p_query)
    ) DESC,
    created_at DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION search_jobs(
  p_query text,
  p_limit int DEFAULT 40
)
RETURNS SETOF jobs
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM jobs
  WHERE status = 'Open'
    AND (
      to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
      @@ plainto_tsquery('english', p_query)
    )
  ORDER BY
    ts_rank(
      to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')),
      plainto_tsquery('english', p_query)
    ) DESC,
    created_at DESC
  LIMIT p_limit;
$$;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_service_listings_search_text IS
  'Full-text search index for service listings - replaces slow ILIKE queries';

COMMENT ON INDEX idx_service_listings_location_trgm IS
  'Trigram index for location ILIKE pattern matching';

COMMENT ON INDEX idx_service_listings_active_filters IS
  'Covering index for common filter combinations on active listings';

COMMENT ON INDEX idx_jobs_search_text IS
  'Full-text search index for job postings';

COMMENT ON INDEX idx_jobs_open_filters IS
  'Covering index with INCLUDE clause for all job filter columns';
