/*
  # Two-Sided Star Rating System Implementation

  ## Overview
  Upgrades Dollarsmiley to a modern two-sided marketplace rating system (similar to Airbnb/Upwork/Thumbtack)
  while preserving ALL existing reviews, business logic, and database integrity.

  ## Changes Applied

  ### 1. Review Direction Support
  - Added `review_direction` enum to reviews table
  - Existing reviews default to 'customer_to_provider'
  - Supports 'provider_to_customer' for Job Poster ratings

  ### 2. Customer Rating Aggregation
  - Added customer rating fields to profiles:
    - `customer_rating_average` - Average rating as a job poster/customer
    - `customer_review_count` - Total reviews received as customer
    - `job_poster_rating` - Specific rating for job posting behavior

  ### 3. Virtual Booking Creation for Custom Services
  - Auto-creates booking when production_order status = 'completed'
  - Links production_orders.booking_id → bookings.id
  - Enables standard review flow for custom services

  ### 4. Bidirectional Review Eligibility
  - Providers can rate customers on Jobs
  - Customers can rate providers on all booking types
  - Standard services: customer → provider only

  ### 5. Rating Display Context
  - Jobs show job poster ratings on cards
  - Provider profiles show segmented ratings by type
  - Customer profiles show job poster ratings

  ## Business Rules Preserved
  - Existing customer → provider ratings unchanged
  - One review per booking per direction
  - 7-day review window maintained
  - Review reminders continue to work
  - All existing aggregation logic preserved
*/

-- =============================================
-- STEP 1: ADD REVIEW DIRECTION SUPPORT
-- =============================================

-- Create review direction enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_direction_enum') THEN
    CREATE TYPE review_direction_enum AS ENUM (
      'customer_to_provider',
      'provider_to_customer'
    );
  END IF;
END $$;

-- Add review_direction column to reviews table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'review_direction'
  ) THEN
    ALTER TABLE reviews
    ADD COLUMN review_direction review_direction_enum DEFAULT 'customer_to_provider' NOT NULL;
  END IF;
END $$;

-- Create index for direction-based queries
CREATE INDEX IF NOT EXISTS idx_reviews_direction
  ON reviews(review_direction);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_direction
  ON reviews(reviewee_id, review_direction);

-- =============================================
-- STEP 2: ADD CUSTOMER RATING FIELDS TO PROFILES
-- =============================================

-- Add customer rating fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'customer_rating_average'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN customer_rating_average numeric(3, 2) CHECK (customer_rating_average >= 0 AND customer_rating_average <= 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'customer_review_count'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN customer_review_count integer DEFAULT 0 CHECK (customer_review_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'job_poster_rating'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN job_poster_rating numeric(3, 2) CHECK (job_poster_rating >= 0 AND job_poster_rating <= 5);
  END IF;
END $$;

-- Create indexes for customer ratings
CREATE INDEX IF NOT EXISTS idx_profiles_customer_rating
  ON profiles(customer_rating_average)
  WHERE customer_rating_average IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_job_poster_rating
  ON profiles(job_poster_rating)
  WHERE job_poster_rating IS NOT NULL;

-- =============================================
-- STEP 3: ADD REVIEW ELIGIBILITY FLAGS
-- =============================================

-- Add bidirectional review eligibility flags to bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'provider_can_review'
  ) THEN
    ALTER TABLE bookings
    ADD COLUMN provider_can_review boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'provider_review_submitted'
  ) THEN
    ALTER TABLE bookings
    ADD COLUMN provider_review_submitted boolean DEFAULT false;
  END IF;
END $$;

-- =============================================
-- STEP 4: VIRTUAL BOOKING CREATION FOR CUSTOM SERVICES
-- =============================================

-- Function to create virtual booking for completed production orders
CREATE OR REPLACE FUNCTION create_virtual_booking_for_production_order()
RETURNS TRIGGER AS $$
DECLARE
  v_booking_id uuid;
  v_listing_title text;
BEGIN
  -- Only proceed if status changed to 'completed' and no booking exists
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') AND NEW.booking_id IS NULL THEN

    -- Get listing title if available
    SELECT title INTO v_listing_title
    FROM service_listings
    WHERE id = NEW.listing_id
    LIMIT 1;

    -- Create virtual booking
    INSERT INTO bookings (
      listing_id,
      provider_id,
      customer_id,
      status,
      type,
      total_price,
      scheduled_date,
      scheduled_time,
      duration,
      payment_status,
      payment_intent_id,
      can_review,
      completed_at,
      created_at
    ) VALUES (
      NEW.listing_id,
      NEW.provider_id,
      NEW.customer_id,
      'Completed',
      'custom_service',
      COALESCE(NEW.final_price, NEW.escrow_amount, 0),
      CURRENT_TIMESTAMP,
      '00:00:00',
      60,
      'paid',
      NEW.payment_intent_id,
      true,
      CURRENT_TIMESTAMP,
      NEW.created_at
    )
    RETURNING id INTO v_booking_id;

    -- Link production order to the new booking
    NEW.booking_id := v_booking_id;

    -- Log timeline event
    INSERT INTO production_timeline_events (
      production_order_id,
      event_type,
      description,
      metadata
    ) VALUES (
      NEW.id,
      'virtual_booking_created',
      'Virtual booking created for review eligibility',
      jsonb_build_object(
        'booking_id', v_booking_id,
        'reason', 'custom_service_completion'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_virtual_booking_for_production_order ON production_orders;

-- Create trigger for virtual booking creation
CREATE TRIGGER trigger_create_virtual_booking_for_production_order
  BEFORE UPDATE ON production_orders
  FOR EACH ROW
  EXECUTE FUNCTION create_virtual_booking_for_production_order();

-- =============================================
-- STEP 5: UPDATE RATING AGGREGATION FUNCTIONS
-- =============================================

-- Function to update provider ratings (existing logic, direction-aware)
CREATE OR REPLACE FUNCTION update_provider_rating_on_review()
RETURNS TRIGGER AS $$
DECLARE
  v_avg_rating numeric;
  v_review_count integer;
BEGIN
  -- Only aggregate customer_to_provider reviews for provider ratings
  IF NEW.review_direction = 'customer_to_provider' THEN
    SELECT
      AVG(rating)::numeric(3, 2),
      COUNT(*)::integer
    INTO v_avg_rating, v_review_count
    FROM reviews
    WHERE reviewee_id = NEW.reviewee_id
      AND review_direction = 'customer_to_provider';

    UPDATE profiles
    SET
      rating_average = v_avg_rating,
      review_count = v_review_count,
      updated_at = now()
    WHERE id = NEW.reviewee_id;
  END IF;

  -- Update customer ratings for provider_to_customer reviews
  IF NEW.review_direction = 'provider_to_customer' THEN
    SELECT
      AVG(rating)::numeric(3, 2),
      COUNT(*)::integer
    INTO v_avg_rating, v_review_count
    FROM reviews
    WHERE reviewee_id = NEW.reviewee_id
      AND review_direction = 'provider_to_customer';

    UPDATE profiles
    SET
      customer_rating_average = v_avg_rating,
      customer_review_count = v_review_count,
      updated_at = now()
    WHERE id = NEW.reviewee_id;

    -- Update job poster rating specifically for job-related reviews
    IF EXISTS (
      SELECT 1 FROM bookings b
      INNER JOIN jobs j ON j.id = b.job_id
      WHERE b.id = NEW.booking_id
    ) THEN
      SELECT
        AVG(r.rating)::numeric(3, 2)
      INTO v_avg_rating
      FROM reviews r
      INNER JOIN bookings b ON b.id = r.booking_id
      INNER JOIN jobs j ON j.id = b.job_id
      WHERE r.reviewee_id = NEW.reviewee_id
        AND r.review_direction = 'provider_to_customer';

      UPDATE profiles
      SET
        job_poster_rating = v_avg_rating,
        updated_at = now()
      WHERE id = NEW.reviewee_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_update_provider_rating_on_review ON reviews;
CREATE TRIGGER trigger_update_provider_rating_on_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_rating_on_review();

-- =============================================
-- STEP 6: UPDATE REVIEW ELIGIBILITY ON BOOKING COMPLETION
-- =============================================

-- Function to enable bidirectional reviews on booking completion
CREATE OR REPLACE FUNCTION enable_bidirectional_reviews_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_is_job_booking boolean;
BEGIN
  -- Only proceed if status changed to Completed
  IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN

    -- Check if this is a job-related booking
    v_is_job_booking := (NEW.job_id IS NOT NULL);

    -- Customer can always review provider
    NEW.can_review := true;

    -- Provider can review customer only for Jobs and Custom Services with feature flag
    IF v_is_job_booking OR NEW.type = 'custom_service' THEN
      NEW.provider_can_review := true;
    ELSE
      -- Standard services: provider cannot review customer
      NEW.provider_can_review := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_enable_bidirectional_reviews_on_completion ON bookings;
CREATE TRIGGER trigger_enable_bidirectional_reviews_on_completion
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION enable_bidirectional_reviews_on_completion();

-- =============================================
-- STEP 7: UPDATE REVIEW SUBMISSION TRACKING
-- =============================================

-- Function to mark review as submitted
CREATE OR REPLACE FUNCTION mark_review_submitted()
RETURNS TRIGGER AS $$
BEGIN
  -- Update booking flags based on review direction
  IF NEW.review_direction = 'customer_to_provider' THEN
    UPDATE bookings
    SET review_submitted = true
    WHERE id = NEW.booking_id;
  ELSIF NEW.review_direction = 'provider_to_customer' THEN
    UPDATE bookings
    SET provider_review_submitted = true
    WHERE id = NEW.booking_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_mark_review_submitted ON reviews;
CREATE TRIGGER trigger_mark_review_submitted
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION mark_review_submitted();

-- =============================================
-- STEP 8: RLS POLICIES FOR BIDIRECTIONAL REVIEWS
-- =============================================

-- Allow providers to read reviews they've written
DROP POLICY IF EXISTS "Providers can view own reviews of customers" ON reviews;
CREATE POLICY "Providers can view own reviews of customers"
  ON reviews FOR SELECT
  TO authenticated
  USING (
    reviewer_id = auth.uid()
    AND review_direction = 'provider_to_customer'
  );

-- Allow customers to read reviews written about them
DROP POLICY IF EXISTS "Customers can view reviews about them" ON reviews;
CREATE POLICY "Customers can view reviews about them"
  ON reviews FOR SELECT
  TO authenticated
  USING (
    reviewee_id = auth.uid()
  );

-- Allow providers to write reviews about customers (jobs only enforced in app logic)
DROP POLICY IF EXISTS "Providers can review customers" ON reviews;
CREATE POLICY "Providers can review customers"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND review_direction = 'provider_to_customer'
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
        AND bookings.provider_id = auth.uid()
        AND bookings.status = 'Completed'
        AND bookings.provider_can_review = true
        AND bookings.provider_review_submitted = false
    )
  );

-- =============================================
-- STEP 9: HELPER FUNCTIONS FOR SCOPED RATINGS
-- =============================================

-- Function to get provider rating by booking type
CREATE OR REPLACE FUNCTION get_provider_rating_by_type(
  p_provider_id uuid,
  p_booking_type text DEFAULT NULL
)
RETURNS TABLE (
  rating_average numeric,
  review_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    AVG(r.rating)::numeric(3, 2) as rating_average,
    COUNT(r.id) as review_count
  FROM reviews r
  INNER JOIN bookings b ON b.id = r.booking_id
  WHERE r.reviewee_id = p_provider_id
    AND r.review_direction = 'customer_to_provider'
    AND (p_booking_type IS NULL OR b.type = p_booking_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get segmented provider ratings
CREATE OR REPLACE FUNCTION get_provider_segmented_ratings(p_provider_id uuid)
RETURNS TABLE (
  overall_rating numeric,
  overall_count bigint,
  job_rating numeric,
  job_count bigint,
  service_rating numeric,
  service_count bigint,
  custom_service_rating numeric,
  custom_service_count bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH rating_data AS (
    SELECT
      r.rating,
      CASE
        WHEN j.id IS NOT NULL THEN 'job'
        WHEN b.type = 'custom_service' THEN 'custom_service'
        ELSE 'service'
      END as booking_type
    FROM reviews r
    INNER JOIN bookings b ON b.id = r.booking_id
    LEFT JOIN jobs j ON j.id = b.job_id
    WHERE r.reviewee_id = p_provider_id
      AND r.review_direction = 'customer_to_provider'
  )
  SELECT
    AVG(rating)::numeric(3, 2) as overall_rating,
    COUNT(*) as overall_count,
    AVG(rating) FILTER (WHERE booking_type = 'job')::numeric(3, 2) as job_rating,
    COUNT(*) FILTER (WHERE booking_type = 'job') as job_count,
    AVG(rating) FILTER (WHERE booking_type = 'service')::numeric(3, 2) as service_rating,
    COUNT(*) FILTER (WHERE booking_type = 'service') as service_count,
    AVG(rating) FILTER (WHERE booking_type = 'custom_service')::numeric(3, 2) as custom_service_rating,
    COUNT(*) FILTER (WHERE booking_type = 'custom_service') as custom_service_count
  FROM rating_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_provider_rating_by_type TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_segmented_ratings TO authenticated;

-- =============================================
-- STEP 10: BACKFILL PROVIDER_CAN_REVIEW FOR EXISTING JOBS
-- =============================================

-- Enable provider reviews for completed job bookings
UPDATE bookings
SET provider_can_review = true
WHERE status = 'Completed'
  AND job_id IS NOT NULL
  AND provider_can_review IS NULL;

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON COLUMN reviews.review_direction IS 'Direction of review: customer_to_provider or provider_to_customer';
COMMENT ON COLUMN profiles.customer_rating_average IS 'Average rating received as a customer/job poster';
COMMENT ON COLUMN profiles.customer_review_count IS 'Total reviews received as a customer';
COMMENT ON COLUMN profiles.job_poster_rating IS 'Specific rating for job posting behavior';
COMMENT ON COLUMN bookings.provider_can_review IS 'Whether provider is eligible to review customer';
COMMENT ON COLUMN bookings.provider_review_submitted IS 'Whether provider has submitted review for customer';

COMMENT ON FUNCTION create_virtual_booking_for_production_order IS 'Auto-creates virtual booking when production order completes, enabling review flow';
COMMENT ON FUNCTION enable_bidirectional_reviews_on_completion IS 'Enables customer and provider review eligibility on booking completion (Jobs and Custom Services only)';
COMMENT ON FUNCTION get_provider_rating_by_type IS 'Returns provider rating filtered by booking type (job, service, custom_service)';
COMMENT ON FUNCTION get_provider_segmented_ratings IS 'Returns segmented ratings for provider across all booking types';
