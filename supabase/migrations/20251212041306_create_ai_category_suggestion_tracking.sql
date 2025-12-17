/*
  # AI Category Suggestion Tracking System

  1. New Tables
    - `ai_category_suggestion_tracking`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `suggestion_type` (text) - 'listing' or 'job'
      - `input_title` (text)
      - `input_description` (text)
      - `suggested_category_id` (uuid, references categories)
      - `suggested_subcategory_id` (uuid, references subcategories)
      - `confidence_score` (numeric)
      - `accepted` (boolean) - whether user accepted the suggestion
      - `actual_category_id` (uuid, references categories) - category user actually chose
      - `actual_subcategory_id` (uuid, references subcategories) - subcategory user actually chose
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `ai_category_suggestion_tracking` table
    - Add policy for authenticated users to insert their own tracking data
    - Add policy for admins to view all tracking data

  3. Indexes
    - Index on user_id for performance
    - Index on accepted for analytics
    - Index on confidence_score for analysis
*/

-- Create AI category suggestion tracking table
CREATE TABLE IF NOT EXISTS ai_category_suggestion_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL CHECK (suggestion_type IN ('listing', 'job')),
  input_title text,
  input_description text,
  suggested_category_id uuid REFERENCES categories(id),
  suggested_subcategory_id uuid REFERENCES subcategories(id),
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  accepted boolean DEFAULT false,
  actual_category_id uuid REFERENCES categories(id),
  actual_subcategory_id uuid REFERENCES subcategories(id),
  created_at timestamptz DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_category_suggestion_tracking ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own tracking data
CREATE POLICY "Users can track their own AI suggestions"
  ON ai_category_suggestion_tracking FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own tracking data
CREATE POLICY "Users can view their own AI suggestion history"
  ON ai_category_suggestion_tracking FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to view all tracking data
CREATE POLICY "Admins can view all AI suggestion tracking"
  ON ai_category_suggestion_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'Admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_user_id
  ON ai_category_suggestion_tracking(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_suggestion_accepted
  ON ai_category_suggestion_tracking(accepted);

CREATE INDEX IF NOT EXISTS idx_ai_suggestion_confidence
  ON ai_category_suggestion_tracking(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_ai_suggestion_created_at
  ON ai_category_suggestion_tracking(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_suggestion_type
  ON ai_category_suggestion_tracking(suggestion_type);

-- Create a function to get AI suggestion analytics
CREATE OR REPLACE FUNCTION get_ai_suggestion_analytics(days_param integer DEFAULT 30)
RETURNS TABLE (
  total_suggestions bigint,
  accepted_suggestions bigint,
  acceptance_rate numeric,
  avg_confidence_score numeric,
  high_confidence_accepted bigint,
  medium_confidence_accepted bigint,
  low_confidence_accepted bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_suggestions,
    COUNT(*) FILTER (WHERE accepted = true)::bigint as accepted_suggestions,
    ROUND(
      (COUNT(*) FILTER (WHERE accepted = true)::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100,
      2
    ) as acceptance_rate,
    ROUND(AVG(confidence_score), 2) as avg_confidence_score,
    COUNT(*) FILTER (WHERE accepted = true AND confidence_score >= 0.7)::bigint as high_confidence_accepted,
    COUNT(*) FILTER (WHERE accepted = true AND confidence_score >= 0.4 AND confidence_score < 0.7)::bigint as medium_confidence_accepted,
    COUNT(*) FILTER (WHERE accepted = true AND confidence_score < 0.4)::bigint as low_confidence_accepted
  FROM ai_category_suggestion_tracking
  WHERE created_at >= NOW() - (days_param || ' days')::interval;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get top performing category suggestions
CREATE OR REPLACE FUNCTION get_top_category_suggestions(limit_param integer DEFAULT 10)
RETURNS TABLE (
  category_name text,
  subcategory_name text,
  suggestion_count bigint,
  acceptance_count bigint,
  acceptance_rate numeric,
  avg_confidence numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.name as category_name,
    sc.name as subcategory_name,
    COUNT(*)::bigint as suggestion_count,
    COUNT(*) FILTER (WHERE t.accepted = true)::bigint as acceptance_count,
    ROUND(
      (COUNT(*) FILTER (WHERE t.accepted = true)::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100,
      2
    ) as acceptance_rate,
    ROUND(AVG(t.confidence_score), 2) as avg_confidence
  FROM ai_category_suggestion_tracking t
  JOIN categories c ON t.suggested_category_id = c.id
  JOIN subcategories sc ON t.suggested_subcategory_id = sc.id
  WHERE t.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY c.name, sc.name
  ORDER BY acceptance_count DESC, suggestion_count DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
