/*
  # Create Search Analytics System

  1. New Tables
    - `search_analytics`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles, nullable for anonymous)
      - `session_id` (uuid) - Track search sessions
      - `search_query` (text) - The search text
      - `search_type` (text) - text, voice, image, filter
      - `search_category` (text) - providers, jobs, services
      - `filters_applied` (jsonb) - All filters used
      - `results_count` (integer) - Number of results
      - `results_clicked` (integer[]) - Indices of clicked results
      - `first_click_position` (integer) - Position of first click
      - `time_to_first_click` (integer) - Milliseconds to first click
      - `search_duration` (integer) - Total time on results (ms)
      - `refinement_count` (integer) - How many times refined
      - `converted` (boolean) - Led to booking/quote
      - `conversion_type` (text) - booking, quote, message, profile_view
      - `device_type` (text) - mobile, tablet, desktop
      - `created_at` (timestamptz)

    - `popular_searches`
      - `id` (uuid, primary key)
      - `query` (text, unique)
      - `search_count` (integer)
      - `click_through_rate` (numeric)
      - `conversion_rate` (numeric)
      - `avg_results_count` (numeric)
      - `last_searched_at` (timestamptz)
      - `trending_score` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `search_suggestions`
      - `id` (uuid, primary key)
      - `query` (text)
      - `suggested_query` (text)
      - `suggestion_type` (text) - autocomplete, did_you_mean, related
      - `acceptance_count` (integer)
      - `show_count` (integer)
      - `acceptance_rate` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `zero_result_searches`
      - `id` (uuid, primary key)
      - `query` (text)
      - `search_type` (text)
      - `filters_applied` (jsonb)
      - `occurrence_count` (integer)
      - `last_occurred_at` (timestamptz)
      - `created_at` (timestamptz)

    - `search_trends`
      - `id` (uuid, primary key)
      - `query` (text)
      - `category` (text)
      - `search_count` (integer)
      - `trend_date` (date)
      - `hour_of_day` (integer)
      - `day_of_week` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on search_analytics (user access only)
    - Public read on popular_searches and suggestions
    - Admin access for zero_result_searches and trends

  3. Indexes
    - Performance indexes for analytics queries
    - Time-series indexes for trend analysis
*/

-- Create search_analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id uuid NOT NULL,

  -- Search details
  search_query text,
  search_type text DEFAULT 'text' CHECK (search_type IN ('text', 'voice', 'image', 'filter')),
  search_category text CHECK (search_category IN ('providers', 'jobs', 'services', 'listings')),

  -- Filters and results
  filters_applied jsonb DEFAULT '{}'::jsonb,
  results_count integer DEFAULT 0,
  results_clicked integer[] DEFAULT ARRAY[]::integer[],
  first_click_position integer,
  time_to_first_click integer,

  -- Engagement metrics
  search_duration integer,
  refinement_count integer DEFAULT 0,

  -- Conversion tracking
  converted boolean DEFAULT false,
  conversion_type text CHECK (
    conversion_type IS NULL OR
    conversion_type IN ('booking', 'quote', 'message', 'profile_view', 'save')
  ),

  -- Device info
  device_type text CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),

  created_at timestamptz DEFAULT now()
);

-- Create popular_searches table
CREATE TABLE IF NOT EXISTS popular_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text UNIQUE NOT NULL,

  -- Metrics
  search_count integer DEFAULT 1,
  click_through_rate numeric DEFAULT 0 CHECK (click_through_rate >= 0 AND click_through_rate <= 100),
  conversion_rate numeric DEFAULT 0 CHECK (conversion_rate >= 0 AND conversion_rate <= 100),
  avg_results_count numeric DEFAULT 0,

  last_searched_at timestamptz DEFAULT now(),
  trending_score numeric DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create search_suggestions table
CREATE TABLE IF NOT EXISTS search_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  suggested_query text NOT NULL,
  suggestion_type text DEFAULT 'related' CHECK (
    suggestion_type IN ('autocomplete', 'did_you_mean', 'related', 'popular')
  ),

  -- Performance metrics
  acceptance_count integer DEFAULT 0,
  show_count integer DEFAULT 0,
  acceptance_rate numeric DEFAULT 0 CHECK (acceptance_rate >= 0 AND acceptance_rate <= 100),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(query, suggested_query, suggestion_type)
);

-- Create zero_result_searches table
CREATE TABLE IF NOT EXISTS zero_result_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  search_type text NOT NULL,
  filters_applied jsonb DEFAULT '{}'::jsonb,

  occurrence_count integer DEFAULT 1,
  last_occurred_at timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now(),

  UNIQUE(query, search_type)
);

-- Create search_trends table
CREATE TABLE IF NOT EXISTS search_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  category text,

  search_count integer DEFAULT 1,
  trend_date date DEFAULT CURRENT_DATE,
  hour_of_day integer CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),

  created_at timestamptz DEFAULT now(),

  UNIQUE(query, trend_date, hour_of_day)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_search_analytics_user
  ON search_analytics(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_analytics_session
  ON search_analytics(session_id);

CREATE INDEX IF NOT EXISTS idx_search_analytics_query
  ON search_analytics(search_query);

CREATE INDEX IF NOT EXISTS idx_search_analytics_category
  ON search_analytics(search_category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_analytics_converted
  ON search_analytics(converted, conversion_type)
  WHERE converted = true;

CREATE INDEX IF NOT EXISTS idx_popular_searches_count
  ON popular_searches(search_count DESC);

CREATE INDEX IF NOT EXISTS idx_popular_searches_trending
  ON popular_searches(trending_score DESC);

CREATE INDEX IF NOT EXISTS idx_popular_searches_recent
  ON popular_searches(last_searched_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_suggestions_query
  ON search_suggestions(query);

CREATE INDEX IF NOT EXISTS idx_search_suggestions_acceptance
  ON search_suggestions(acceptance_rate DESC);

CREATE INDEX IF NOT EXISTS idx_zero_result_searches_count
  ON zero_result_searches(occurrence_count DESC);

CREATE INDEX IF NOT EXISTS idx_search_trends_date
  ON search_trends(trend_date DESC, search_count DESC);

CREATE INDEX IF NOT EXISTS idx_search_trends_query
  ON search_trends(query, trend_date DESC);

-- Enable RLS
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE popular_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zero_result_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_trends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for search_analytics

-- Users can view their own analytics
CREATE POLICY "Users can view own search analytics"
  ON search_analytics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can insert analytics
CREATE POLICY "System can insert search analytics"
  ON search_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own analytics
CREATE POLICY "Users can update own analytics"
  ON search_analytics
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for popular_searches

-- Everyone can view popular searches
CREATE POLICY "Public can view popular searches"
  ON popular_searches
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for search_suggestions

-- Everyone can view suggestions
CREATE POLICY "Public can view search suggestions"
  ON search_suggestions
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for zero_result_searches

-- Admins can view zero result searches
CREATE POLICY "Admins can view zero result searches"
  ON zero_result_searches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );

-- RLS Policies for search_trends

-- Everyone can view trends
CREATE POLICY "Public can view search trends"
  ON search_trends
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to track search
CREATE OR REPLACE FUNCTION track_search(
  p_user_id uuid,
  p_session_id uuid,
  p_query text,
  p_search_type text,
  p_category text,
  p_filters jsonb,
  p_results_count integer,
  p_device_type text DEFAULT 'unknown'
)
RETURNS uuid AS $$
DECLARE
  v_analytics_id uuid;
BEGIN
  -- Insert analytics record
  INSERT INTO search_analytics (
    user_id,
    session_id,
    search_query,
    search_type,
    search_category,
    filters_applied,
    results_count,
    device_type
  )
  VALUES (
    p_user_id,
    p_session_id,
    p_query,
    p_search_type,
    p_category,
    p_filters,
    p_results_count,
    p_device_type
  )
  RETURNING id INTO v_analytics_id;

  -- Update popular searches
  INSERT INTO popular_searches (query, search_count, last_searched_at, avg_results_count)
  VALUES (p_query, 1, now(), p_results_count)
  ON CONFLICT (query) DO UPDATE SET
    search_count = popular_searches.search_count + 1,
    last_searched_at = now(),
    avg_results_count = (popular_searches.avg_results_count * popular_searches.search_count + p_results_count) / (popular_searches.search_count + 1),
    updated_at = now();

  -- Track trends
  INSERT INTO search_trends (
    query,
    category,
    search_count,
    trend_date,
    hour_of_day,
    day_of_week
  )
  VALUES (
    p_query,
    p_category,
    1,
    CURRENT_DATE,
    EXTRACT(HOUR FROM now())::integer,
    EXTRACT(DOW FROM now())::integer
  )
  ON CONFLICT (query, trend_date, hour_of_day) DO UPDATE SET
    search_count = search_trends.search_count + 1;

  -- Track zero results
  IF p_results_count = 0 THEN
    INSERT INTO zero_result_searches (query, search_type, filters_applied, occurrence_count, last_occurred_at)
    VALUES (p_query, p_search_type, p_filters, 1, now())
    ON CONFLICT (query, search_type) DO UPDATE SET
      occurrence_count = zero_result_searches.occurrence_count + 1,
      last_occurred_at = now();
  END IF;

  RETURN v_analytics_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track search click
CREATE OR REPLACE FUNCTION track_search_click(
  p_analytics_id uuid,
  p_result_position integer,
  p_time_to_click integer
)
RETURNS void AS $$
BEGIN
  UPDATE search_analytics
  SET
    results_clicked = array_append(results_clicked, p_result_position),
    first_click_position = COALESCE(first_click_position, p_result_position),
    time_to_first_click = COALESCE(time_to_first_click, p_time_to_click)
  WHERE id = p_analytics_id;

  -- Update click-through rate for popular searches
  UPDATE popular_searches
  SET
    click_through_rate = (
      SELECT (COUNT(*) FILTER (WHERE array_length(results_clicked, 1) > 0)::numeric / COUNT(*)::numeric * 100)
      FROM search_analytics
      WHERE search_query = popular_searches.query
    ),
    updated_at = now()
  WHERE query IN (
    SELECT search_query FROM search_analytics WHERE id = p_analytics_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track search conversion
CREATE OR REPLACE FUNCTION track_search_conversion(
  p_analytics_id uuid,
  p_conversion_type text
)
RETURNS void AS $$
BEGIN
  UPDATE search_analytics
  SET
    converted = true,
    conversion_type = p_conversion_type
  WHERE id = p_analytics_id;

  -- Update conversion rate for popular searches
  UPDATE popular_searches
  SET
    conversion_rate = (
      SELECT (COUNT(*) FILTER (WHERE converted = true)::numeric / COUNT(*)::numeric * 100)
      FROM search_analytics
      WHERE search_query = popular_searches.query
    ),
    updated_at = now()
  WHERE query IN (
    SELECT search_query FROM search_analytics WHERE id = p_analytics_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update trending scores
CREATE OR REPLACE FUNCTION update_trending_scores()
RETURNS void AS $$
BEGIN
  UPDATE popular_searches
  SET
    trending_score = (
      -- Recent searches weighted more heavily
      (SELECT COUNT(*)::numeric FROM search_analytics
       WHERE search_query = popular_searches.query
       AND created_at > now() - INTERVAL '24 hours') * 10 +
      (SELECT COUNT(*)::numeric FROM search_analytics
       WHERE search_query = popular_searches.query
       AND created_at > now() - INTERVAL '7 days') * 2 +
      search_count * 0.1
    ),
    updated_at = now()
  WHERE last_searched_at > now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get search analytics summary
CREATE OR REPLACE FUNCTION get_search_analytics_summary(
  p_user_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  total_searches bigint,
  unique_queries bigint,
  avg_results_count numeric,
  click_through_rate numeric,
  conversion_rate numeric,
  avg_search_duration numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_searches,
    COUNT(DISTINCT search_query)::bigint as unique_queries,
    AVG(results_count)::numeric as avg_results_count,
    (COUNT(*) FILTER (WHERE array_length(results_clicked, 1) > 0)::numeric /
     NULLIF(COUNT(*)::numeric, 0) * 100) as click_through_rate,
    (COUNT(*) FILTER (WHERE converted = true)::numeric /
     NULLIF(COUNT(*)::numeric, 0) * 100) as conversion_rate,
    AVG(search_duration)::numeric as avg_search_duration
  FROM search_analytics
  WHERE user_id = p_user_id
  AND created_at > now() - (p_days || ' days')::interval;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trending searches
CREATE OR REPLACE FUNCTION get_trending_searches(p_limit integer DEFAULT 10)
RETURNS TABLE (
  query text,
  search_count integer,
  trending_score numeric,
  last_searched_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.query,
    ps.search_count,
    ps.trending_score,
    ps.last_searched_at
  FROM popular_searches ps
  WHERE ps.last_searched_at > now() - INTERVAL '7 days'
  ORDER BY ps.trending_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_search_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER popular_searches_updated_at
  BEFORE UPDATE ON popular_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_search_timestamp();

CREATE TRIGGER search_suggestions_updated_at
  BEFORE UPDATE ON search_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_search_timestamp();
