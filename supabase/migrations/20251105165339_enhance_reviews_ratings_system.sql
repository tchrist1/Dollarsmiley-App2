/*
  # Enhance Reviews and Ratings System

  ## Overview
  Enhances existing reviews table with comprehensive rating features including
  moderation, verification, responses, votes, images, and aggregate statistics.

  ## Schema Changes
  
  ### Reviews Table Enhancements
  - Add `listing_id` (uuid) - service reviewed
  - Add `title` (text) - review headline
  - Add `would_recommend` (boolean) - recommendation flag
  - Add `response` (text) - provider's response
  - Add `response_date` (timestamptz) - when provider responded
  - Add `is_verified` (boolean) - verified booking badge
  - Add `is_flagged` (boolean) - flagged for moderation
  - Add `flag_reason` (text) - reason for flagging
  - Add `moderation_status` (text) - approval status
  - Add `moderated_by` (uuid) - admin who moderated
  - Add `moderated_at` (timestamptz)
  - Add `helpful_count` (integer) - helpful votes
  - Add `unhelpful_count` (integer) - unhelpful votes
  - Add `updated_at` (timestamptz)
  - Remove `is_provider_review` (not needed)

  ### New Tables
  
  #### `review_votes` - Vote tracking
  #### `review_images` - Photo uploads
  #### `provider_ratings` - Aggregated stats
  
  ### Bookings & Profiles Updates
  - Add review-related flags and cached ratings

  ## Important Notes
  - Preserves existing reviews data
  - Adds comprehensive review features
  - Auto-calculates provider ratings
  - Supports review moderation workflow
*/

-- Add new columns to existing reviews table
ALTER TABLE reviews 
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES service_listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title text DEFAULT '',
  ADD COLUMN IF NOT EXISTS would_recommend boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS response text,
  ADD COLUMN IF NOT EXISTS response_date timestamptz,
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text,
  ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'Approved',
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS helpful_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unhelpful_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add constraint for moderation_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reviews_moderation_status_check'
  ) THEN
    ALTER TABLE reviews
    ADD CONSTRAINT reviews_moderation_status_check
    CHECK (moderation_status IN ('Pending', 'Approved', 'Rejected', 'Hidden'));
  END IF;
END $$;

-- Update existing reviews to have default values
UPDATE reviews 
SET 
  title = COALESCE(title, 'Great service'),
  moderation_status = COALESCE(moderation_status, 'Approved'),
  updated_at = COALESCE(updated_at, created_at)
WHERE title IS NULL OR moderation_status IS NULL OR updated_at IS NULL;

-- Make title NOT NULL after setting defaults
ALTER TABLE reviews ALTER COLUMN title SET NOT NULL;

-- Drop is_provider_review column if it exists
ALTER TABLE reviews DROP COLUMN IF EXISTS is_provider_review;

-- Add columns to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'can_review'
  ) THEN
    ALTER TABLE bookings ADD COLUMN can_review boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'review_submitted'
  ) THEN
    ALTER TABLE bookings ADD COLUMN review_submitted boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'review_reminder_sent'
  ) THEN
    ALTER TABLE bookings ADD COLUMN review_reminder_sent boolean DEFAULT false;
  END IF;
END $$;

-- Add columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'average_rating'
  ) THEN
    ALTER TABLE profiles ADD COLUMN average_rating numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'total_reviews'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_reviews integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'rating_updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN rating_updated_at timestamptz;
  END IF;
END $$;

-- Create review_votes table
CREATE TABLE IF NOT EXISTS review_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vote_type text NOT NULL CHECK (vote_type IN ('helpful', 'unhelpful')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Create review_images table
CREATE TABLE IF NOT EXISTS review_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  caption text,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create provider_ratings table
CREATE TABLE IF NOT EXISTS provider_ratings (
  provider_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_reviews integer DEFAULT 0,
  average_rating numeric DEFAULT 0,
  rating_5_count integer DEFAULT 0,
  rating_4_count integer DEFAULT 0,
  rating_3_count integer DEFAULT 0,
  rating_2_count integer DEFAULT 0,
  rating_1_count integer DEFAULT 0,
  recommend_percentage numeric DEFAULT 0,
  response_rate numeric DEFAULT 0,
  last_review_date timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_ratings ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for reviews
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON reviews;
CREATE POLICY "Anyone can view approved reviews"
  ON reviews FOR SELECT
  USING (moderation_status = 'Approved');

DROP POLICY IF EXISTS "Users can create reviews for their bookings" ON reviews;
CREATE POLICY "Users can create reviews for their bookings"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
      AND bookings.customer_id = auth.uid()
      AND bookings.status = 'Completed'
    )
  );

DROP POLICY IF EXISTS "Users can update own reviews within 30 days" ON reviews;
CREATE POLICY "Users can update own reviews within 30 days"
  ON reviews FOR UPDATE
  TO authenticated
  USING (
    reviewer_id = auth.uid() AND
    created_at > now() - interval '30 days'
  );

DROP POLICY IF EXISTS "Providers can respond to reviews about them" ON reviews;
CREATE POLICY "Providers can respond to reviews about them"
  ON reviews FOR UPDATE
  TO authenticated
  USING (reviewee_id = auth.uid());

-- RLS Policies for review_votes
CREATE POLICY "Anyone can view review votes"
  ON review_votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote on reviews"
  ON review_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own votes"
  ON review_votes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own votes"
  ON review_votes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for review_images
CREATE POLICY "Anyone can view review images"
  ON review_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_id
      AND reviews.moderation_status = 'Approved'
    )
  );

CREATE POLICY "Users can upload images for their reviews"
  ON review_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_id
      AND reviews.reviewer_id = auth.uid()
    )
  );

-- RLS Policies for provider_ratings
CREATE POLICY "Anyone can view provider ratings"
  ON provider_ratings FOR SELECT
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_moderation ON reviews(moderation_status);
CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_votes_user ON review_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_images_review ON review_images(review_id);

-- Function to update provider ratings
CREATE OR REPLACE FUNCTION update_provider_ratings()
RETURNS TRIGGER AS $$
DECLARE
  provider uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    provider := OLD.reviewee_id;
  ELSE
    provider := NEW.reviewee_id;
  END IF;

  INSERT INTO provider_ratings (provider_id)
  VALUES (provider)
  ON CONFLICT (provider_id) DO NOTHING;

  UPDATE provider_ratings
  SET
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE reviewee_id = provider
      AND moderation_status = 'Approved'
    ),
    average_rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
      FROM reviews
      WHERE reviewee_id = provider
      AND moderation_status = 'Approved'
    ),
    rating_5_count = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = provider AND moderation_status = 'Approved' AND rating = 5),
    rating_4_count = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = provider AND moderation_status = 'Approved' AND rating = 4),
    rating_3_count = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = provider AND moderation_status = 'Approved' AND rating = 3),
    rating_2_count = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = provider AND moderation_status = 'Approved' AND rating = 2),
    rating_1_count = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = provider AND moderation_status = 'Approved' AND rating = 1),
    recommend_percentage = (
      SELECT COALESCE(
        ROUND((COUNT(*) FILTER (WHERE would_recommend = true)::numeric / NULLIF(COUNT(*), 0)) * 100, 1),
        0
      )
      FROM reviews
      WHERE reviewee_id = provider
      AND moderation_status = 'Approved'
    ),
    response_rate = (
      SELECT COALESCE(
        ROUND((COUNT(*) FILTER (WHERE response IS NOT NULL)::numeric / NULLIF(COUNT(*), 0)) * 100, 1),
        0
      )
      FROM reviews
      WHERE reviewee_id = provider
      AND moderation_status = 'Approved'
    ),
    last_review_date = (
      SELECT MAX(created_at)
      FROM reviews
      WHERE reviewee_id = provider
      AND moderation_status = 'Approved'
    ),
    updated_at = now()
  WHERE provider_id = provider;

  UPDATE profiles
  SET
    average_rating = (SELECT average_rating FROM provider_ratings WHERE provider_id = provider),
    total_reviews = (SELECT total_reviews FROM provider_ratings WHERE provider_id = provider),
    rating_updated_at = now()
  WHERE id = provider;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update provider ratings
DROP TRIGGER IF EXISTS trigger_update_provider_ratings ON reviews;
CREATE TRIGGER trigger_update_provider_ratings
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_ratings();

-- Function to update review vote counts
CREATE OR REPLACE FUNCTION update_review_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
  review_record uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    review_record := OLD.review_id;
  ELSE
    review_record := NEW.review_id;
  END IF;

  UPDATE reviews
  SET
    helpful_count = (SELECT COUNT(*) FROM review_votes WHERE review_id = review_record AND vote_type = 'helpful'),
    unhelpful_count = (SELECT COUNT(*) FROM review_votes WHERE review_id = review_record AND vote_type = 'unhelpful')
  WHERE id = review_record;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update vote counts
DROP TRIGGER IF EXISTS trigger_update_vote_counts ON review_votes;
CREATE TRIGGER trigger_update_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON review_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_vote_counts();

-- Function to mark booking as reviewed
CREATE OR REPLACE FUNCTION mark_booking_reviewed()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bookings
  SET review_submitted = true
  WHERE id = NEW.booking_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to mark booking as reviewed
DROP TRIGGER IF EXISTS trigger_mark_booking_reviewed ON reviews;
CREATE TRIGGER trigger_mark_booking_reviewed
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION mark_booking_reviewed();