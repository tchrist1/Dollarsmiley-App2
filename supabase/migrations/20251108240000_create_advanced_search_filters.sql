/*
  # Create Advanced Search Filters System

  ## Overview
  Enhances the existing search system with advanced filtering capabilities including:
  - Custom filter templates
  - Saved filter combinations
  - Dynamic filter suggestions
  - Filter presets by category
  - Advanced filtering logic (AND/OR/NOT)
  - Multi-select filters with exclusions
  - Range filters with boundaries
  - Date range filters
  - Boolean combination filters
  - Filter analytics and popularity

  ## New Tables

  ### 1. `search_filter_templates`
  Pre-configured filter templates
  - `id` (uuid, primary key)
  - `name` (text) - Template name
  - `description` (text)
  - `category_id` (uuid, references categories) - Applicable category
  - `filter_config` (jsonb) - Filter configuration
  - `is_public` (boolean) - Available to all users
  - `usage_count` (int) - Popularity tracking
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### 2. `user_saved_filters`
  User-saved filter combinations
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `name` (text) - User-defined name
  - `search_type` (text) - jobs, providers, listings
  - `filter_config` (jsonb) - Saved configuration
  - `is_default` (boolean) - Default filter for user
  - `usage_count` (int)
  - `last_used_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 3. `filter_options`
  Available filter options per category
  - `id` (uuid, primary key)
  - `category_id` (uuid, references categories)
  - `filter_type` (text) - price, rating, distance, availability, features
  - `option_key` (text) - Unique key
  - `option_label` (text) - Display label
  - `option_values` (jsonb) - Possible values
  - `input_type` (text) - range, select, multiselect, boolean, date
  - `sort_order` (int)
  - `is_active` (boolean)

  ### 4. `filter_combinations`
  Track popular filter combinations
  - `id` (uuid, primary key)
  - `search_type` (text)
  - `filter_hash` (text) - Hash of filter combination
  - `filter_config` (jsonb)
  - `usage_count` (int)
  - `results_avg` (numeric) - Average results count
  - `last_used_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 5. `advanced_filter_rules`
  Complex filter rules with boolean logic
  - `id` (uuid, primary key)
  - `rule_name` (text)
  - `rule_description` (text)
  - `conditions` (jsonb) - Array of conditions with AND/OR/NOT
  - `is_active` (boolean)
  - `priority` (int)
  - `created_at` (timestamptz)

  ### 6. `filter_analytics`
  Filter usage analytics
  - `id` (uuid, primary key)
  - `date` (date)
  - `search_type` (text)
  - `filter_type` (text)
  - `filter_value` (text)
  - `usage_count` (int)
  - `avg_results` (numeric)
  - `avg_click_through_rate` (numeric)

  ### 7. `custom_filter_fields`
  Custom filterable fields per category
  - `id` (uuid, primary key)
  - `category_id` (uuid, references categories)
  - `field_name` (text)
  - `field_label` (text)
  - `field_type` (text) - text, number, boolean, date, enum
  - `field_options` (jsonb) - For enum types
  - `is_required` (boolean)
  - `is_searchable` (boolean)
  - `is_filterable` (boolean)
  - `created_at` (timestamptz)

  ### 8. `filter_presets`
  Quick filter presets
  - `id` (uuid, primary key)
  - `preset_name` (text)
  - `preset_label` (text)
  - `search_type` (text)
  - `filter_config` (jsonb)
  - `icon` (text)
  - `sort_order` (int)
  - `is_active` (boolean)

  ### 9. `search_filter_suggestions`
  AI-powered filter suggestions
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `search_query` (text)
  - `suggested_filters` (jsonb)
  - `confidence_score` (numeric)
  - `accepted` (boolean)
  - `created_at` (timestamptz)

  ### 10. `filter_performance_metrics`
  Track filter performance
  - `id` (uuid, primary key)
  - `filter_combination_id` (uuid, references filter_combinations)
  - `execution_time_ms` (int)
  - `results_count` (int)
  - `timestamp` (timestamptz)

  ## Filter Types
  - **Price Range**: Min/max budget
  - **Rating**: Minimum star rating
  - **Distance**: Radius from location
  - **Availability**: Date ranges, time slots
  - **Features**: Specific service features
  - **Verification**: Verified providers only
  - **Insurance**: Insured providers
  - **Experience**: Years in business
  - **Response Time**: Average response time
  - **Completion Rate**: % of completed jobs
  - **Languages**: Supported languages
  - **Payment Methods**: Accepted payment types
  - **Certifications**: Required certifications
  - **Equipment**: Required equipment/tools
  - **Team Size**: Solo vs team
  - **Booking Type**: Instant vs request

  ## Features
  - Boolean logic (AND/OR/NOT)
  - Multi-select with exclusions
  - Range filters (min/max)
  - Date range filters
  - Custom field filters per category
  - Saved filter combinations
  - Filter templates
  - Filter presets (quick filters)
  - Filter suggestions based on search
  - Filter analytics
  - Performance tracking
  - Popular combinations
  - Default filters per user

  ## Security
  - Enable RLS on all tables
  - Users manage own saved filters
  - Public access to templates and presets
  - Admin-only filter configuration

  ## Performance
  - Indexed filter combinations
  - Cached popular filters
  - Optimized query execution
  - Performance metrics tracking
*/

-- Create input type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'filter_input_type') THEN
    CREATE TYPE filter_input_type AS ENUM ('range', 'select', 'multiselect', 'boolean', 'date', 'daterange', 'text');
  END IF;
END $$;

-- Create search_filter_templates table
CREATE TABLE IF NOT EXISTS search_filter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  filter_config jsonb NOT NULL DEFAULT '{}',
  is_public boolean DEFAULT true,
  usage_count int DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_saved_filters table
CREATE TABLE IF NOT EXISTS user_saved_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  search_type text NOT NULL CHECK (search_type IN ('jobs', 'providers', 'listings', 'posts')),
  filter_config jsonb NOT NULL DEFAULT '{}',
  is_default boolean DEFAULT false,
  usage_count int DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create filter_options table
CREATE TABLE IF NOT EXISTS filter_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  filter_type text NOT NULL CHECK (filter_type IN ('price', 'rating', 'distance', 'availability', 'features', 'verification', 'experience', 'language', 'payment', 'certification')),
  option_key text NOT NULL,
  option_label text NOT NULL,
  option_values jsonb DEFAULT '[]',
  input_type filter_input_type NOT NULL,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  UNIQUE(category_id, option_key)
);

-- Create filter_combinations table
CREATE TABLE IF NOT EXISTS filter_combinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_type text NOT NULL,
  filter_hash text NOT NULL UNIQUE,
  filter_config jsonb NOT NULL,
  usage_count int DEFAULT 0,
  results_avg numeric DEFAULT 0,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create advanced_filter_rules table
CREATE TABLE IF NOT EXISTS advanced_filter_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_description text,
  conditions jsonb NOT NULL DEFAULT '[]',
  is_active boolean DEFAULT true,
  priority int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create filter_analytics table
CREATE TABLE IF NOT EXISTS filter_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  search_type text NOT NULL,
  filter_type text NOT NULL,
  filter_value text,
  usage_count int DEFAULT 0,
  avg_results numeric DEFAULT 0,
  avg_click_through_rate numeric DEFAULT 0,
  UNIQUE(date, search_type, filter_type, filter_value)
);

-- Create custom_filter_fields table
CREATE TABLE IF NOT EXISTS custom_filter_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'boolean', 'date', 'enum')),
  field_options jsonb DEFAULT '[]',
  is_required boolean DEFAULT false,
  is_searchable boolean DEFAULT true,
  is_filterable boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, field_name)
);

-- Create filter_presets table
CREATE TABLE IF NOT EXISTS filter_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_name text NOT NULL UNIQUE,
  preset_label text NOT NULL,
  search_type text NOT NULL,
  filter_config jsonb NOT NULL DEFAULT '{}',
  icon text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true
);

-- Create search_filter_suggestions table
CREATE TABLE IF NOT EXISTS search_filter_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  search_query text NOT NULL,
  suggested_filters jsonb NOT NULL DEFAULT '[]',
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  accepted boolean,
  created_at timestamptz DEFAULT now()
);

-- Create filter_performance_metrics table
CREATE TABLE IF NOT EXISTS filter_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_combination_id uuid REFERENCES filter_combinations(id) ON DELETE CASCADE,
  execution_time_ms int NOT NULL,
  results_count int NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE search_filter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE advanced_filter_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_filter_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_filter_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view public templates"
  ON search_filter_templates FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Users can manage own saved filters"
  ON user_saved_filters FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view active filter options"
  ON filter_options FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Anyone can view filter combinations"
  ON filter_combinations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view active presets"
  ON filter_presets FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can view own suggestions"
  ON search_filter_suggestions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_search_filter_templates_category ON search_filter_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_search_filter_templates_public ON search_filter_templates(is_public, usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_saved_filters_user ON user_saved_filters(user_id, search_type);
CREATE INDEX IF NOT EXISTS idx_user_saved_filters_default ON user_saved_filters(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_filter_options_category ON filter_options(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_filter_combinations_hash ON filter_combinations(filter_hash);
CREATE INDEX IF NOT EXISTS idx_filter_combinations_popular ON filter_combinations(search_type, usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_filter_analytics_date ON filter_analytics(date, search_type);
CREATE INDEX IF NOT EXISTS idx_custom_filter_fields_category ON custom_filter_fields(category_id);
CREATE INDEX IF NOT EXISTS idx_filter_presets_active ON filter_presets(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_search_filter_suggestions_user ON search_filter_suggestions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_filter_performance_metrics_combo ON filter_performance_metrics(filter_combination_id);

-- Function to generate filter hash
CREATE OR REPLACE FUNCTION generate_filter_hash(filter_config jsonb)
RETURNS text AS $$
BEGIN
  RETURN encode(digest(filter_config::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to record filter usage
CREATE OR REPLACE FUNCTION record_filter_usage(
  search_type_param text,
  filter_config_param jsonb,
  results_count_param int
)
RETURNS uuid AS $$
DECLARE
  filter_hash_val text;
  combination_id uuid;
BEGIN
  filter_hash_val := generate_filter_hash(filter_config_param);

  INSERT INTO filter_combinations (
    search_type,
    filter_hash,
    filter_config,
    usage_count,
    results_avg,
    last_used_at
  ) VALUES (
    search_type_param,
    filter_hash_val,
    filter_config_param,
    1,
    results_count_param,
    now()
  )
  ON CONFLICT (filter_hash)
  DO UPDATE SET
    usage_count = filter_combinations.usage_count + 1,
    results_avg = (filter_combinations.results_avg * filter_combinations.usage_count + results_count_param) / (filter_combinations.usage_count + 1),
    last_used_at = now()
  RETURNING id INTO combination_id;

  RETURN combination_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get popular filter combinations
CREATE OR REPLACE FUNCTION get_popular_filter_combinations(
  search_type_param text,
  limit_param int DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  filter_config jsonb,
  usage_count int,
  results_avg numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fc.id,
    fc.filter_config,
    fc.usage_count,
    fc.results_avg
  FROM filter_combinations fc
  WHERE fc.search_type = search_type_param
  ORDER BY fc.usage_count DESC, fc.last_used_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get filter suggestions based on search query
CREATE OR REPLACE FUNCTION suggest_filters_for_query(
  search_query_param text,
  search_type_param text
)
RETURNS jsonb AS $$
DECLARE
  suggestions jsonb := '[]'::jsonb;
BEGIN
  IF search_query_param ILIKE '%urgent%' OR search_query_param ILIKE '%asap%' THEN
    suggestions := suggestions || jsonb_build_object(
      'filter_type', 'availability',
      'value', 'today',
      'reason', 'Query indicates urgency'
    );
  END IF;

  IF search_query_param ILIKE '%cheap%' OR search_query_param ILIKE '%affordable%' OR search_query_param ILIKE '%budget%' THEN
    suggestions := suggestions || jsonb_build_object(
      'filter_type', 'price',
      'value', 'low_to_high',
      'reason', 'Query indicates price sensitivity'
    );
  END IF;

  IF search_query_param ILIKE '%best%' OR search_query_param ILIKE '%top%' OR search_query_param ILIKE '%quality%' THEN
    suggestions := suggestions || jsonb_build_object(
      'filter_type', 'rating',
      'value', 4.5,
      'reason', 'Query seeks high quality'
    );
  END IF;

  IF search_query_param ILIKE '%certified%' OR search_query_param ILIKE '%licensed%' THEN
    suggestions := suggestions || jsonb_build_object(
      'filter_type', 'verification',
      'value', true,
      'reason', 'Query requires credentials'
    );
  END IF;

  IF search_query_param ILIKE '%near me%' OR search_query_param ILIKE '%nearby%' THEN
    suggestions := suggestions || jsonb_build_object(
      'filter_type', 'distance',
      'value', 5,
      'reason', 'Query indicates local preference'
    );
  END IF;

  RETURN suggestions;
END;
$$ LANGUAGE plpgsql;

-- Function to apply advanced filter rules
CREATE OR REPLACE FUNCTION apply_advanced_filters(
  base_query text,
  filter_config jsonb
)
RETURNS text AS $$
DECLARE
  rule RECORD;
  condition jsonb;
  where_clause text := '';
BEGIN
  FOR rule IN
    SELECT * FROM advanced_filter_rules
    WHERE is_active = true
    ORDER BY priority DESC
  LOOP
    FOR condition IN SELECT * FROM jsonb_array_elements(rule.conditions)
    LOOP
      IF where_clause != '' THEN
        where_clause := where_clause || ' ' || (condition->>'operator')::text || ' ';
      END IF;
      where_clause := where_clause || (condition->>'clause')::text;
    END LOOP;
  END LOOP;

  IF where_clause != '' THEN
    RETURN base_query || ' WHERE ' || where_clause;
  END IF;

  RETURN base_query;
END;
$$ LANGUAGE plpgsql;

-- Insert default filter presets
INSERT INTO filter_presets (preset_name, preset_label, search_type, filter_config, icon, sort_order) VALUES
  ('top_rated', 'Top Rated', 'providers', '{"rating": {"min": 4.5}}', '⭐', 1),
  ('nearby', 'Nearby', 'providers', '{"distance": {"max": 5}}', '📍', 2),
  ('verified', 'Verified Only', 'providers', '{"verification": {"verified": true}}', '✓', 3),
  ('available_today', 'Available Today', 'providers', '{"availability": {"date": "today"}}', '📅', 4),
  ('budget_friendly', 'Budget Friendly', 'jobs', '{"price": {"max": 100}}', '💰', 5),
  ('urgent', 'Urgent', 'jobs', '{"urgency": "high"}', '⚡', 6),
  ('new_jobs', 'New Jobs', 'jobs', '{"date_posted": "last_24_hours"}', '🆕', 7),
  ('high_budget', 'High Budget', 'jobs', '{"price": {"min": 500}}', '💎', 8)
ON CONFLICT (preset_name) DO NOTHING;

-- Insert default filter options (common across categories)
INSERT INTO filter_options (category_id, filter_type, option_key, option_label, input_type, sort_order) VALUES
  (NULL, 'price', 'price_range', 'Price Range', 'range', 1),
  (NULL, 'rating', 'min_rating', 'Minimum Rating', 'select', 2),
  (NULL, 'distance', 'max_distance', 'Distance', 'range', 3),
  (NULL, 'availability', 'date_range', 'Availability', 'daterange', 4),
  (NULL, 'verification', 'verified_only', 'Verified Only', 'boolean', 5),
  (NULL, 'experience', 'years_in_business', 'Experience', 'range', 6),
  (NULL, 'language', 'languages', 'Languages', 'multiselect', 7),
  (NULL, 'payment', 'payment_methods', 'Payment Methods', 'multiselect', 8)
ON CONFLICT DO NOTHING;
