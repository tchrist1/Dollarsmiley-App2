/*
  # Home + Filters Performance Index Optimization (Phase 1B)

  ## Summary
  Backend-only performance optimization for Home screen and filter queries.
  DISPLAY-SAFE: No frontend changes, no RPC return shape changes.

  ## New Indexes

  ### service_listings
  - Multi-column index for common filter combinations (listing_type + status + is_active)
  - Index for service type filtering
  - Index for price sorting
  - Composite index for geospatial queries (latitude + longitude)
  - Index for category filtering

  ### jobs
  - Multi-column index for job filtering (status + pricing_type)
  - Index for fixed price sorting
  - Index for date-based sorting
  - Composite index for geospatial queries

  ### profiles
  - Index for rating-based filtering
  - Index for verification status
  - Composite index for geospatial provider searches

  ### categories
  - Index for active category lookups
  - Index for parent-child relationships

  ## Performance Impact
  - Expected query time reduction: 50-80% for filtered searches
  - Expected query time reduction: 60-90% for distance-based searches

  ## Safety Guarantees
  - ✅ No column modifications
  - ✅ No RPC return shape changes
  - ✅ No SELECT list changes
  - ✅ No table structure changes
  - ✅ Identical frontend data display
*/

-- ============================================================================
-- SERVICE LISTINGS INDEXES
-- ============================================================================

-- Common filter combination: listing_type + status + is_active
-- Accelerates: Home feed, filtered views, service type switching
CREATE INDEX IF NOT EXISTS idx_service_listings_type_status_active
ON service_listings (listing_type, status, is_active)
WHERE is_active = true AND status = 'active';

-- Service type filtering (OnSite, RemoteService, HybridService)
-- Accelerates: Service type filter in Home screen
CREATE INDEX IF NOT EXISTS idx_service_listings_service_type
ON service_listings (service_type)
WHERE is_active = true AND status = 'active';

-- Provider filtering
-- Accelerates: Provider-based searches
CREATE INDEX IF NOT EXISTS idx_service_listings_provider_active
ON service_listings (provider_id)
WHERE is_active = true AND status = 'active';

-- Price sorting
-- Accelerates: "Sort by Price" functionality
CREATE INDEX IF NOT EXISTS idx_service_listings_base_price
ON service_listings (base_price)
WHERE is_active = true AND status = 'active' AND base_price IS NOT NULL;

-- Geospatial queries (for distance-based filtering)
-- Accelerates: Distance radius selector, "Near me" searches
CREATE INDEX IF NOT EXISTS idx_service_listings_coordinates
ON service_listings (latitude, longitude)
WHERE is_active = true AND status = 'active' AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Category filtering
-- Accelerates: Category-based searches
CREATE INDEX IF NOT EXISTS idx_service_listings_category_active
ON service_listings (category_id, is_active, status)
WHERE is_active = true AND status = 'active';

-- Recent listings (for "Sort by Recent")
-- Accelerates: Chronological sorting
CREATE INDEX IF NOT EXISTS idx_service_listings_created_at_desc
ON service_listings (created_at DESC)
WHERE is_active = true AND status = 'active';

-- ============================================================================
-- JOBS INDEXES
-- ============================================================================

-- Job filtering by status and pricing type
-- Accelerates: Job board filters, fixed vs quoted job filtering
CREATE INDEX IF NOT EXISTS idx_jobs_status_pricing
ON jobs (status, pricing_type)
WHERE status IN ('open', 'in_progress');

-- Fixed price sorting
-- Accelerates: Price-based job sorting
CREATE INDEX IF NOT EXISTS idx_jobs_fixed_price
ON jobs (fixed_price)
WHERE status IN ('open', 'in_progress') AND fixed_price IS NOT NULL;

-- Budget range filtering
-- Accelerates: Budget range filters
CREATE INDEX IF NOT EXISTS idx_jobs_budget_range
ON jobs (budget_min, budget_max)
WHERE status IN ('open', 'in_progress');

-- Job geospatial queries
-- Accelerates: Distance-based job searches
CREATE INDEX IF NOT EXISTS idx_jobs_coordinates
ON jobs (latitude, longitude)
WHERE status IN ('open', 'in_progress') AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Job category filtering
-- Accelerates: Category-based job searches
CREATE INDEX IF NOT EXISTS idx_jobs_category_status
ON jobs (category_id, status)
WHERE status IN ('open', 'in_progress');

-- Recent jobs
-- Accelerates: Chronological job sorting
CREATE INDEX IF NOT EXISTS idx_jobs_created_at_desc
ON jobs (created_at DESC)
WHERE status IN ('open', 'in_progress');

-- Job booked_at for tracking
-- Accelerates: Job booking history queries
CREATE INDEX IF NOT EXISTS idx_jobs_booked_at
ON jobs (booked_at)
WHERE booked_at IS NOT NULL;

-- ============================================================================
-- PROFILES INDEXES
-- ============================================================================

-- Rating-based filtering
-- Accelerates: Minimum rating filter
CREATE INDEX IF NOT EXISTS idx_profiles_rating_average
ON profiles (rating_average DESC)
WHERE rating_average IS NOT NULL AND rating_average > 0;

-- ID verification status
-- Accelerates: Verified provider filtering
CREATE INDEX IF NOT EXISTS idx_profiles_id_verified
ON profiles (id_verified)
WHERE id_verified = true;

-- Business verification status
-- Accelerates: Business verified provider filtering
CREATE INDEX IF NOT EXISTS idx_profiles_business_verified
ON profiles (business_verified)
WHERE business_verified = true;

-- Provider geospatial queries (for provider map pins)
-- Accelerates: Provider location searches on map
CREATE INDEX IF NOT EXISTS idx_profiles_coordinates
ON profiles (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- User type filtering
-- Accelerates: Provider vs Customer queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_type
ON profiles (user_type)
WHERE user_type IS NOT NULL;

-- ============================================================================
-- CATEGORIES INDEXES
-- ============================================================================

-- Active categories
-- Accelerates: Category filter modal loading
CREATE INDEX IF NOT EXISTS idx_categories_active_sort
ON categories (is_active, sort_order)
WHERE is_active = true;

-- Parent-child relationships
-- Accelerates: Subcategory lookups
CREATE INDEX IF NOT EXISTS idx_categories_parent_active
ON categories (parent_id, is_active)
WHERE parent_id IS NOT NULL AND is_active = true;

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Service listings: Combined filter + sort optimization
-- Accelerates: Filtered searches with distance + rating
CREATE INDEX IF NOT EXISTS idx_service_listings_filter_sort
ON service_listings (status, is_active, base_price, created_at DESC)
WHERE is_active = true AND status = 'active';

-- Jobs: Combined filter + sort optimization
-- Accelerates: Job searches with multiple filters
CREATE INDEX IF NOT EXISTS idx_jobs_filter_sort
ON jobs (status, pricing_type, created_at DESC)
WHERE status IN ('open', 'in_progress');

-- Profiles: Provider search optimization
-- Accelerates: Provider discovery queries
CREATE INDEX IF NOT EXISTS idx_profiles_provider_search
ON profiles (user_type, id_verified, rating_average DESC)
WHERE user_type = 'Provider';
