/*
  # Create Job Analytics Functions

  Creates the missing track_job_view function and related analytics infrastructure.
*/

-- Create job view tracking table
CREATE TABLE IF NOT EXISTS job_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  viewer_type text,
  session_id text,
  view_duration integer,
  created_at timestamptz DEFAULT now()
);

-- Create job analytics table
CREATE TABLE IF NOT EXISTS job_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_views integer DEFAULT 0,
  unique_viewers integer DEFAULT 0,
  view_details jsonb DEFAULT '[]'::jsonb,
  total_quotes integer DEFAULT 0,
  avg_quote_amount numeric(10,2),
  min_quote_amount numeric(10,2),
  max_quote_amount numeric(10,2),
  quote_response_time_avg integer,
  total_saves integer DEFAULT 0,
  total_shares integer DEFAULT 0,
  click_through_rate numeric(5,2) DEFAULT 0,
  converted boolean DEFAULT false,
  conversion_type text,
  conversion_date timestamptz,
  conversion_value numeric(10,2),
  visibility_score integer DEFAULT 0,
  engagement_score integer DEFAULT 0,
  conversion_score integer DEFAULT 0,
  overall_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_viewer_id ON job_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_job_analytics_job_id ON job_analytics(job_id);

-- Enable RLS
ALTER TABLE job_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_views
CREATE POLICY "Anyone can insert job views"
  ON job_views FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Job owners can view their job views"
  ON job_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_views.job_id
      AND jobs.customer_id = auth.uid()
    )
  );

-- RLS Policies for job_analytics
CREATE POLICY "Customers can view their own job analytics"
  ON job_analytics FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "System can insert job analytics"
  ON job_analytics FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "System can update job analytics"
  ON job_analytics FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid());

-- Function to track job view
CREATE OR REPLACE FUNCTION track_job_view(
  p_job_id uuid,
  p_viewer_id uuid DEFAULT NULL,
  p_viewer_type text DEFAULT 'guest',
  p_session_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_unique boolean;
BEGIN
  -- Insert view record
  INSERT INTO job_views (job_id, viewer_id, viewer_type, session_id)
  VALUES (p_job_id, p_viewer_id, p_viewer_type, p_session_id);

  -- Check if this is a unique viewer
  SELECT CASE
    WHEN p_viewer_id IS NOT NULL THEN
      (SELECT COUNT(*) = 1 FROM job_views
       WHERE job_id = p_job_id AND viewer_id = p_viewer_id)
    ELSE false
  END INTO v_is_unique;

  -- Update or create analytics record
  INSERT INTO job_analytics (job_id, customer_id, total_views, unique_viewers)
  SELECT
    p_job_id,
    jobs.customer_id,
    1,
    CASE WHEN v_is_unique THEN 1 ELSE 0 END
  FROM jobs
  WHERE jobs.id = p_job_id
  ON CONFLICT (job_id) DO UPDATE SET
    total_views = job_analytics.total_views + 1,
    unique_viewers = CASE
      WHEN v_is_unique THEN job_analytics.unique_viewers + 1
      ELSE job_analytics.unique_viewers
    END,
    updated_at = now();

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;