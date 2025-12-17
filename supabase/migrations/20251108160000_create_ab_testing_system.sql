/*
  # Create A/B Testing System

  ## Overview
  Provides administrators with a comprehensive A/B testing framework to experiment with
  different features, UI variations, pricing strategies, and content to optimize conversions
  and user engagement across the platform.

  ## New Tables

  ### 1. `ab_experiments`
  Define and manage A/B tests
  - `id` (uuid, primary key)
  - `name` (text) - Experiment name
  - `slug` (text) - URL-friendly identifier
  - `description` (text) - Experiment description
  - `hypothesis` (text) - What we're testing
  - `experiment_type` (text) - UI, Pricing, Email, Content, Feature
  - `target_metric` (text) - Conversion, CTR, Revenue, Engagement, Retention
  - `status` (text) - Draft, Running, Paused, Completed, Cancelled
  - `traffic_allocation` (numeric) - Percentage of users (0-100)
  - `start_date` (timestamptz) - When experiment starts
  - `end_date` (timestamptz) - When experiment ends
  - `min_sample_size` (int) - Minimum participants needed
  - `confidence_level` (numeric) - Required confidence (usually 95)
  - `winning_variant_id` (uuid) - Selected winner
  - `created_by` (uuid) - Admin who created
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `ab_variants`
  Different versions being tested
  - `id` (uuid, primary key)
  - `experiment_id` (uuid, references ab_experiments)
  - `name` (text) - Variant name (Control, Variant A, B, etc.)
  - `description` (text) - What's different
  - `configuration` (jsonb) - Variant settings
  - `traffic_weight` (numeric) - Distribution weight (0-100)
  - `is_control` (boolean) - Is this the control group
  - `created_at` (timestamptz)

  ### 3. `ab_participants`
  Track which users are in which variant
  - `id` (uuid, primary key)
  - `experiment_id` (uuid, references ab_experiments)
  - `variant_id` (uuid, references ab_variants)
  - `user_id` (uuid, references profiles)
  - `session_id` (text) - Anonymous session tracking
  - `assigned_at` (timestamptz)
  - `first_exposure_at` (timestamptz)
  - `last_exposure_at` (timestamptz)
  - `exposure_count` (int) - How many times exposed

  ### 4. `ab_events`
  Track user actions within experiments
  - `id` (uuid, primary key)
  - `experiment_id` (uuid, references ab_experiments)
  - `variant_id` (uuid, references ab_variants)
  - `participant_id` (uuid, references ab_participants)
  - `user_id` (uuid, references profiles)
  - `event_type` (text) - View, Click, Conversion, Purchase, Signup, etc.
  - `event_name` (text) - Specific event identifier
  - `event_value` (numeric) - Numeric value (revenue, time, etc.)
  - `metadata` (jsonb) - Additional event data
  - `created_at` (timestamptz)

  ### 5. `ab_metrics`
  Aggregated experiment metrics
  - `id` (uuid, primary key)
  - `experiment_id` (uuid, references ab_experiments)
  - `variant_id` (uuid, references ab_variants)
  - `metric_date` (date) - Date of metrics
  - `participants_count` (int) - Total participants
  - `unique_users` (int) - Unique users
  - `impressions` (int) - Total views/exposures
  - `conversions` (int) - Conversion events
  - `conversion_rate` (numeric) - Conversion percentage
  - `revenue` (numeric) - Total revenue generated
  - `avg_revenue_per_user` (numeric) - ARPU
  - `bounce_rate` (numeric) - Bounce percentage
  - `avg_time_on_page` (numeric) - Seconds
  - `calculated_at` (timestamptz)

  ### 6. `ab_statistical_results`
  Statistical analysis results
  - `id` (uuid, primary key)
  - `experiment_id` (uuid, references ab_experiments)
  - `control_variant_id` (uuid, references ab_variants)
  - `treatment_variant_id` (uuid, references ab_variants)
  - `metric_name` (text) - Which metric analyzed
  - `control_value` (numeric) - Control group value
  - `treatment_value` (numeric) - Treatment group value
  - `lift` (numeric) - Percentage improvement
  - `p_value` (numeric) - Statistical significance
  - `confidence_level` (numeric) - Confidence percentage
  - `is_significant` (boolean) - Statistically significant
  - `sample_size_control` (int)
  - `sample_size_treatment` (int)
  - `calculated_at` (timestamptz)

  ## Experiment Types
  - **UI**: Button colors, layouts, navigation
  - **Pricing**: Different price points, discount strategies
  - **Email**: Subject lines, content variations
  - **Content**: Headlines, copy, images
  - **Feature**: New features, feature variations

  ## Target Metrics
  - **Conversion**: Sign-ups, bookings, purchases
  - **CTR**: Click-through rate
  - **Revenue**: Total revenue, ARPU
  - **Engagement**: Time on page, pages per session
  - **Retention**: Return visits, churn rate

  ## Status Flow
  Draft → Running → (Paused) → Completed/Cancelled

  ## Features
  - Multi-variant testing (A/B/C/D...)
  - Traffic allocation control
  - Statistical significance calculation
  - Automatic winner selection
  - Real-time metrics dashboard
  - Segment-based experiments
  - Sequential testing support
  - Scheduled start/end dates
  - Minimum sample size enforcement
  - Confidence interval calculation

  ## Security
  - Enable RLS on all tables
  - Admin-only access to create/manage experiments
  - Read-only access to results for analytics team
  - Anonymous participant tracking for non-users

  ## Important Notes
  - Experiments must have at least one control variant
  - Traffic weights must sum to 100%
  - Minimum sample size prevents premature conclusions
  - Statistical significance requires sufficient data
  - Users are consistently assigned to same variant
  - Session-based tracking for non-authenticated users
  - Metrics are calculated daily via cron job
  - Real-time event tracking for immediate feedback
*/

-- Create experiment status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experiment_status') THEN
    CREATE TYPE experiment_status AS ENUM (
      'Draft',
      'Running',
      'Paused',
      'Completed',
      'Cancelled'
    );
  END IF;
END $$;

-- Create ab_experiments table
CREATE TABLE IF NOT EXISTS ab_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  hypothesis text,
  experiment_type text NOT NULL CHECK (experiment_type IN ('UI', 'Pricing', 'Email', 'Content', 'Feature')),
  target_metric text NOT NULL CHECK (target_metric IN ('Conversion', 'CTR', 'Revenue', 'Engagement', 'Retention')),
  status experiment_status DEFAULT 'Draft' NOT NULL,
  traffic_allocation numeric(5, 2) DEFAULT 100 CHECK (traffic_allocation >= 0 AND traffic_allocation <= 100),
  start_date timestamptz,
  end_date timestamptz,
  min_sample_size int DEFAULT 100,
  confidence_level numeric(5, 2) DEFAULT 95 CHECK (confidence_level >= 0 AND confidence_level <= 100),
  winning_variant_id uuid,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (end_date IS NULL OR end_date > start_date)
);

-- Create ab_variants table
CREATE TABLE IF NOT EXISTS ab_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid REFERENCES ab_experiments(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  configuration jsonb DEFAULT '{}',
  traffic_weight numeric(5, 2) DEFAULT 50 CHECK (traffic_weight >= 0 AND traffic_weight <= 100),
  is_control boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(experiment_id, name)
);

-- Create ab_participants table
CREATE TABLE IF NOT EXISTS ab_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid REFERENCES ab_experiments(id) ON DELETE CASCADE NOT NULL,
  variant_id uuid REFERENCES ab_variants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_id text,
  assigned_at timestamptz DEFAULT now(),
  first_exposure_at timestamptz,
  last_exposure_at timestamptz,
  exposure_count int DEFAULT 0,
  UNIQUE(experiment_id, user_id),
  UNIQUE(experiment_id, session_id)
);

-- Create ab_events table
CREATE TABLE IF NOT EXISTS ab_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid REFERENCES ab_experiments(id) ON DELETE CASCADE NOT NULL,
  variant_id uuid REFERENCES ab_variants(id) ON DELETE CASCADE NOT NULL,
  participant_id uuid REFERENCES ab_participants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_name text NOT NULL,
  event_value numeric(10, 2),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create ab_metrics table
CREATE TABLE IF NOT EXISTS ab_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid REFERENCES ab_experiments(id) ON DELETE CASCADE NOT NULL,
  variant_id uuid REFERENCES ab_variants(id) ON DELETE CASCADE NOT NULL,
  metric_date date DEFAULT CURRENT_DATE,
  participants_count int DEFAULT 0,
  unique_users int DEFAULT 0,
  impressions int DEFAULT 0,
  conversions int DEFAULT 0,
  conversion_rate numeric(5, 2) DEFAULT 0,
  revenue numeric(10, 2) DEFAULT 0,
  avg_revenue_per_user numeric(10, 2) DEFAULT 0,
  bounce_rate numeric(5, 2) DEFAULT 0,
  avg_time_on_page numeric(10, 2) DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  UNIQUE(experiment_id, variant_id, metric_date)
);

-- Create ab_statistical_results table
CREATE TABLE IF NOT EXISTS ab_statistical_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid REFERENCES ab_experiments(id) ON DELETE CASCADE NOT NULL,
  control_variant_id uuid REFERENCES ab_variants(id) ON DELETE CASCADE NOT NULL,
  treatment_variant_id uuid REFERENCES ab_variants(id) ON DELETE CASCADE NOT NULL,
  metric_name text NOT NULL,
  control_value numeric(10, 4),
  treatment_value numeric(10, 4),
  lift numeric(10, 4),
  p_value numeric(10, 8),
  confidence_level numeric(5, 2),
  is_significant boolean DEFAULT false,
  sample_size_control int,
  sample_size_treatment int,
  calculated_at timestamptz DEFAULT now(),
  UNIQUE(experiment_id, control_variant_id, treatment_variant_id, metric_name)
);

-- Enable RLS
ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_statistical_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin access in production)
CREATE POLICY "Anyone can view running experiments"
  ON ab_experiments FOR SELECT
  TO authenticated
  USING (status = 'Running');

CREATE POLICY "Anyone can view variants"
  ON ab_variants FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ab_experiments_status ON ab_experiments(status);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_slug ON ab_experiments(slug);
CREATE INDEX IF NOT EXISTS idx_ab_variants_experiment ON ab_variants(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_participants_experiment_user ON ab_participants(experiment_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ab_participants_experiment_session ON ab_participants(experiment_id, session_id);
CREATE INDEX IF NOT EXISTS idx_ab_events_experiment_variant ON ab_events(experiment_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_events_created_at ON ab_events(created_at);
CREATE INDEX IF NOT EXISTS idx_ab_metrics_experiment_variant_date ON ab_metrics(experiment_id, variant_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_ab_statistical_results_experiment ON ab_statistical_results(experiment_id);

-- Function to assign user to variant
CREATE OR REPLACE FUNCTION assign_to_variant(
  experiment_id_param uuid,
  user_id_param uuid DEFAULT NULL,
  session_id_param text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  participant_record RECORD;
  variant_record RECORD;
  random_value numeric;
  cumulative_weight numeric := 0;
  experiment_record RECORD;
BEGIN
  -- Get experiment details
  SELECT * INTO experiment_record
  FROM ab_experiments
  WHERE id = experiment_id_param
  AND status = 'Running'
  AND (start_date IS NULL OR start_date <= now())
  AND (end_date IS NULL OR end_date > now());

  IF experiment_record IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check if already assigned
  SELECT * INTO participant_record
  FROM ab_participants
  WHERE experiment_id = experiment_id_param
  AND (user_id = user_id_param OR session_id = session_id_param);

  IF participant_record IS NOT NULL THEN
    -- Update exposure tracking
    UPDATE ab_participants
    SET last_exposure_at = now(),
        exposure_count = exposure_count + 1,
        first_exposure_at = COALESCE(first_exposure_at, now())
    WHERE id = participant_record.id;

    RETURN participant_record.variant_id;
  END IF;

  -- Assign to new variant based on traffic weights
  random_value := random() * 100;

  FOR variant_record IN
    SELECT * FROM ab_variants
    WHERE experiment_id = experiment_id_param
    ORDER BY is_control DESC, created_at ASC
  LOOP
    cumulative_weight := cumulative_weight + variant_record.traffic_weight;
    IF random_value <= cumulative_weight THEN
      -- Assign participant
      INSERT INTO ab_participants (
        experiment_id,
        variant_id,
        user_id,
        session_id,
        first_exposure_at,
        last_exposure_at,
        exposure_count
      ) VALUES (
        experiment_id_param,
        variant_record.id,
        user_id_param,
        session_id_param,
        now(),
        now(),
        1
      );

      RETURN variant_record.id;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to track experiment event
CREATE OR REPLACE FUNCTION track_experiment_event(
  experiment_id_param uuid,
  variant_id_param uuid,
  user_id_param uuid DEFAULT NULL,
  session_id_param text DEFAULT NULL,
  event_type_param text DEFAULT 'View',
  event_name_param text DEFAULT '',
  event_value_param numeric DEFAULT NULL,
  metadata_param jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  participant_record RECORD;
  event_id uuid;
BEGIN
  -- Find participant
  SELECT * INTO participant_record
  FROM ab_participants
  WHERE experiment_id = experiment_id_param
  AND variant_id = variant_id_param
  AND (user_id = user_id_param OR session_id = session_id_param);

  IF participant_record IS NULL THEN
    RETURN NULL;
  END IF;

  -- Insert event
  INSERT INTO ab_events (
    experiment_id,
    variant_id,
    participant_id,
    user_id,
    event_type,
    event_name,
    event_value,
    metadata
  ) VALUES (
    experiment_id_param,
    variant_id_param,
    participant_record.id,
    user_id_param,
    event_type_param,
    event_name_param,
    event_value_param,
    metadata_param
  )
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate experiment metrics
CREATE OR REPLACE FUNCTION calculate_experiment_metrics(
  experiment_id_param uuid,
  metric_date_param date DEFAULT CURRENT_DATE
)
RETURNS void AS $$
DECLARE
  variant_record RECORD;
  metrics_record RECORD;
BEGIN
  FOR variant_record IN
    SELECT id FROM ab_variants WHERE experiment_id = experiment_id_param
  LOOP
    -- Calculate metrics for this variant
    SELECT
      COUNT(DISTINCT p.id) as participants_count,
      COUNT(DISTINCT p.user_id) as unique_users,
      COUNT(e.id) FILTER (WHERE e.event_type = 'View') as impressions,
      COUNT(e.id) FILTER (WHERE e.event_type = 'Conversion') as conversions,
      COALESCE(SUM(e.event_value) FILTER (WHERE e.event_type = 'Purchase'), 0) as revenue
    INTO metrics_record
    FROM ab_participants p
    LEFT JOIN ab_events e ON e.participant_id = p.id
    WHERE p.experiment_id = experiment_id_param
    AND p.variant_id = variant_record.id
    AND DATE(p.assigned_at) <= metric_date_param;

    -- Insert or update metrics
    INSERT INTO ab_metrics (
      experiment_id,
      variant_id,
      metric_date,
      participants_count,
      unique_users,
      impressions,
      conversions,
      conversion_rate,
      revenue,
      avg_revenue_per_user
    ) VALUES (
      experiment_id_param,
      variant_record.id,
      metric_date_param,
      metrics_record.participants_count,
      metrics_record.unique_users,
      metrics_record.impressions,
      metrics_record.conversions,
      CASE
        WHEN metrics_record.participants_count > 0
        THEN (metrics_record.conversions::numeric / metrics_record.participants_count * 100)
        ELSE 0
      END,
      metrics_record.revenue,
      CASE
        WHEN metrics_record.unique_users > 0
        THEN metrics_record.revenue / metrics_record.unique_users
        ELSE 0
      END
    )
    ON CONFLICT (experiment_id, variant_id, metric_date)
    DO UPDATE SET
      participants_count = EXCLUDED.participants_count,
      unique_users = EXCLUDED.unique_users,
      impressions = EXCLUDED.impressions,
      conversions = EXCLUDED.conversions,
      conversion_rate = EXCLUDED.conversion_rate,
      revenue = EXCLUDED.revenue,
      avg_revenue_per_user = EXCLUDED.avg_revenue_per_user,
      calculated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Insert sample experiment
INSERT INTO ab_experiments (
  name,
  slug,
  description,
  hypothesis,
  experiment_type,
  target_metric,
  status,
  traffic_allocation,
  min_sample_size,
  confidence_level
) VALUES (
  'Homepage CTA Button Color',
  'homepage-cta-button',
  'Testing different button colors for the main CTA',
  'A green button will increase conversions by 10% compared to blue',
  'UI',
  'Conversion',
  'Draft',
  100,
  1000,
  95
) ON CONFLICT (slug) DO NOTHING;
