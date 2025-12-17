/*
  # Add Performance Indexes

  1. Indexes for Common Queries
    - service_listings: category, provider, location, status
    - bookings: customer, provider, status, dates
    - transactions: user, type, status
    - notifications: user, read status
    - shipments: booking, tracking, status
    - cart_items: user
    - payout_schedules: provider, status, dates

  2. Composite Indexes
    - Multi-column indexes for complex queries
    - Covering indexes for frequently accessed data

  3. GIN Indexes
    - Full-text search on descriptions
    - JSONB fields for custom options
*/

-- ============================================================================
-- SERVICE LISTINGS INDEXES
-- ============================================================================

-- Category and status filtering (most common query)
CREATE INDEX IF NOT EXISTS idx_service_listings_category_status
  ON service_listings(category_id, is_active)
  WHERE is_active = true;

-- Provider's active listings
CREATE INDEX IF NOT EXISTS idx_service_listings_provider_active
  ON service_listings(provider_id, is_active)
  WHERE is_active = true;

-- Location-based search (with price range)
CREATE INDEX IF NOT EXISTS idx_service_listings_location
  ON service_listings(location)
  WHERE is_active = true;

-- Listing type filtering
CREATE INDEX IF NOT EXISTS idx_service_listings_type
  ON service_listings(listing_type, is_active)
  WHERE is_active = true;

-- Featured listings (priority display)
CREATE INDEX IF NOT EXISTS idx_service_listings_featured
  ON service_listings(is_featured, created_at DESC)
  WHERE is_active = true AND is_featured = true;

-- Full-text search on title and description
CREATE INDEX IF NOT EXISTS idx_service_listings_search
  ON service_listings USING GIN(to_tsvector('english', title || ' ' || description));

-- Price range queries
CREATE INDEX IF NOT EXISTS idx_service_listings_price
  ON service_listings(base_price)
  WHERE is_active = true;

-- ============================================================================
-- BOOKINGS INDEXES
-- ============================================================================

-- Customer's bookings by status
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status
  ON bookings(customer_id, status, created_at DESC);

-- Provider's bookings by status
CREATE INDEX IF NOT EXISTS idx_bookings_provider_status
  ON bookings(provider_id, status, created_at DESC);

-- Booking dates (for calendar view)
CREATE INDEX IF NOT EXISTS idx_bookings_dates
  ON bookings(booking_date, booking_time)
  WHERE status NOT IN ('Cancelled', 'Rejected');

-- Recent bookings (dashboard)
CREATE INDEX IF NOT EXISTS idx_bookings_recent
  ON bookings(created_at DESC)
  WHERE status != 'Cancelled';

-- Listing's bookings
CREATE INDEX IF NOT EXISTS idx_bookings_listing
  ON bookings(listing_id, status);

-- Completed bookings for reviews
CREATE INDEX IF NOT EXISTS idx_bookings_completed
  ON bookings(customer_id, status, completed_at DESC)
  WHERE status = 'Completed';

-- ============================================================================
-- TRANSACTIONS INDEXES
-- ============================================================================

-- User's transaction history
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions(user_id, created_at DESC);

-- Transaction type filtering
CREATE INDEX IF NOT EXISTS idx_transactions_type_status
  ON transactions(transaction_type, status, created_at DESC);

-- Booking transactions
CREATE INDEX IF NOT EXISTS idx_transactions_booking
  ON transactions(booking_id)
  WHERE booking_id IS NOT NULL;

-- Payment method transactions
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method
  ON transactions(payment_method_id)
  WHERE payment_method_id IS NOT NULL;

-- Amount range queries (for analytics)
CREATE INDEX IF NOT EXISTS idx_transactions_amount
  ON transactions(amount, created_at DESC);

-- ============================================================================
-- NOTIFICATIONS INDEXES
-- ============================================================================

-- User's unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE read = false;

-- All user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_all
  ON notifications(user_id, created_at DESC);

-- Notification type filtering
CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON notifications(type, created_at DESC);

-- ============================================================================
-- REVIEWS INDEXES
-- ============================================================================

-- Provider's reviews
CREATE INDEX IF NOT EXISTS idx_reviews_provider_rating
  ON reviews(provider_id, rating, created_at DESC);

-- Customer's reviews
CREATE INDEX IF NOT EXISTS idx_reviews_customer
  ON reviews(customer_id, created_at DESC);

-- Booking reviews
CREATE INDEX IF NOT EXISTS idx_reviews_booking
  ON reviews(booking_id);

-- Recent high-rated reviews
CREATE INDEX IF NOT EXISTS idx_reviews_high_rated
  ON reviews(rating, created_at DESC)
  WHERE rating >= 4;

-- ============================================================================
-- SHIPMENTS INDEXES
-- ============================================================================

-- Booking's shipment
CREATE INDEX IF NOT EXISTS idx_shipments_booking
  ON shipments(booking_id);

-- Tracking number lookup (very frequent)
CREATE INDEX IF NOT EXISTS idx_shipments_tracking
  ON shipments(tracking_number);

-- Carrier tracking
CREATE INDEX IF NOT EXISTS idx_shipments_carrier_tracking
  ON shipments(carrier_code, tracking_number);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_shipments_status
  ON shipments(status, updated_at DESC);

-- Active shipments (for monitoring)
CREATE INDEX IF NOT EXISTS idx_shipments_active
  ON shipments(status, created_at DESC)
  WHERE status NOT IN ('Delivered', 'Returned', 'Cancelled');

-- ============================================================================
-- CART INDEXES
-- ============================================================================

-- User's cart items
CREATE INDEX IF NOT EXISTS idx_cart_items_user
  ON cart_items(user_id, created_at DESC);

-- Listing's cart presence (for availability checks)
CREATE INDEX IF NOT EXISTS idx_cart_items_listing
  ON cart_items(listing_id);

-- ============================================================================
-- PAYOUT SCHEDULES INDEXES
-- ============================================================================

-- Provider's payouts by status
CREATE INDEX IF NOT EXISTS idx_payout_schedules_provider_status
  ON payout_schedules(provider_id, status, scheduled_payout_date DESC);

-- Pending payouts (for processing)
CREATE INDEX IF NOT EXISTS idx_payout_schedules_pending
  ON payout_schedules(scheduled_payout_date)
  WHERE status = 'Pending';

-- Early payout requests
CREATE INDEX IF NOT EXISTS idx_payout_schedules_early_requests
  ON payout_schedules(provider_id, early_payout_requested, created_at DESC)
  WHERE early_payout_requested = true AND status = 'Pending';

-- ============================================================================
-- VALUE-ADDED SERVICES INDEXES
-- ============================================================================

-- Listing's active VAS options
CREATE INDEX IF NOT EXISTS idx_vas_listing_active
  ON value_added_services(listing_id, is_active)
  WHERE is_active = true;

-- VAS price sorting
CREATE INDEX IF NOT EXISTS idx_vas_price
  ON value_added_services(listing_id, price);

-- ============================================================================
-- FULFILLMENT OPTIONS INDEXES
-- ============================================================================

-- Listing's fulfillment options
CREATE INDEX IF NOT EXISTS idx_fulfillment_options_listing
  ON fulfillment_options(listing_id);

-- Fulfillment type filtering
CREATE INDEX IF NOT EXISTS idx_fulfillment_options_type
  ON fulfillment_options(fulfillment_type);

-- ============================================================================
-- SOCIAL FEATURES INDEXES
-- ============================================================================

-- User's posts
CREATE INDEX IF NOT EXISTS idx_posts_user
  ON posts(user_id, created_at DESC);

-- Following feed
CREATE INDEX IF NOT EXISTS idx_posts_feed
  ON posts(created_at DESC)
  WHERE is_active = true;

-- User's followers
CREATE INDEX IF NOT EXISTS idx_follows_following
  ON follows(following_id, created_at DESC);

-- User's following
CREATE INDEX IF NOT EXISTS idx_follows_follower
  ON follows(follower_id, created_at DESC);

-- Mutual follows check
CREATE INDEX IF NOT EXISTS idx_follows_mutual
  ON follows(follower_id, following_id);

-- Post likes
CREATE INDEX IF NOT EXISTS idx_post_likes_post
  ON post_likes(post_id, created_at DESC);

-- User's liked posts
CREATE INDEX IF NOT EXISTS idx_post_likes_user
  ON post_likes(user_id, created_at DESC);

-- Post comments
CREATE INDEX IF NOT EXISTS idx_comments_post
  ON comments(post_id, created_at DESC);

-- ============================================================================
-- PROFILES INDEXES
-- ============================================================================

-- Provider search
CREATE INDEX IF NOT EXISTS idx_profiles_provider
  ON profiles(user_type)
  WHERE user_type = 'provider';

-- Verified providers
CREATE INDEX IF NOT EXISTS idx_profiles_verified
  ON profiles(is_verified, user_type)
  WHERE is_verified = true;

-- Location-based provider search
CREATE INDEX IF NOT EXISTS idx_profiles_location
  ON profiles(location);

-- Full-text search on bio
CREATE INDEX IF NOT EXISTS idx_profiles_search
  ON profiles USING GIN(to_tsvector('english', COALESCE(bio, '')));

-- ============================================================================
-- SEARCH ANALYTICS INDEXES
-- ============================================================================

-- Popular searches (analytics)
CREATE INDEX IF NOT EXISTS idx_search_analytics_query
  ON search_analytics(search_query, created_at DESC);

-- User's search history
CREATE INDEX IF NOT EXISTS idx_search_analytics_user
  ON search_analytics(user_id, created_at DESC);

-- ============================================================================
-- SAVED SEARCHES INDEXES
-- ============================================================================

-- User's saved searches
CREATE INDEX IF NOT EXISTS idx_saved_searches_user
  ON saved_searches(user_id, created_at DESC);

-- ============================================================================
-- SAVED JOBS INDEXES
-- ============================================================================

-- User's saved jobs
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user
  ON saved_jobs(user_id, created_at DESC);

-- Job's saves (for popularity)
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job
  ON saved_jobs(job_id);

-- ============================================================================
-- JSONB INDEXES
-- ============================================================================

-- Custom options search (for VAS, custom services)
CREATE INDEX IF NOT EXISTS idx_listings_custom_options
  ON service_listings USING GIN(custom_options)
  WHERE custom_options IS NOT NULL;

-- Metadata search
CREATE INDEX IF NOT EXISTS idx_listings_metadata
  ON service_listings USING GIN(metadata)
  WHERE metadata IS NOT NULL;

-- Tracking history (for shipments)
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_history
  ON shipments USING GIN(tracking_history)
  WHERE tracking_history IS NOT NULL;

-- ============================================================================
-- PARTIAL INDEXES FOR SPECIFIC USE CASES
-- ============================================================================

-- Only active, non-expired listings
CREATE INDEX IF NOT EXISTS idx_listings_available
  ON service_listings(created_at DESC)
  WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW());

-- Only confirmed bookings (for analytics)
CREATE INDEX IF NOT EXISTS idx_bookings_confirmed
  ON bookings(created_at DESC)
  WHERE status IN ('Confirmed', 'InProgress', 'Completed');

-- Only successful transactions
CREATE INDEX IF NOT EXISTS idx_transactions_successful
  ON transactions(created_at DESC)
  WHERE status = 'Completed';

-- ============================================================================
-- ANALYZE TABLES
-- ============================================================================

-- Update statistics for query planner
ANALYZE service_listings;
ANALYZE bookings;
ANALYZE transactions;
ANALYZE notifications;
ANALYZE reviews;
ANALYZE shipments;
ANALYZE cart_items;
ANALYZE payout_schedules;
ANALYZE profiles;
