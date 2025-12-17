/*
  # AI Recommendations System

  1. New Tables
    - `user_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles, unique)
      - `favorite_categories` (jsonb array)
      - `search_history` (jsonb array)
      - `view_history` (jsonb array)
      - `booking_history_summary` (jsonb)
      - `location_preferences` (jsonb)
      - `budget_range` (jsonb)
      - `updated_at` (timestamptz)

    - `recommendations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `listing_id` (uuid, references service_listings)
      - `recommendation_type` (text: 'Personalized', 'Popular', 'Similar', 'NearYou')
      - `score` (numeric)
      - `reasoning` (text)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz)

    - `job_matches`
      - `id` (uuid, primary key)
      - `job_id` (uuid, references jobs)
      - `provider_id` (uuid, references profiles)
      - `match_score` (numeric)
      - `match_reasons` (jsonb array)
      - `status` (text: 'Suggested', 'Viewed', 'Applied', 'Rejected')
      - `created_at` (timestamptz)

    - `listing_suggestions`
      - `id` (uuid, primary key)
      - `listing_id` (uuid, references service_listings)
      - `suggested_category_id` (uuid, references categories)
      - `suggested_tags` (text array)
      - `confidence_score` (numeric)
      - `applied` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own recommendations

  3. Indexes
    - Add indexes for efficient querying
*/

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  favorite_categories jsonb DEFAULT '[]'::jsonb,
  search_history jsonb DEFAULT '[]'::jsonb,
  view_history jsonb DEFAULT '[]'::jsonb,
  booking_history_summary jsonb DEFAULT '{}'::jsonb,
  location_preferences jsonb DEFAULT '{}'::jsonb,
  budget_range jsonb DEFAULT '{"min": 0, "max": 10000}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Create recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES service_listings(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL CHECK (recommendation_type IN ('Personalized', 'Popular', 'Similar', 'NearYou', 'Trending')),
  score numeric(5, 2) DEFAULT 0.00 CHECK (score >= 0 AND score <= 100),
  reasoning text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

-- Create job_matches table
CREATE TABLE IF NOT EXISTS job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_score numeric(5, 2) DEFAULT 0.00 CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'Suggested' CHECK (status IN ('Suggested', 'Viewed', 'Applied', 'Rejected', 'Accepted')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, provider_id)
);

-- Create listing_suggestions table
CREATE TABLE IF NOT EXISTS listing_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES service_listings(id) ON DELETE CASCADE,
  suggested_category_id uuid REFERENCES categories(id),
  suggested_tags text[] DEFAULT ARRAY[]::text[],
  confidence_score numeric(5, 2) DEFAULT 0.00 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  applied boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_listing_id ON recommendations(listing_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_expires_at ON recommendations(expires_at);
CREATE INDEX IF NOT EXISTS idx_job_matches_job_id ON job_matches(job_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_provider_id ON job_matches(provider_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_status ON job_matches(status);
CREATE INDEX IF NOT EXISTS idx_listing_suggestions_listing_id ON listing_suggestions(listing_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for recommendations
CREATE POLICY "Users can view own recommendations"
  ON recommendations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for job_matches
CREATE POLICY "Providers can view own job matches"
  ON job_matches FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Job owners can view matches for their jobs"
  ON job_matches FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM jobs WHERE customer_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update match status"
  ON job_matches FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- RLS Policies for listing_suggestions
CREATE POLICY "Providers can view suggestions for own listings"
  ON listing_suggestions FOR SELECT
  TO authenticated
  USING (
    listing_id IN (
      SELECT id FROM service_listings WHERE provider_id = auth.uid()
    )
  );

-- Function to track listing view
CREATE OR REPLACE FUNCTION track_listing_view(p_user_id uuid, p_listing_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO user_preferences (user_id, view_history)
  VALUES (
    p_user_id,
    jsonb_build_array(jsonb_build_object(
      'listing_id', p_listing_id,
      'viewed_at', now()
    ))
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    view_history = CASE
      WHEN jsonb_array_length(user_preferences.view_history) >= 50 THEN
        user_preferences.view_history[1:49] || jsonb_build_array(jsonb_build_object(
          'listing_id', p_listing_id,
          'viewed_at', now()
        ))
      ELSE
        user_preferences.view_history || jsonb_build_array(jsonb_build_object(
          'listing_id', p_listing_id,
          'viewed_at', now()
        ))
    END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to track search
CREATE OR REPLACE FUNCTION track_search(p_user_id uuid, p_search_term text, p_category_id uuid DEFAULT NULL)
RETURNS void AS $$
BEGIN
  INSERT INTO user_preferences (user_id, search_history)
  VALUES (
    p_user_id,
    jsonb_build_array(jsonb_build_object(
      'term', p_search_term,
      'category_id', p_category_id,
      'searched_at', now()
    ))
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    search_history = CASE
      WHEN jsonb_array_length(user_preferences.search_history) >= 100 THEN
        user_preferences.search_history[1:99] || jsonb_build_array(jsonb_build_object(
          'term', p_search_term,
          'category_id', p_category_id,
          'searched_at', now()
        ))
      ELSE
        user_preferences.search_history || jsonb_build_array(jsonb_build_object(
          'term', p_search_term,
          'category_id', p_category_id,
          'searched_at', now()
        ))
    END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to generate job matches for a job
CREATE OR REPLACE FUNCTION generate_job_matches(p_job_id uuid)
RETURNS void AS $$
DECLARE
  v_job jobs;
  v_provider RECORD;
  v_match_score numeric;
  v_reasons jsonb;
BEGIN
  SELECT * INTO v_job FROM jobs WHERE id = p_job_id;
  
  FOR v_provider IN 
    SELECT p.*
    FROM profiles p
    INNER JOIN service_listings sl ON sl.provider_id = p.id
    WHERE p.user_type IN ('Provider', 'Both')
    AND sl.category_id = v_job.category_id
    AND sl.status = 'Active'
    GROUP BY p.id
  LOOP
    v_match_score := 70.0;
    v_reasons := '[]'::jsonb;
    
    v_reasons := v_reasons || jsonb_build_object('reason', 'Category match', 'points', 30);
    
    IF v_provider.rating_average >= 4.5 THEN
      v_match_score := v_match_score + 15;
      v_reasons := v_reasons || jsonb_build_object('reason', 'High rating', 'points', 15);
    END IF;
    
    IF v_provider.total_bookings >= 10 THEN
      v_match_score := v_match_score + 10;
      v_reasons := v_reasons || jsonb_build_object('reason', 'Experienced provider', 'points', 10);
    END IF;
    
    IF v_provider.is_verified THEN
      v_match_score := v_match_score + 5;
      v_reasons := v_reasons || jsonb_build_object('reason', 'Verified provider', 'points', 5);
    END IF;
    
    INSERT INTO job_matches (job_id, provider_id, match_score, match_reasons)
    VALUES (p_job_id, v_provider.id, LEAST(v_match_score, 100), v_reasons)
    ON CONFLICT (job_id, provider_id) DO UPDATE
    SET match_score = EXCLUDED.match_score, match_reasons = EXCLUDED.match_reasons;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create user preferences for existing users
INSERT INTO user_preferences (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM user_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Function to auto-create preferences for new users
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create preferences for new profiles
DROP TRIGGER IF EXISTS create_preferences_on_profile_create ON profiles;
CREATE TRIGGER create_preferences_on_profile_create
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_preferences();
