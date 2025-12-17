/*
  # Implement Review Response System for Providers

  ## Overview
  Allows providers to respond to customer reviews, creating dialogue and demonstrating
  customer service. Supports single response per review with edit capability.

  ## New Tables

  ### 1. `review_responses`
  Stores provider responses to reviews
  - `id` (uuid, primary key)
  - `review_id` (uuid, references reviews, unique)
  - `provider_id` (uuid, references profiles)
  - `response_text` (text) - The response content
  - `is_edited` (boolean) - Whether edited after posting
  - `edited_at` (timestamptz) - Last edit timestamp
  - `created_at` (timestamptz)

  ## Features
  - One response per review
  - Provider can edit response
  - Notification to customer
  - Edit history tracking
  - Character limits

  ## Triggers
  - Notify customer on response
  - Award XP for responding

  ## Security
  - RLS enabled
  - Public can view responses
  - Only provider can respond to their reviews
  - Only provider can edit their response
*/

-- Create review_responses table
CREATE TABLE IF NOT EXISTS review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE NOT NULL UNIQUE,
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  response_text text NOT NULL CHECK (length(response_text) >= 10 AND length(response_text) <= 1000),
  is_edited boolean DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_review_responses_review ON review_responses(review_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_provider ON review_responses(provider_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_created ON review_responses(created_at DESC);

-- Enable RLS
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can view review responses
CREATE POLICY "Anyone can view review responses"
  ON review_responses FOR SELECT
  USING (true);

-- Providers can insert response to their own reviews
CREATE POLICY "Providers can respond to their reviews"
  ON review_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_id
      AND reviews.reviewee_id = auth.uid()
    )
  );

-- Providers can update their own responses
CREATE POLICY "Providers can update own responses"
  ON review_responses FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Providers can delete their own responses
CREATE POLICY "Providers can delete own responses"
  ON review_responses FOR DELETE
  TO authenticated
  USING (provider_id = auth.uid());

-- Function to add review response
CREATE OR REPLACE FUNCTION add_review_response(
  review_id_param uuid,
  response_text_param text
)
RETURNS uuid AS $$
DECLARE
  response_id uuid;
  review_record RECORD;
  provider_name text;
BEGIN
  -- Get review details
  SELECT * INTO review_record
  FROM reviews
  WHERE id = review_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found';
  END IF;

  -- Verify the current user is the provider being reviewed
  IF review_record.reviewee_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to respond to this review';
  END IF;

  -- Check if response already exists
  IF EXISTS (SELECT 1 FROM review_responses WHERE review_id = review_id_param) THEN
    RAISE EXCEPTION 'Response already exists for this review';
  END IF;

  -- Get provider name
  SELECT full_name INTO provider_name
  FROM profiles
  WHERE id = auth.uid();

  -- Insert response
  INSERT INTO review_responses (
    review_id,
    provider_id,
    response_text
  ) VALUES (
    review_id_param,
    auth.uid(),
    response_text_param
  ) RETURNING id INTO response_id;

  -- Create notification for reviewer
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    review_record.reviewer_id,
    'review_response',
    'Provider responded to your review',
    provider_name || ' has responded to your review',
    jsonb_build_object(
      'review_id', review_id_param,
      'response_id', response_id,
      'provider_id', auth.uid(),
      'action_url', '/reviews/' || review_record.reviewee_id
    )
  );

  -- Award XP for responding
  UPDATE user_gamification
  SET current_xp = current_xp + 10,
      total_xp = total_xp + 10
  WHERE user_id = auth.uid();

  RETURN response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update review response
CREATE OR REPLACE FUNCTION update_review_response(
  response_id_param uuid,
  response_text_param text
)
RETURNS boolean AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM review_responses
    WHERE id = response_id_param
    AND provider_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to update this response';
  END IF;

  -- Update response
  UPDATE review_responses
  SET
    response_text = response_text_param,
    is_edited = true,
    edited_at = NOW()
  WHERE id = response_id_param;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete review response
CREATE OR REPLACE FUNCTION delete_review_response(response_id_param uuid)
RETURNS boolean AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM review_responses
    WHERE id = response_id_param
    AND provider_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to delete this response';
  END IF;

  -- Delete response
  DELETE FROM review_responses WHERE id = response_id_param;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get review with response
CREATE OR REPLACE FUNCTION get_review_with_response(review_id_param uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'review', row_to_json(r),
    'response', (
      SELECT row_to_json(rr)
      FROM review_responses rr
      WHERE rr.review_id = r.id
    ),
    'media', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', rm.id,
            'media_type', rm.media_type,
            'file_url', rm.file_url,
            'thumbnail_url', rm.thumbnail_url,
            'order_index', rm.order_index
          ) ORDER BY rm.order_index
        )
        FROM review_media rm
        WHERE rm.review_id = r.id
        AND rm.moderation_status = 'Approved'
      ),
      '[]'::jsonb
    )
  ) INTO result
  FROM reviews r
  WHERE r.id = review_id_param;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get provider's reviews needing response
CREATE OR REPLACE FUNCTION get_reviews_needing_response(provider_id_param uuid DEFAULT NULL)
RETURNS TABLE (
  review_id uuid,
  reviewer_id uuid,
  reviewer_name text,
  rating int,
  comment text,
  created_at timestamptz,
  booking_id uuid,
  days_since_review int
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.reviewer_id,
    p.full_name,
    r.rating,
    r.comment,
    r.created_at,
    r.booking_id,
    EXTRACT(DAY FROM (NOW() - r.created_at))::int as days_since_review
  FROM reviews r
  JOIN profiles p ON r.reviewer_id = p.id
  LEFT JOIN review_responses rr ON r.id = rr.review_id
  WHERE r.reviewee_id = COALESCE(provider_id_param, auth.uid())
  AND rr.id IS NULL
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get response statistics
CREATE OR REPLACE FUNCTION get_review_response_stats(provider_id_param uuid DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
  target_provider uuid;
BEGIN
  target_provider := COALESCE(provider_id_param, auth.uid());

  SELECT jsonb_build_object(
    'total_reviews', COUNT(DISTINCT r.id),
    'total_responses', COUNT(DISTINCT rr.id),
    'response_rate', ROUND(
      (COUNT(DISTINCT rr.id)::numeric / NULLIF(COUNT(DISTINCT r.id), 0) * 100), 2
    ),
    'avg_response_time_hours', ROUND(
      AVG(EXTRACT(EPOCH FROM (rr.created_at - r.created_at)) / 3600)::numeric, 2
    ),
    'responses_edited', COUNT(*) FILTER (WHERE rr.is_edited = true),
    'reviews_needing_response', COUNT(*) FILTER (WHERE rr.id IS NULL)
  ) INTO stats
  FROM reviews r
  LEFT JOIN review_responses rr ON r.id = rr.review_id
  WHERE r.reviewee_id = target_provider;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for reviews with responses
CREATE OR REPLACE VIEW reviews_with_responses AS
SELECT
  r.*,
  rr.id as response_id,
  rr.response_text,
  rr.is_edited as response_is_edited,
  rr.edited_at as response_edited_at,
  rr.created_at as response_created_at,
  CASE
    WHEN rr.id IS NOT NULL THEN true
    ELSE false
  END as has_response
FROM reviews r
LEFT JOIN review_responses rr ON r.id = rr.review_id;

-- Add response count to provider stats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'review_response_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN review_response_count int DEFAULT 0;
  END IF;
END $$;

-- Function to update provider response count
CREATE OR REPLACE FUNCTION update_provider_response_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles
    SET review_response_count = review_response_count + 1
    WHERE id = NEW.provider_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles
    SET review_response_count = review_response_count - 1
    WHERE id = OLD.provider_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update response count
DROP TRIGGER IF EXISTS update_provider_response_count_trigger ON review_responses;
CREATE TRIGGER update_provider_response_count_trigger
  AFTER INSERT OR DELETE ON review_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_response_count();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_review_response(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_review_response(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_review_response(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_review_with_response(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_reviews_needing_response(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_review_response_stats(uuid) TO authenticated;

-- Grant access to view
GRANT SELECT ON reviews_with_responses TO authenticated, anon;
