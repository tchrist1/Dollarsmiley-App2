/*
  # Advanced Search System

  1. New Tables
    - `search_queries` - Track all search queries
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `query_text` (text)
      - `query_type` (text) - text, voice, image
      - `filters` (jsonb)
      - `result_count` (integer)
      - `selected_result_id` (uuid)
      - `session_id` (text)
      - `created_at` (timestamptz)
    
    - `search_suggestions` - Popular search terms
      - `id` (uuid, primary key)
      - `suggestion_text` (text, unique)
      - `category` (text)
      - `search_count` (integer)
      - `click_count` (integer)
      - `popularity_score` (numeric)
      - `updated_at` (timestamptz)
    
    - `search_result_clicks` - Track which results users click
      - `id` (uuid, primary key)
      - `search_query_id` (uuid, references search_queries)
      - `result_id` (uuid)
      - `result_type` (text)
      - `position` (integer)
      - `clicked_at` (timestamptz)
    
    - `image_search_embeddings` - Store image embeddings for similarity search
      - `id` (uuid, primary key)
      - `listing_id` (uuid, references listings)
      - `image_url` (text)
      - `embedding` (vector(512))
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can view own search history
*/

-- Search Queries Table
CREATE TABLE IF NOT EXISTS search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  query_text text NOT NULL,
  query_type text DEFAULT 'text' CHECK (query_type IN ('text', 'voice', 'image', 'semantic')),
  filters jsonb DEFAULT '{}'::jsonb,
  result_count integer DEFAULT 0,
  selected_result_id uuid,
  selected_result_type text,
  session_id text,
  location_lat numeric,
  location_lng numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_search_queries_user ON search_queries(user_id);
CREATE INDEX idx_search_queries_text ON search_queries USING gin(to_tsvector('english', query_text));
CREATE INDEX idx_search_queries_created ON search_queries(created_at DESC);
CREATE INDEX idx_search_queries_session ON search_queries(session_id);

ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search history"
  ON search_queries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can create search queries"
  ON search_queries FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Search Suggestions Table
CREATE TABLE IF NOT EXISTS search_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_text text UNIQUE NOT NULL,
  category text,
  subcategory text,
  search_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  popularity_score numeric DEFAULT 0,
  last_searched_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_suggestions_text ON search_suggestions(suggestion_text);
CREATE INDEX idx_suggestions_popularity ON search_suggestions(popularity_score DESC);
CREATE INDEX idx_suggestions_category ON search_suggestions(category);
CREATE INDEX idx_suggestions_search_text ON search_suggestions USING gin(to_tsvector('english', suggestion_text));

ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view suggestions"
  ON search_suggestions FOR SELECT
  TO authenticated
  USING (true);

-- Search Result Clicks Table
CREATE TABLE IF NOT EXISTS search_result_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query_id uuid NOT NULL REFERENCES search_queries(id) ON DELETE CASCADE,
  result_id uuid NOT NULL,
  result_type text NOT NULL CHECK (result_type IN ('listing', 'job', 'provider')),
  position integer,
  clicked_at timestamptz DEFAULT now()
);

CREATE INDEX idx_result_clicks_query ON search_result_clicks(search_query_id);
CREATE INDEX idx_result_clicks_result ON search_result_clicks(result_id, result_type);
CREATE INDEX idx_result_clicks_clicked ON search_result_clicks(clicked_at DESC);

ALTER TABLE search_result_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clicks"
  ON search_result_clicks FOR SELECT
  TO authenticated
  USING (
    search_query_id IN (
      SELECT id FROM search_queries WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can record clicks"
  ON search_result_clicks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to update search suggestion popularity
CREATE OR REPLACE FUNCTION update_search_suggestion_popularity(
  suggestion_text_param text,
  category_param text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO search_suggestions (
    suggestion_text,
    category,
    search_count,
    popularity_score,
    last_searched_at
  ) VALUES (
    suggestion_text_param,
    category_param,
    1,
    1.0,
    now()
  )
  ON CONFLICT (suggestion_text) 
  DO UPDATE SET
    search_count = search_suggestions.search_count + 1,
    last_searched_at = now(),
    popularity_score = (
      (search_suggestions.search_count + 1) * 0.7 +
      search_suggestions.click_count * 0.3
    ),
    updated_at = now();
END;
$$;

-- Function to get personalized search suggestions
CREATE OR REPLACE FUNCTION get_personalized_suggestions(
  user_id_param uuid,
  query_prefix text,
  limit_param integer DEFAULT 10
)
RETURNS TABLE(
  suggestion text,
  category text,
  score numeric,
  source text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH user_history AS (
    SELECT DISTINCT query_text, COUNT(*) as freq
    FROM search_queries
    WHERE user_id = user_id_param
      AND query_text ILIKE query_prefix || '%'
    GROUP BY query_text
    ORDER BY freq DESC
    LIMIT 5
  ),
  popular_suggestions AS (
    SELECT 
      suggestion_text,
      ss.category,
      popularity_score,
      'popular' as source
    FROM search_suggestions ss
    WHERE suggestion_text ILIKE query_prefix || '%'
    ORDER BY popularity_score DESC
    LIMIT limit_param
  )
  SELECT query_text, NULL::text, freq::numeric, 'history' as source
  FROM user_history
  UNION ALL
  SELECT suggestion_text, category, popularity_score, source
  FROM popular_suggestions
  ORDER BY score DESC
  LIMIT limit_param;
END;
$$;

-- Function to get trending searches
CREATE OR REPLACE FUNCTION get_trending_searches(
  hours_param integer DEFAULT 24,
  limit_param integer DEFAULT 10
)
RETURNS TABLE(
  query text,
  search_count bigint,
  unique_users bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    query_text,
    COUNT(*) as search_count,
    COUNT(DISTINCT user_id) as unique_users
  FROM search_queries
  WHERE created_at >= now() - (hours_param || ' hours')::interval
  GROUP BY query_text
  ORDER BY search_count DESC
  LIMIT limit_param;
END;
$$;

-- Function to track search result click
CREATE OR REPLACE FUNCTION track_search_click(
  query_id_param uuid,
  result_id_param uuid,
  result_type_param text,
  position_param integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO search_result_clicks (
    search_query_id,
    result_id,
    result_type,
    position
  ) VALUES (
    query_id_param,
    result_id_param,
    result_type_param,
    position_param
  );
  
  UPDATE search_queries
  SET 
    selected_result_id = result_id_param,
    selected_result_type = result_type_param
  WHERE id = query_id_param;
  
  UPDATE search_suggestions
  SET 
    click_count = click_count + 1,
    popularity_score = (search_count * 0.7 + (click_count + 1) * 0.3),
    updated_at = now()
  WHERE suggestion_text = (
    SELECT query_text FROM search_queries WHERE id = query_id_param
  );
END;
$$;

-- Function for semantic search ranking
CREATE OR REPLACE FUNCTION calculate_search_relevance(
  query_text_param text,
  target_text text,
  target_category text DEFAULT NULL,
  query_category text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  text_similarity numeric;
  category_bonus numeric := 0;
BEGIN
  text_similarity := similarity(
    lower(query_text_param),
    lower(target_text)
  );
  
  IF query_category IS NOT NULL AND target_category IS NOT NULL THEN
    IF query_category = target_category THEN
      category_bonus := 0.2;
    END IF;
  END IF;
  
  RETURN text_similarity + category_bonus;
END;
$$;

-- Function to get search analytics
CREATE OR REPLACE FUNCTION get_search_analytics(
  user_id_param uuid DEFAULT NULL,
  days_param integer DEFAULT 30
)
RETURNS TABLE(
  total_searches bigint,
  unique_queries bigint,
  avg_results numeric,
  text_searches bigint,
  voice_searches bigint,
  image_searches bigint,
  top_query text,
  top_query_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT query_text) as unique_q,
      AVG(result_count) as avg_res,
      COUNT(*) FILTER (WHERE query_type = 'text') as text_count,
      COUNT(*) FILTER (WHERE query_type = 'voice') as voice_count,
      COUNT(*) FILTER (WHERE query_type = 'image') as image_count
    FROM search_queries
    WHERE (user_id_param IS NULL OR user_id = user_id_param)
      AND created_at >= now() - (days_param || ' days')::interval
  ),
  top AS (
    SELECT query_text, COUNT(*) as cnt
    FROM search_queries
    WHERE (user_id_param IS NULL OR user_id = user_id_param)
      AND created_at >= now() - (days_param || ' days')::interval
    GROUP BY query_text
    ORDER BY cnt DESC
    LIMIT 1
  )
  SELECT 
    s.total,
    s.unique_q,
    s.avg_res,
    s.text_count,
    s.voice_count,
    s.image_count,
    t.query_text,
    t.cnt
  FROM stats s
  CROSS JOIN top t;
END;
$$;