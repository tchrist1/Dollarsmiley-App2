/*
  # Create Saved Searches System

  1. New Tables
    - `saved_searches`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text) - User-given name for the search
      - `search_type` (text) - providers, jobs, services
      - `search_criteria` (jsonb) - All search filters
      - `notification_enabled` (boolean) - Alert on new matches
      - `notification_frequency` (text) - instant, daily, weekly
      - `last_notified_at` (timestamptz)
      - `match_count` (integer) - Current number of matches
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `saved_search_matches`
      - `id` (uuid, primary key)
      - `saved_search_id` (uuid, references saved_searches)
      - `match_type` (text) - provider, job, listing
      - `match_id` (uuid) - ID of the matched item
      - `match_score` (numeric) - Relevance score
      - `is_new` (boolean) - Not seen by user yet
      - `notified` (boolean) - User was notified about this
      - `created_at` (timestamptz)

    - `saved_search_notifications`
      - `id` (uuid, primary key)
      - `saved_search_id` (uuid, references saved_searches)
      - `user_id` (uuid, references profiles)
      - `new_matches_count` (integer)
      - `match_ids` (uuid[])
      - `sent_at` (timestamptz)
      - `opened_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can manage their own saved searches
    - Users can view their own matches
    - System can create notifications

  3. Indexes
    - Index on user_id and search_type
    - Index on saved_search_id for matches
    - Index on notification status
*/

-- Create saved_searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Search details
  name text NOT NULL,
  search_type text NOT NULL CHECK (search_type IN ('providers', 'jobs', 'services', 'listings')),
  search_criteria jsonb DEFAULT '{}'::jsonb,

  -- Notification settings
  notification_enabled boolean DEFAULT true,
  notification_frequency text DEFAULT 'instant' CHECK (
    notification_frequency IN ('instant', 'daily', 'weekly', 'never')
  ),
  last_notified_at timestamptz,

  -- Statistics
  match_count integer DEFAULT 0,
  is_active boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create saved_search_matches table
CREATE TABLE IF NOT EXISTS saved_search_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id uuid REFERENCES saved_searches(id) ON DELETE CASCADE NOT NULL,

  -- Match details
  match_type text NOT NULL CHECK (match_type IN ('provider', 'job', 'listing', 'service')),
  match_id uuid NOT NULL,
  match_score numeric DEFAULT 100 CHECK (match_score >= 0 AND match_score <= 100),

  -- Status
  is_new boolean DEFAULT true,
  notified boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),

  UNIQUE(saved_search_id, match_id)
);

-- Create saved_search_notifications table
CREATE TABLE IF NOT EXISTS saved_search_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id uuid REFERENCES saved_searches(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Notification details
  new_matches_count integer DEFAULT 0,
  match_ids uuid[] DEFAULT ARRAY[]::uuid[],

  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,

  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_searches_user
  ON saved_searches(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_searches_type
  ON saved_searches(search_type, is_active);

CREATE INDEX IF NOT EXISTS idx_saved_searches_notification
  ON saved_searches(notification_enabled, notification_frequency)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_saved_search_matches_search
  ON saved_search_matches(saved_search_id);

CREATE INDEX IF NOT EXISTS idx_saved_search_matches_new
  ON saved_search_matches(saved_search_id, is_new)
  WHERE is_new = true;

CREATE INDEX IF NOT EXISTS idx_saved_search_matches_match
  ON saved_search_matches(match_id, match_type);

CREATE INDEX IF NOT EXISTS idx_saved_search_notifications_search
  ON saved_search_notifications(saved_search_id);

CREATE INDEX IF NOT EXISTS idx_saved_search_notifications_user
  ON saved_search_notifications(user_id, opened_at);

-- Enable RLS
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_search_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_search_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_searches

-- Users can manage their own saved searches
CREATE POLICY "Users can manage own saved searches"
  ON saved_searches
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for saved_search_matches

-- Users can view matches for their searches
CREATE POLICY "Users can view own search matches"
  ON saved_search_matches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM saved_searches
      WHERE saved_searches.id = saved_search_matches.saved_search_id
      AND saved_searches.user_id = auth.uid()
    )
  );

-- System can manage matches
CREATE POLICY "System can manage search matches"
  ON saved_search_matches
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for saved_search_notifications

-- Users can view their own notifications
CREATE POLICY "Users can view own search notifications"
  ON saved_search_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their notifications
CREATE POLICY "Users can update own notifications"
  ON saved_search_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System can create notifications
CREATE POLICY "System can create notifications"
  ON saved_search_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to execute saved search
CREATE OR REPLACE FUNCTION execute_saved_search(p_search_id uuid)
RETURNS TABLE (
  match_id uuid,
  match_type text,
  match_score numeric
) AS $$
DECLARE
  v_search_type text;
  v_criteria jsonb;
  v_query text;
BEGIN
  -- Get search details
  SELECT search_type, search_criteria INTO v_search_type, v_criteria
  FROM saved_searches
  WHERE id = p_search_id;

  IF v_search_type IS NULL THEN
    RAISE EXCEPTION 'Search not found';
  END IF;

  -- Execute search based on type
  IF v_search_type = 'providers' THEN
    RETURN QUERY
    SELECT
      p.id::uuid as match_id,
      'provider'::text as match_type,
      100::numeric as match_score
    FROM profiles p
    WHERE p.role = 'Provider'
    AND p.is_verified = true
    AND (
      v_criteria->>'category' IS NULL OR
      EXISTS (
        SELECT 1 FROM categories c
        WHERE c.id = p.category_id
        AND c.name ILIKE '%' || (v_criteria->>'category') || '%'
      )
    )
    AND (
      v_criteria->>'min_rating' IS NULL OR
      p.average_rating >= (v_criteria->>'min_rating')::numeric
    )
    AND (
      v_criteria->>'max_rate' IS NULL OR
      p.hourly_rate <= (v_criteria->>'max_rate')::numeric
    )
    LIMIT 50;

  ELSIF v_search_type = 'jobs' THEN
    RETURN QUERY
    SELECT
      j.id::uuid as match_id,
      'job'::text as match_type,
      100::numeric as match_score
    FROM job_postings j
    WHERE j.status = 'Open'
    AND (
      v_criteria->>'category' IS NULL OR
      EXISTS (
        SELECT 1 FROM categories c
        WHERE c.id = j.category_id
        AND c.name ILIKE '%' || (v_criteria->>'category') || '%'
      )
    )
    AND (
      v_criteria->>'min_budget' IS NULL OR
      j.budget >= (v_criteria->>'min_budget')::numeric
    )
    AND (
      v_criteria->>'max_budget' IS NULL OR
      j.budget <= (v_criteria->>'max_budget')::numeric
    )
    LIMIT 50;

  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update saved search matches
CREATE OR REPLACE FUNCTION update_saved_search_matches(p_search_id uuid)
RETURNS integer AS $$
DECLARE
  v_new_matches integer := 0;
  v_match record;
BEGIN
  -- Execute search and insert new matches
  FOR v_match IN
    SELECT * FROM execute_saved_search(p_search_id)
  LOOP
    INSERT INTO saved_search_matches (
      saved_search_id,
      match_type,
      match_id,
      match_score,
      is_new,
      notified
    )
    VALUES (
      p_search_id,
      v_match.match_type,
      v_match.match_id,
      v_match.match_score,
      true,
      false
    )
    ON CONFLICT (saved_search_id, match_id) DO NOTHING;

    IF FOUND THEN
      v_new_matches := v_new_matches + 1;
    END IF;
  END LOOP;

  -- Update match count
  UPDATE saved_searches
  SET match_count = (
    SELECT COUNT(*)
    FROM saved_search_matches
    WHERE saved_search_id = p_search_id
  ),
  updated_at = now()
  WHERE id = p_search_id;

  RETURN v_new_matches;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for new matches and send notifications
CREATE OR REPLACE FUNCTION check_saved_search_notifications()
RETURNS integer AS $$
DECLARE
  v_search record;
  v_new_matches integer;
  v_match_ids uuid[];
  v_notifications_sent integer := 0;
BEGIN
  FOR v_search IN
    SELECT id, user_id, notification_frequency, last_notified_at
    FROM saved_searches
    WHERE is_active = true
    AND notification_enabled = true
    AND (
      (notification_frequency = 'instant') OR
      (notification_frequency = 'daily' AND (last_notified_at IS NULL OR last_notified_at < now() - INTERVAL '1 day')) OR
      (notification_frequency = 'weekly' AND (last_notified_at IS NULL OR last_notified_at < now() - INTERVAL '7 days'))
    )
  LOOP
    -- Update matches
    v_new_matches := update_saved_search_matches(v_search.id);

    IF v_new_matches > 0 THEN
      -- Get new match IDs
      SELECT ARRAY_AGG(match_id) INTO v_match_ids
      FROM saved_search_matches
      WHERE saved_search_id = v_search.id
      AND is_new = true
      AND notified = false;

      -- Create notification
      INSERT INTO saved_search_notifications (
        saved_search_id,
        user_id,
        new_matches_count,
        match_ids
      )
      VALUES (
        v_search.id,
        v_search.user_id,
        v_new_matches,
        v_match_ids
      );

      -- Mark matches as notified
      UPDATE saved_search_matches
      SET notified = true
      WHERE saved_search_id = v_search.id
      AND is_new = true;

      -- Update last notified timestamp
      UPDATE saved_searches
      SET last_notified_at = now()
      WHERE id = v_search.id;

      v_notifications_sent := v_notifications_sent + 1;
    END IF;
  END LOOP;

  RETURN v_notifications_sent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark matches as seen
CREATE OR REPLACE FUNCTION mark_search_matches_seen(p_search_id uuid)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE saved_search_matches
  SET is_new = false
  WHERE saved_search_id = p_search_id
  AND is_new = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get saved search summary
CREATE OR REPLACE FUNCTION get_saved_search_summary(p_user_id uuid)
RETURNS TABLE (
  total_searches bigint,
  active_searches bigint,
  total_matches bigint,
  new_matches bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT ss.id) as total_searches,
    COUNT(DISTINCT ss.id) FILTER (WHERE ss.is_active = true) as active_searches,
    COUNT(ssm.id) as total_matches,
    COUNT(ssm.id) FILTER (WHERE ssm.is_new = true) as new_matches
  FROM saved_searches ss
  LEFT JOIN saved_search_matches ssm ON ssm.saved_search_id = ss.id
  WHERE ss.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_search_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_search_timestamp();
