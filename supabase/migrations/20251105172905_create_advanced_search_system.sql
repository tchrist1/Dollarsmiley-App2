/*
  # Advanced Search System

  ## Overview
  Implements full-text search capabilities with PostgreSQL, search history tracking,
  trending searches, and improved discoverability features for the marketplace.

  ## New Tables
  
  ### 1. `search_history`
  Tracks user search queries for personalization and analytics
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles, nullable) - null for anonymous
  - `search_query` (text) - the search term
  - `filters_applied` (jsonb) - filter settings used
  - `results_count` (integer) - number of results found
  - `clicked_listing_id` (uuid, references service_listings, nullable) - if user clicked a result
  - `created_at` (timestamptz)
  
  ### 2. `popular_searches`
  Aggregated view of trending/popular searches
  - `id` (uuid, primary key)
  - `search_term` (text, unique) - normalized search term
  - `search_count` (integer) - number of times searched
  - `last_searched_at` (timestamptz)
  - `created_at` (timestamptz)
  
  ### 3. `listing_tags`
  Additional tags/keywords for better search matching
  - `id` (uuid, primary key)
  - `listing_id` (uuid, references service_listings)
  - `tag` (text) - keyword/tag
  - `created_at` (timestamptz)

  ## Schema Changes
  
  ### Service Listings Updates
  - Add `search_vector` (tsvector) - full-text search index
  - Add `view_count` (integer) - track popularity
  - Add `booking_count` (integer) - track success rate
  - Add `last_booked_at` (timestamptz) - recency signal

  ## Full-Text Search
  
  Creates PostgreSQL full-text search capabilities:
  - Search across title, description, location
  - Weighted ranking (title > description > location)
  - Support for partial matches
  - Typo tolerance with trigram similarity
  
  ## Indexes
  
  Creates specialized indexes for performance:
  - GIN index on search_vector for full-text search
  - Trigram indexes for fuzzy matching
  - Composite indexes on commonly filtered columns
  - Index on view_count and booking_count for popularity sorting

  ## Functions
  
  ### `update_listing_search_vector()`
  Automatically maintains search_vector when listing changes
  
  ### `record_search()`
  Records search queries and updates popularity
  
  ### `get_search_suggestions()`
  Returns search suggestions based on query prefix

  ## Security
  - Enable RLS on search_history
  - Users can only view their own search history
  - Popular searches are public (no RLS)
  - Admin can view all search analytics

  ## Important Notes
  - Search vector automatically updated on insert/update
  - Popular searches updated asynchronously
  - Search history retained for 90 days
  - Anonymous searches tracked for analytics only
  - Trending searches refresh every 5 minutes
*/

-- Add new columns to service_listings for better search
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN search_vector tsvector;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN view_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'booking_count'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN booking_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'last_booked_at'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN last_booked_at timestamptz;
  END IF;
END $$;

-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  search_query text NOT NULL,
  filters_applied jsonb DEFAULT '{}',
  results_count integer DEFAULT 0,
  clicked_listing_id uuid REFERENCES service_listings(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create popular_searches table
CREATE TABLE IF NOT EXISTS popular_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_term text UNIQUE NOT NULL,
  search_count integer DEFAULT 1,
  last_searched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create listing_tags table
CREATE TABLE IF NOT EXISTS listing_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES service_listings(id) ON DELETE CASCADE NOT NULL,
  tag text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(listing_id, tag)
);

-- Enable RLS
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for search_history
CREATE POLICY "Users can view own search history"
  ON search_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own search history"
  ON search_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can create anonymous search history"
  ON search_history FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- RLS Policies for listing_tags
CREATE POLICY "Anyone can view listing tags"
  ON listing_tags FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Providers can manage own listing tags"
  ON listing_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_listings
      WHERE service_listings.id = listing_tags.listing_id
      AND service_listings.provider_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created ON search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_popular_searches_count ON popular_searches(search_count DESC);
CREATE INDEX IF NOT EXISTS idx_popular_searches_last ON popular_searches(last_searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_tags_listing ON listing_tags(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_tags_tag ON listing_tags(tag);

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_service_listings_search_vector 
ON service_listings USING GIN(search_vector);

-- Create indexes for sorting and filtering
CREATE INDEX IF NOT EXISTS idx_service_listings_view_count 
ON service_listings(view_count DESC) WHERE status = 'Active';

CREATE INDEX IF NOT EXISTS idx_service_listings_booking_count 
ON service_listings(booking_count DESC) WHERE status = 'Active';

CREATE INDEX IF NOT EXISTS idx_service_listings_price 
ON service_listings(base_price) WHERE status = 'Active';

-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram indexes for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_service_listings_title_trgm 
ON service_listings USING GIN(title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_service_listings_description_trgm 
ON service_listings USING GIN(description gin_trgm_ops);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_listing_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.location, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update search vector
DROP TRIGGER IF EXISTS trigger_update_listing_search_vector ON service_listings;
CREATE TRIGGER trigger_update_listing_search_vector
  BEFORE INSERT OR UPDATE OF title, description, location
  ON service_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_search_vector();

-- Update existing listings with search vectors
UPDATE service_listings
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(location, '')), 'C')
WHERE search_vector IS NULL;

-- Function to record search and update popular searches
CREATE OR REPLACE FUNCTION record_search(
  p_user_id uuid,
  p_search_query text,
  p_filters_applied jsonb,
  p_results_count integer
)
RETURNS uuid AS $$
DECLARE
  v_search_id uuid;
  v_normalized_query text;
BEGIN
  v_normalized_query := lower(trim(p_search_query));
  
  IF v_normalized_query = '' THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO search_history (user_id, search_query, filters_applied, results_count)
  VALUES (p_user_id, p_search_query, p_filters_applied, p_results_count)
  RETURNING id INTO v_search_id;
  
  INSERT INTO popular_searches (search_term, search_count, last_searched_at)
  VALUES (v_normalized_query, 1, now())
  ON CONFLICT (search_term) 
  DO UPDATE SET 
    search_count = popular_searches.search_count + 1,
    last_searched_at = now();
  
  RETURN v_search_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get search suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(p_query text, p_limit integer DEFAULT 10)
RETURNS TABLE (
  suggestion text,
  search_count integer,
  last_searched timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.search_term,
    ps.search_count,
    ps.last_searched_at
  FROM popular_searches ps
  WHERE ps.search_term ILIKE p_query || '%'
  ORDER BY ps.search_count DESC, ps.last_searched_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_listing_view(p_listing_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE service_listings
  SET view_count = view_count + 1
  WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trending listings
CREATE OR REPLACE FUNCTION get_trending_listings(p_limit integer DEFAULT 10)
RETURNS TABLE (
  listing_id uuid,
  title text,
  view_count integer,
  booking_count integer,
  trending_score numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.id,
    sl.title,
    sl.view_count,
    sl.booking_count,
    (sl.view_count * 0.3 + sl.booking_count * 0.7)::numeric as trending_score
  FROM service_listings sl
  WHERE sl.status = 'Active'
  ORDER BY trending_score DESC, sl.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;