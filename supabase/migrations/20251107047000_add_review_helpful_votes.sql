/*
  # Add Helpful Votes on Reviews

  ## Overview
  Allows users to vote on whether reviews are helpful, providing social validation
  and enabling better review sorting/ranking.

  ## New Tables

  ### 1. `review_helpful_votes`
  Tracks helpful votes on reviews
  - `id` (uuid, primary key)
  - `review_id` (uuid, references reviews)
  - `user_id` (uuid, references profiles)
  - `is_helpful` (boolean) - true = helpful, false = not helpful
  - `created_at` (timestamptz)
  - Unique constraint on (review_id, user_id)

  ## Features
  - One vote per user per review
  - Toggle vote (change helpful/not helpful)
  - Remove vote
  - Count helpful votes
  - Percentage calculation
  - Sort reviews by helpfulness

  ## Triggers
  - Update review helpful counts
  - Prevent voting on own reviews

  ## Security
  - RLS enabled
  - Users can vote on reviews
  - Users can change their own votes
*/

-- Create review_helpful_votes table
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_helpful boolean NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review ON review_helpful_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_user ON review_helpful_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_helpful ON review_helpful_votes(review_id, is_helpful);

-- Enable RLS
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- Users can view all votes
CREATE POLICY "Anyone can view helpful votes"
  ON review_helpful_votes FOR SELECT
  USING (true);

-- Users can insert votes (except on own reviews)
CREATE POLICY "Users can vote on reviews"
  ON review_helpful_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    NOT EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_id
      AND reviews.reviewer_id = auth.uid()
    )
  );

-- Users can update their own votes
CREATE POLICY "Users can update own votes"
  ON review_helpful_votes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes"
  ON review_helpful_votes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add helpful vote columns to reviews table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'helpful_count'
  ) THEN
    ALTER TABLE reviews ADD COLUMN helpful_count int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'not_helpful_count'
  ) THEN
    ALTER TABLE reviews ADD COLUMN not_helpful_count int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'total_votes'
  ) THEN
    ALTER TABLE reviews ADD COLUMN total_votes int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'helpfulness_score'
  ) THEN
    ALTER TABLE reviews ADD COLUMN helpfulness_score numeric DEFAULT 0;
  END IF;
END $$;

-- Function to update review helpful counts
CREATE OR REPLACE FUNCTION update_review_helpful_counts()
RETURNS TRIGGER AS $$
DECLARE
  helpful_votes int;
  not_helpful_votes int;
  total int;
  score numeric;
BEGIN
  -- Count votes for the review
  SELECT
    COUNT(*) FILTER (WHERE is_helpful = true),
    COUNT(*) FILTER (WHERE is_helpful = false),
    COUNT(*)
  INTO helpful_votes, not_helpful_votes, total
  FROM review_helpful_votes
  WHERE review_id = COALESCE(NEW.review_id, OLD.review_id);

  -- Calculate helpfulness score (percentage)
  IF total > 0 THEN
    score := (helpful_votes::numeric / total) * 100;
  ELSE
    score := 0;
  END IF;

  -- Update review counts
  UPDATE reviews
  SET
    helpful_count = helpful_votes,
    not_helpful_count = not_helpful_votes,
    total_votes = total,
    helpfulness_score = score
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update counts on vote changes
DROP TRIGGER IF EXISTS update_review_helpful_counts_trigger ON review_helpful_votes;
CREATE TRIGGER update_review_helpful_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON review_helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_counts();

-- Function to vote on review
CREATE OR REPLACE FUNCTION vote_review_helpful(
  review_id_param uuid,
  is_helpful_param boolean
)
RETURNS jsonb AS $$
DECLARE
  existing_vote RECORD;
  review_owner uuid;
  result jsonb;
BEGIN
  -- Check if user is voting on their own review
  SELECT reviewer_id INTO review_owner
  FROM reviews
  WHERE id = review_id_param;

  IF review_owner = auth.uid() THEN
    RAISE EXCEPTION 'Cannot vote on your own review';
  END IF;

  -- Check for existing vote
  SELECT * INTO existing_vote
  FROM review_helpful_votes
  WHERE review_id = review_id_param
  AND user_id = auth.uid();

  IF FOUND THEN
    -- Update existing vote
    IF existing_vote.is_helpful = is_helpful_param THEN
      -- Same vote, remove it (toggle off)
      DELETE FROM review_helpful_votes
      WHERE id = existing_vote.id;

      result := jsonb_build_object(
        'action', 'removed',
        'previous_vote', existing_vote.is_helpful
      );
    ELSE
      -- Different vote, update it
      UPDATE review_helpful_votes
      SET is_helpful = is_helpful_param
      WHERE id = existing_vote.id;

      result := jsonb_build_object(
        'action', 'updated',
        'previous_vote', existing_vote.is_helpful,
        'new_vote', is_helpful_param
      );
    END IF;
  ELSE
    -- Insert new vote
    INSERT INTO review_helpful_votes (review_id, user_id, is_helpful)
    VALUES (review_id_param, auth.uid(), is_helpful_param);

    result := jsonb_build_object(
      'action', 'added',
      'new_vote', is_helpful_param
    );
  END IF;

  -- Return updated counts
  SELECT jsonb_build_object(
    'action', result->>'action',
    'helpful_count', helpful_count,
    'not_helpful_count', not_helpful_count,
    'total_votes', total_votes,
    'helpfulness_score', helpfulness_score
  ) INTO result
  FROM reviews
  WHERE id = review_id_param;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's vote on a review
CREATE OR REPLACE FUNCTION get_user_review_vote(
  review_id_param uuid,
  user_id_param uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  vote_record RECORD;
  target_user uuid;
BEGIN
  target_user := COALESCE(user_id_param, auth.uid());

  SELECT * INTO vote_record
  FROM review_helpful_votes
  WHERE review_id = review_id_param
  AND user_id = target_user;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'has_voted', true,
      'is_helpful', vote_record.is_helpful,
      'voted_at', vote_record.created_at
    );
  ELSE
    RETURN jsonb_build_object(
      'has_voted', false,
      'is_helpful', null,
      'voted_at', null
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get most helpful reviews
CREATE OR REPLACE FUNCTION get_most_helpful_reviews(
  provider_id_param uuid DEFAULT NULL,
  limit_param int DEFAULT 10,
  min_votes_param int DEFAULT 5
)
RETURNS TABLE (
  review_id uuid,
  rating int,
  title text,
  comment text,
  reviewer_name text,
  helpful_count int,
  total_votes int,
  helpfulness_score numeric,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.rating,
    r.title,
    r.comment,
    p.full_name,
    r.helpful_count,
    r.total_votes,
    r.helpfulness_score,
    r.created_at
  FROM reviews r
  JOIN profiles p ON r.reviewer_id = p.id
  WHERE (provider_id_param IS NULL OR r.reviewee_id = provider_id_param)
  AND r.total_votes >= min_votes_param
  ORDER BY r.helpfulness_score DESC, r.helpful_count DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get review helpfulness statistics
CREATE OR REPLACE FUNCTION get_review_helpfulness_stats(
  provider_id_param uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_reviews', COUNT(*),
    'reviews_with_votes', COUNT(*) FILTER (WHERE total_votes > 0),
    'total_helpful_votes', SUM(helpful_count),
    'total_not_helpful_votes', SUM(not_helpful_count),
    'total_votes', SUM(total_votes),
    'avg_helpfulness_score', ROUND(AVG(helpfulness_score) FILTER (WHERE total_votes > 0), 2),
    'reviews_by_helpfulness', jsonb_build_object(
      'highly_helpful', COUNT(*) FILTER (WHERE helpfulness_score >= 80 AND total_votes >= 3),
      'helpful', COUNT(*) FILTER (WHERE helpfulness_score >= 60 AND helpfulness_score < 80 AND total_votes >= 3),
      'mixed', COUNT(*) FILTER (WHERE helpfulness_score >= 40 AND helpfulness_score < 60 AND total_votes >= 3),
      'not_helpful', COUNT(*) FILTER (WHERE helpfulness_score < 40 AND total_votes >= 3)
    )
  ) INTO stats
  FROM reviews
  WHERE provider_id_param IS NULL OR reviewee_id = provider_id_param;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for reviews with vote info
CREATE OR REPLACE VIEW reviews_with_helpfulness AS
SELECT
  r.*,
  r.helpful_count,
  r.not_helpful_count,
  r.total_votes,
  r.helpfulness_score,
  CASE
    WHEN r.total_votes >= 3 AND r.helpfulness_score >= 80 THEN 'highly_helpful'
    WHEN r.total_votes >= 3 AND r.helpfulness_score >= 60 THEN 'helpful'
    WHEN r.total_votes >= 3 AND r.helpfulness_score >= 40 THEN 'mixed'
    WHEN r.total_votes >= 3 THEN 'not_helpful'
    ELSE 'insufficient_votes'
  END as helpfulness_category
FROM reviews r;

-- Award XP for helpful reviews (when they reach milestones)
CREATE OR REPLACE FUNCTION award_helpful_review_xp()
RETURNS TRIGGER AS $$
DECLARE
  review_author uuid;
BEGIN
  -- Get review author
  SELECT reviewer_id INTO review_author
  FROM reviews
  WHERE id = NEW.review_id;

  -- Award XP for milestones (5, 10, 25, 50, 100 helpful votes)
  IF NEW.helpful_count IN (5, 10, 25, 50, 100) THEN
    -- Award XP to review author
    UPDATE user_gamification
    SET
      current_xp = current_xp + (NEW.helpful_count / 5 * 10),
      total_xp = total_xp + (NEW.helpful_count / 5 * 10)
    WHERE user_id = review_author;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to award XP
DROP TRIGGER IF EXISTS award_helpful_review_xp_trigger ON reviews;
CREATE TRIGGER award_helpful_review_xp_trigger
  AFTER UPDATE OF helpful_count ON reviews
  FOR EACH ROW
  WHEN (NEW.helpful_count > OLD.helpful_count)
  EXECUTE FUNCTION award_helpful_review_xp();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION vote_review_helpful(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_review_vote(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_most_helpful_reviews(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_review_helpfulness_stats(uuid) TO authenticated;

-- Grant access to view
GRANT SELECT ON reviews_with_helpfulness TO authenticated, anon;
