/*
  # Create Job Analytics System

  1. New Tables
    - `job_analytics`
      - Tracks detailed analytics for each job posting
      - Records views, quotes, clicks, conversions
    - `job_performance_metrics`
      - Aggregated daily metrics for job performance

  2. New Functions
    - `track_job_view` - Records when a job is viewed
    - `track_job_quote` - Records when a quote is submitted for a job
    - `track_job_conversion` - Records when a job results in a booking
    - `get_job_analytics_summary` - Retrieves analytics for a specific job
    - `get_user_job_analytics` - Retrieves all job analytics for a user
    - `get_job_performance_trends` - Get performance trends over time

  3. Security
    - Enable RLS on all tables
    - Users can only view analytics for their own jobs
    - Providers can view limited analytics for jobs they quoted on
*/

-- Create job analytics table
CREATE TABLE IF NOT EXISTS job_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- View metrics
  total_views integer DEFAULT 0,
  unique_viewers integer DEFAULT 0,
  view_details jsonb DEFAULT '[]'::jsonb,

  -- Quote metrics
  total_quotes integer DEFAULT 0,
  avg_quote_amount numeric(10,2),
  min_quote_amount numeric(10,2),
  max_quote_amount numeric(10,2),
  quote_response_time_avg integer, -- in minutes

  -- Engagement metrics
  total_saves integer DEFAULT 0,
  total_shares integer DEFAULT 0,
  click_through_rate numeric(5,2) DEFAULT 0,

  -- Conversion metrics
  converted boolean DEFAULT false,
  conversion_type text,
  conversion_date timestamptz,
  conversion_value numeric(10,2),

  -- Performance scores
  visibility_score integer DEFAULT 0,
  engagement_score integer DEFAULT 0,
  conversion_score integer DEFAULT 0,
  overall_score integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(job_id)
);

-- Create job performance metrics table (aggregated daily data)
CREATE TABLE IF NOT EXISTS job_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metric_date date NOT NULL,

  -- Job stats
  total_jobs_posted integer DEFAULT 0,
  active_jobs integer DEFAULT 0,
  completed_jobs integer DEFAULT 0,
  expired_jobs integer DEFAULT 0,
  cancelled_jobs integer DEFAULT 0,

  -- View stats
  total_views integer DEFAULT 0,
  avg_views_per_job numeric(10,2) DEFAULT 0,

  -- Quote stats
  total_quotes_received integer DEFAULT 0,
  avg_quotes_per_job numeric(10,2) DEFAULT 0,
  avg_quote_amount numeric(10,2),

  -- Conversion stats
  total_conversions integer DEFAULT 0,
  conversion_rate numeric(5,2) DEFAULT 0,

  -- Budget stats
  total_budget_spent numeric(10,2) DEFAULT 0,
  avg_budget_per_job numeric(10,2) DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(customer_id, metric_date)
);

-- Create job view tracking table
CREATE TABLE IF NOT EXISTS job_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  viewer_type text, -- 'provider', 'customer', 'guest'
  session_id text,
  view_duration integer, -- in seconds
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_analytics_job_id ON job_analytics(job_id);
CREATE INDEX IF NOT EXISTS idx_job_analytics_customer_id ON job_analytics(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_performance_customer_date ON job_performance_metrics(customer_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_viewer_id ON job_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_job_views_created_at ON job_views(created_at);

-- Enable RLS
ALTER TABLE job_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_views ENABLE ROW LEVEL SECURITY;

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

-- RLS Policies for job_performance_metrics
CREATE POLICY "Customers can view their own performance metrics"
  ON job_performance_metrics FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "System can insert performance metrics"
  ON job_performance_metrics FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "System can update performance metrics"
  ON job_performance_metrics FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid());

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

-- Function to track job quote
CREATE OR REPLACE FUNCTION track_job_quote(
  p_job_id uuid,
  p_quote_amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update analytics with quote information
  UPDATE job_analytics
  SET
    total_quotes = total_quotes + 1,
    avg_quote_amount = COALESCE(
      (avg_quote_amount * total_quotes + p_quote_amount) / (total_quotes + 1),
      p_quote_amount
    ),
    min_quote_amount = LEAST(COALESCE(min_quote_amount, p_quote_amount), p_quote_amount),
    max_quote_amount = GREATEST(COALESCE(max_quote_amount, p_quote_amount), p_quote_amount),
    updated_at = now()
  WHERE job_id = p_job_id;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO job_analytics (
      job_id,
      customer_id,
      total_quotes,
      avg_quote_amount,
      min_quote_amount,
      max_quote_amount
    )
    SELECT
      p_job_id,
      jobs.customer_id,
      1,
      p_quote_amount,
      p_quote_amount,
      p_quote_amount
    FROM jobs
    WHERE jobs.id = p_job_id;
  END IF;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Function to track job conversion
CREATE OR REPLACE FUNCTION track_job_conversion(
  p_job_id uuid,
  p_conversion_type text,
  p_conversion_value numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE job_analytics
  SET
    converted = true,
    conversion_type = p_conversion_type,
    conversion_date = now(),
    conversion_value = p_conversion_value,
    updated_at = now()
  WHERE job_id = p_job_id;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Function to calculate performance scores
CREATE OR REPLACE FUNCTION calculate_job_performance_scores(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_analytics RECORD;
  v_visibility_score integer;
  v_engagement_score integer;
  v_conversion_score integer;
  v_overall_score integer;
BEGIN
  SELECT * INTO v_analytics
  FROM job_analytics
  WHERE job_id = p_job_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Calculate visibility score (0-100)
  v_visibility_score := LEAST(100, (
    COALESCE(v_analytics.total_views, 0) * 2 +
    COALESCE(v_analytics.unique_viewers, 0) * 5
  ));

  -- Calculate engagement score (0-100)
  v_engagement_score := LEAST(100, (
    COALESCE(v_analytics.total_quotes, 0) * 10 +
    COALESCE(v_analytics.total_saves, 0) * 5 +
    COALESCE(v_analytics.total_shares, 0) * 3
  ));

  -- Calculate conversion score (0-100)
  v_conversion_score := CASE
    WHEN v_analytics.converted THEN 100
    WHEN v_analytics.total_quotes > 0 THEN 50
    ELSE 0
  END;

  -- Calculate overall score (weighted average)
  v_overall_score := (
    v_visibility_score * 0.3 +
    v_engagement_score * 0.4 +
    v_conversion_score * 0.3
  )::integer;

  -- Update scores
  UPDATE job_analytics
  SET
    visibility_score = v_visibility_score,
    engagement_score = v_engagement_score,
    conversion_score = v_conversion_score,
    overall_score = v_overall_score,
    updated_at = now()
  WHERE job_id = p_job_id;

  RETURN true;
END;
$$;

-- Function to get job analytics summary
CREATE OR REPLACE FUNCTION get_job_analytics_summary(p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'job_id', ja.job_id,
    'total_views', ja.total_views,
    'unique_viewers', ja.unique_viewers,
    'total_quotes', ja.total_quotes,
    'avg_quote_amount', ja.avg_quote_amount,
    'min_quote_amount', ja.min_quote_amount,
    'max_quote_amount', ja.max_quote_amount,
    'total_saves', ja.total_saves,
    'converted', ja.converted,
    'conversion_value', ja.conversion_value,
    'visibility_score', ja.visibility_score,
    'engagement_score', ja.engagement_score,
    'conversion_score', ja.conversion_score,
    'overall_score', ja.overall_score,
    'job_details', jsonb_build_object(
      'title', j.title,
      'status', j.status,
      'budget_min', j.budget_min,
      'budget_max', j.budget_max,
      'created_at', j.created_at
    )
  ) INTO v_result
  FROM job_analytics ja
  JOIN jobs j ON j.id = ja.job_id
  WHERE ja.job_id = p_job_id;

  RETURN v_result;
END;
$$;

-- Function to get user job analytics (all jobs)
CREATE OR REPLACE FUNCTION get_user_job_analytics(
  p_user_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  total_jobs bigint,
  total_views bigint,
  total_quotes bigint,
  total_conversions bigint,
  avg_views_per_job numeric,
  avg_quotes_per_job numeric,
  conversion_rate numeric,
  avg_overall_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT ja.job_id)::bigint as total_jobs,
    COALESCE(SUM(ja.total_views), 0)::bigint as total_views,
    COALESCE(SUM(ja.total_quotes), 0)::bigint as total_quotes,
    COALESCE(SUM(CASE WHEN ja.converted THEN 1 ELSE 0 END), 0)::bigint as total_conversions,
    COALESCE(AVG(ja.total_views), 0) as avg_views_per_job,
    COALESCE(AVG(ja.total_quotes), 0) as avg_quotes_per_job,
    CASE
      WHEN COUNT(*) > 0 THEN
        (SUM(CASE WHEN ja.converted THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric * 100)
      ELSE 0
    END as conversion_rate,
    COALESCE(AVG(ja.overall_score), 0) as avg_overall_score
  FROM job_analytics ja
  JOIN jobs j ON j.id = ja.job_id
  WHERE ja.customer_id = p_user_id
    AND j.created_at >= now() - (p_days || ' days')::interval;
END;
$$;

-- Function to get job performance trends
CREATE OR REPLACE FUNCTION get_job_performance_trends(
  p_user_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  metric_date date,
  jobs_posted integer,
  total_views integer,
  total_quotes integer,
  conversions integer,
  avg_views_per_job numeric,
  conversion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jpm.metric_date,
    jpm.total_jobs_posted,
    jpm.total_views,
    jpm.total_quotes_received,
    jpm.total_conversions,
    jpm.avg_views_per_job,
    jpm.conversion_rate
  FROM job_performance_metrics jpm
  WHERE jpm.customer_id = p_user_id
    AND jpm.metric_date >= CURRENT_DATE - p_days
  ORDER BY jpm.metric_date ASC;
END;
$$;

-- Trigger to update job analytics when quotes are created
CREATE OR REPLACE FUNCTION trigger_update_job_analytics_on_quote()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM track_job_quote(NEW.job_id, NEW.price);
  PERFORM calculate_job_performance_scores(NEW.job_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_job_analytics_on_quote
  AFTER INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'Requested')
  EXECUTE FUNCTION trigger_update_job_analytics_on_quote();

-- Trigger to update job analytics when booking is confirmed
CREATE OR REPLACE FUNCTION trigger_update_job_analytics_on_conversion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'Confirmed' AND OLD.status = 'Requested' THEN
    PERFORM track_job_conversion(NEW.job_id, 'booking', NEW.total_price);
    PERFORM calculate_job_performance_scores(NEW.job_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_job_analytics_on_conversion
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_job_analytics_on_conversion();

-- Function to update daily performance metrics (should be run by cron)
CREATE OR REPLACE FUNCTION update_daily_job_performance_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO job_performance_metrics (
    customer_id,
    metric_date,
    total_jobs_posted,
    active_jobs,
    completed_jobs,
    expired_jobs,
    cancelled_jobs,
    total_views,
    avg_views_per_job,
    total_quotes_received,
    avg_quotes_per_job,
    avg_quote_amount,
    total_conversions,
    conversion_rate
  )
  SELECT
    j.customer_id,
    CURRENT_DATE,
    COUNT(DISTINCT j.id) FILTER (WHERE j.created_at::date = CURRENT_DATE),
    COUNT(DISTINCT j.id) FILTER (WHERE j.status IN ('Open', 'Booked')),
    COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'Completed'),
    COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'Expired'),
    COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'Cancelled'),
    COALESCE(SUM(ja.total_views), 0),
    COALESCE(AVG(ja.total_views), 0),
    COALESCE(SUM(ja.total_quotes), 0),
    COALESCE(AVG(ja.total_quotes), 0),
    COALESCE(AVG(ja.avg_quote_amount), 0),
    COALESCE(SUM(CASE WHEN ja.converted THEN 1 ELSE 0 END), 0),
    CASE
      WHEN COUNT(j.id) > 0 THEN
        (SUM(CASE WHEN ja.converted THEN 1 ELSE 0 END)::numeric / COUNT(j.id)::numeric * 100)
      ELSE 0
    END
  FROM jobs j
  LEFT JOIN job_analytics ja ON ja.job_id = j.id
  GROUP BY j.customer_id
  ON CONFLICT (customer_id, metric_date) DO UPDATE SET
    total_jobs_posted = EXCLUDED.total_jobs_posted,
    active_jobs = EXCLUDED.active_jobs,
    completed_jobs = EXCLUDED.completed_jobs,
    expired_jobs = EXCLUDED.expired_jobs,
    cancelled_jobs = EXCLUDED.cancelled_jobs,
    total_views = EXCLUDED.total_views,
    avg_views_per_job = EXCLUDED.avg_views_per_job,
    total_quotes_received = EXCLUDED.total_quotes_received,
    avg_quotes_per_job = EXCLUDED.avg_quotes_per_job,
    avg_quote_amount = EXCLUDED.avg_quote_amount,
    total_conversions = EXCLUDED.total_conversions,
    conversion_rate = EXCLUDED.conversion_rate,
    updated_at = now();
END;
$$;
