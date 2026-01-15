/*
  # Add Missing Foreign Key Indexes
  
  ## Performance Advisor Remediation
  
  This migration addresses Performance Advisor INFO suggestions for unindexed foreign keys.
  Foreign key columns are frequently used in JOIN operations and should be indexed.
  
  ## Tables Affected
  - `booking_service_agreements` - add index on `agreement_id`
  - `expense_category_mappings` - add index on `expense_category_id`
  - `reviews` - add index on `reviewer_id`
  - `user_favorites` - add index on `listing_id`
  
  ## Performance Impact
  - Improves JOIN performance for agreement lookups
  - Speeds up expense category queries
  - Accelerates reviewer profile queries
  - Optimizes favorite listing lookups
  
  ## Safety
  - IF NOT EXISTS prevents errors on re-run
  - Read-heavy tables with low write volume
  - Indexes created during low-traffic window
*/

-- Index on booking_service_agreements.agreement_id
-- Used for: Booking → Agreement JOIN queries
CREATE INDEX IF NOT EXISTS idx_booking_service_agreements_agreement_id
ON public.booking_service_agreements(agreement_id);

-- Index on expense_category_mappings.expense_category_id
-- Used for: Service → Expense Category JOIN queries
CREATE INDEX IF NOT EXISTS idx_expense_category_mappings_expense_category_id
ON public.expense_category_mappings(expense_category_id);

-- Index on reviews.reviewer_id
-- Used for: "Find reviews by this user" queries
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id
ON public.reviews(reviewer_id);

-- Index on user_favorites.listing_id
-- Used for: "Who favorited this listing" queries
CREATE INDEX IF NOT EXISTS idx_user_favorites_listing_id
ON public.user_favorites(listing_id);
