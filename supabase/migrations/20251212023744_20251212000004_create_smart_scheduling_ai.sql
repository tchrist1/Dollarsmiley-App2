-- Smart Scheduling AI System

-- Create conflict type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conflict_type') THEN
    CREATE TYPE conflict_type AS ENUM ('double_booking', 'travel_time', 'capacity', 'buffer_violation', 'availability');
  END IF;
END $$;

-- Create scheduling_preferences table
CREATE TABLE IF NOT EXISTS scheduling_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  min_booking_notice_hours int DEFAULT 24,
  max_bookings_per_day int DEFAULT 5,
  preferred_booking_duration_minutes int DEFAULT 120,
  buffer_time_minutes int DEFAULT 30,
  travel_time_buffer_minutes int DEFAULT 15,
  auto_accept_within_hours int DEFAULT 2,
  price_surge_enabled boolean DEFAULT false,
  price_surge_multiplier numeric DEFAULT 1.0 CHECK (price_surge_multiplier >= 1.0 AND price_surge_multiplier <= 3.0),
  allow_back_to_back boolean DEFAULT false,
  preferred_times jsonb DEFAULT '{"morning": true, "afternoon": true, "evening": false}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Create time_slot_suggestions table
CREATE TABLE IF NOT EXISTS time_slot_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  suggested_date date NOT NULL,
  suggested_start_time time NOT NULL,
  suggested_end_time time NOT NULL,
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  reasoning text,
  factors jsonb DEFAULT '{}'::jsonb,
  is_optimal boolean DEFAULT false,
  price_estimate numeric,
  travel_time_minutes int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

-- Create scheduling_patterns table
CREATE TABLE IF NOT EXISTS scheduling_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pattern_type text NOT NULL CHECK (pattern_type IN ('day_of_week', 'time_of_day', 'season', 'weather', 'category')),
  pattern_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  booking_frequency numeric DEFAULT 0,
  avg_duration_minutes int DEFAULT 0,
  avg_price numeric DEFAULT 0,
  confidence_level numeric DEFAULT 0 CHECK (confidence_level >= 0 AND confidence_level <= 1),
  last_updated timestamptz DEFAULT now()
);

-- Create workload_predictions table
CREATE TABLE IF NOT EXISTS workload_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  prediction_date date NOT NULL,
  predicted_bookings int DEFAULT 0,
  predicted_revenue numeric DEFAULT 0,
  capacity_utilization numeric CHECK (capacity_utilization >= 0 AND capacity_utilization <= 1),
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  factors jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider_id, prediction_date)
);

-- Create travel_time_matrix table
CREATE TABLE IF NOT EXISTS travel_time_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_location text NOT NULL,
  to_location text NOT NULL,
  distance_km numeric NOT NULL,
  travel_time_minutes int NOT NULL,
  traffic_factor numeric DEFAULT 1.0,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(from_location, to_location)
);

-- Create scheduling_conflicts table
CREATE TABLE IF NOT EXISTS scheduling_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  conflict_type conflict_type NOT NULL,
  booking_ids uuid[] DEFAULT ARRAY[]::uuid[],
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolution_method text,
  is_resolved boolean DEFAULT false
);

-- Create optimal_pricing table
CREATE TABLE IF NOT EXISTS optimal_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  service_category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  date date NOT NULL,
  time_slot text NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'evening', 'night')),
  base_price numeric NOT NULL,
  recommended_price numeric NOT NULL,
  demand_factor numeric DEFAULT 1.0,
  supply_factor numeric DEFAULT 1.0,
  seasonal_factor numeric DEFAULT 1.0,
  reasoning text,
  created_at timestamptz DEFAULT now()
);

-- Create scheduling_analytics table
CREATE TABLE IF NOT EXISTS scheduling_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  total_bookings int DEFAULT 0,
  accepted_bookings int DEFAULT 0,
  rejected_bookings int DEFAULT 0,
  avg_response_time_minutes int DEFAULT 0,
  capacity_utilization numeric DEFAULT 0,
  revenue numeric DEFAULT 0,
  cancellations int DEFAULT 0,
  no_shows int DEFAULT 0,
  UNIQUE(provider_id, date)
);

-- Create buffer_time_rules table
CREATE TABLE IF NOT EXISTS buffer_time_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rule_name text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  buffer_minutes int NOT NULL,
  priority int DEFAULT 0,
  is_active boolean DEFAULT true
);

-- Create capacity_forecasts table
CREATE TABLE IF NOT EXISTS capacity_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  forecast_date date NOT NULL,
  available_slots int DEFAULT 0,
  booked_slots int DEFAULT 0,
  predicted_bookings int DEFAULT 0,
  capacity_percentage numeric DEFAULT 0,
  recommendation text CHECK (recommendation IN ('expand', 'maintain', 'reduce', 'block')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider_id, forecast_date)
);

-- Enable RLS
ALTER TABLE scheduling_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slot_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE workload_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_time_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimal_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE buffer_time_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_forecasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Providers can manage own scheduling preferences"
  ON scheduling_preferences FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Users can view time slot suggestions for own jobs"
  ON time_slot_suggestions FOR SELECT
  TO authenticated
  USING (
    provider_id = auth.uid() OR
    job_id IN (SELECT id FROM jobs WHERE customer_id = auth.uid())
  );

CREATE POLICY "Providers can view own scheduling patterns"
  ON scheduling_patterns FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can view own workload predictions"
  ON workload_predictions FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Anyone can view travel time matrix"
  ON travel_time_matrix FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can view own scheduling conflicts"
  ON scheduling_conflicts FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can view own pricing recommendations"
  ON optimal_pricing FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can view own analytics"
  ON scheduling_analytics FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can manage own buffer rules"
  ON buffer_time_rules FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can view own capacity forecasts"
  ON capacity_forecasts FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scheduling_preferences_provider ON scheduling_preferences(provider_id);
CREATE INDEX IF NOT EXISTS idx_time_slot_suggestions_provider ON time_slot_suggestions(provider_id, suggested_date);
CREATE INDEX IF NOT EXISTS idx_time_slot_suggestions_job ON time_slot_suggestions(job_id);
CREATE INDEX IF NOT EXISTS idx_time_slot_suggestions_optimal ON time_slot_suggestions(is_optimal, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_scheduling_patterns_provider ON scheduling_patterns(provider_id, pattern_type);
CREATE INDEX IF NOT EXISTS idx_workload_predictions_provider_date ON workload_predictions(provider_id, prediction_date);
CREATE INDEX IF NOT EXISTS idx_travel_time_matrix_locations ON travel_time_matrix(from_location, to_location);
CREATE INDEX IF NOT EXISTS idx_scheduling_conflicts_provider ON scheduling_conflicts(provider_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_optimal_pricing_provider_date ON optimal_pricing(provider_id, date);
CREATE INDEX IF NOT EXISTS idx_scheduling_analytics_provider_date ON scheduling_analytics(provider_id, date);
CREATE INDEX IF NOT EXISTS idx_buffer_time_rules_provider ON buffer_time_rules(provider_id, is_active);
CREATE INDEX IF NOT EXISTS idx_capacity_forecasts_provider_date ON capacity_forecasts(provider_id, forecast_date);

-- Function to calculate optimal time slots
CREATE OR REPLACE FUNCTION calculate_optimal_time_slots(
  provider_id_param uuid,
  job_id_param uuid,
  start_date date,
  end_date date
)
RETURNS TABLE(
  suggested_date date,
  suggested_start_time time,
  suggested_end_time time,
  confidence_score numeric,
  reasoning text
) AS $$
DECLARE
  prefs RECORD;
  curr_date date;
  slot_start time;
  slot_end time;
  score numeric;
BEGIN
  SELECT * INTO prefs
  FROM scheduling_preferences
  WHERE provider_id = provider_id_param;

  IF NOT FOUND THEN
    prefs := ROW(
      NULL, provider_id_param, 24, 5, 120, 30, 15, 2, false, 1.0, false,
      '{"morning": true, "afternoon": true, "evening": false}'::jsonb, now()
    );
  END IF;

  curr_date := start_date;

  WHILE curr_date <= end_date LOOP
    IF EXTRACT(DOW FROM curr_date) NOT IN (0, 6) THEN
      slot_start := '09:00'::time;
      slot_end := slot_start + (prefs.preferred_booking_duration_minutes || ' minutes')::interval;

      score := 0.8;

      IF (prefs.preferred_times->>'morning')::boolean THEN
        score := score + 0.1;
      END IF;

      RETURN QUERY SELECT
        curr_date,
        slot_start,
        slot_end::time,
        score,
        'Based on provider preferences and availability'::text;

      slot_start := '14:00'::time;
      slot_end := slot_start + (prefs.preferred_booking_duration_minutes || ' minutes')::interval;

      RETURN QUERY SELECT
        curr_date,
        slot_start,
        slot_end::time,
        0.75::numeric,
        'Afternoon slot with good availability'::text;
    END IF;

    curr_date := curr_date + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to detect scheduling conflicts
CREATE OR REPLACE FUNCTION detect_scheduling_conflicts(
  provider_id_param uuid,
  check_date date
)
RETURNS TABLE(
  conflict_type text,
  booking_ids uuid[],
  description text
) AS $$
DECLARE
  booking RECORD;
  conflicts uuid[];
BEGIN
  FOR booking IN
    SELECT
      b1.id as id1,
      b2.id as id2,
      b1.start_time as start1,
      b1.end_time as end1,
      b2.start_time as start2,
      b2.end_time as end2
    FROM bookings b1
    JOIN bookings b2 ON b1.provider_id = b2.provider_id
    WHERE b1.provider_id = provider_id_param
    AND b1.booking_date = check_date
    AND b2.booking_date = check_date
    AND b1.id < b2.id
    AND b1.status IN ('Pending', 'Confirmed')
    AND b2.status IN ('Pending', 'Confirmed')
    AND (
      (b1.start_time, b1.end_time) OVERLAPS (b2.start_time, b2.end_time)
    )
  LOOP
    RETURN QUERY SELECT
      'double_booking'::text,
      ARRAY[booking.id1, booking.id2]::uuid[],
      'Overlapping bookings detected'::text;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate workload balance score
CREATE OR REPLACE FUNCTION calculate_workload_balance(
  provider_id_param uuid,
  target_date date
)
RETURNS numeric AS $$
DECLARE
  booking_count int;
  max_capacity int;
  balance_score numeric;
BEGIN
  SELECT COUNT(*) INTO booking_count
  FROM bookings
  WHERE provider_id = provider_id_param
  AND booking_date = target_date
  AND status IN ('Pending', 'Confirmed');

  SELECT max_bookings_per_day INTO max_capacity
  FROM scheduling_preferences
  WHERE provider_id = provider_id_param;

  IF max_capacity IS NULL OR max_capacity = 0 THEN
    max_capacity := 5;
  END IF;

  balance_score := 1.0 - (booking_count::numeric / max_capacity::numeric);

  RETURN GREATEST(0, LEAST(1, balance_score));
END;
$$ LANGUAGE plpgsql;

-- Function to predict optimal pricing
CREATE OR REPLACE FUNCTION predict_optimal_pricing(
  provider_id_param uuid,
  category_id_param uuid,
  target_date date,
  time_slot_param text
)
RETURNS numeric AS $$
DECLARE
  base_price numeric;
  demand_factor numeric;
  supply_factor numeric;
  seasonal_factor numeric;
  optimal_price numeric;
BEGIN
  SELECT AVG(amount) INTO base_price
  FROM bookings b
  JOIN jobs j ON b.job_id = j.id
  WHERE b.provider_id = provider_id_param
  AND j.category_id = category_id_param
  AND b.status = 'Completed';

  IF base_price IS NULL THEN
    base_price := 100;
  END IF;

  SELECT COUNT(*) INTO demand_factor
  FROM jobs
  WHERE category_id = category_id_param
  AND status = 'Open'
  AND created_at >= (target_date - interval '7 days');

  demand_factor := 1.0 + (demand_factor / 100.0);

  SELECT COUNT(*) INTO supply_factor
  FROM bookings
  WHERE provider_id = provider_id_param
  AND booking_date = target_date;

  supply_factor := 1.0 - (supply_factor / 10.0);

  IF EXTRACT(DOW FROM target_date) IN (0, 6) THEN
    seasonal_factor := 1.2;
  ELSE
    seasonal_factor := 1.0;
  END IF;

  optimal_price := base_price * demand_factor * supply_factor * seasonal_factor;

  RETURN ROUND(optimal_price, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to learn scheduling patterns
CREATE OR REPLACE FUNCTION learn_scheduling_patterns(
  provider_id_param uuid
)
RETURNS void AS $$
BEGIN
  INSERT INTO scheduling_patterns (
    provider_id,
    pattern_type,
    pattern_data,
    booking_frequency,
    avg_duration_minutes,
    avg_price,
    confidence_level
  )
  SELECT
    provider_id_param,
    'day_of_week',
    jsonb_build_object('day', EXTRACT(DOW FROM booking_date)),
    COUNT(*)::numeric / 52.0,
    AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 60)::int,
    AVG(amount),
    CASE
      WHEN COUNT(*) >= 10 THEN 0.9
      WHEN COUNT(*) >= 5 THEN 0.7
      ELSE 0.5
    END
  FROM bookings
  WHERE provider_id = provider_id_param
  AND status = 'Completed'
  AND booking_date >= CURRENT_DATE - interval '1 year'
  GROUP BY EXTRACT(DOW FROM booking_date)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to forecast capacity
CREATE OR REPLACE FUNCTION forecast_capacity(
  provider_id_param uuid,
  days_ahead int DEFAULT 30
)
RETURNS void AS $$
DECLARE
  target_date date;
  available int;
  booked int;
  predicted int;
  utilization numeric;
  recommendation text;
BEGIN
  FOR i IN 1..days_ahead LOOP
    target_date := CURRENT_DATE + i;

    SELECT max_bookings_per_day INTO available
    FROM scheduling_preferences
    WHERE provider_id = provider_id_param;

    IF available IS NULL THEN
      available := 5;
    END IF;

    SELECT COUNT(*) INTO booked
    FROM bookings
    WHERE provider_id = provider_id_param
    AND booking_date = target_date
    AND status IN ('Pending', 'Confirmed');

    SELECT AVG(booking_count)::int INTO predicted
    FROM (
      SELECT COUNT(*) as booking_count
      FROM bookings
      WHERE provider_id = provider_id_param
      AND EXTRACT(DOW FROM booking_date) = EXTRACT(DOW FROM target_date)
      AND booking_date >= CURRENT_DATE - interval '3 months'
      AND booking_date < CURRENT_DATE
      GROUP BY booking_date
    ) sub;

    IF predicted IS NULL THEN
      predicted := 2;
    END IF;

    utilization := (booked + predicted)::numeric / available::numeric;

    IF utilization >= 0.9 THEN
      recommendation := 'expand';
    ELSIF utilization >= 0.7 THEN
      recommendation := 'maintain';
    ELSIF utilization >= 0.3 THEN
      recommendation := 'maintain';
    ELSE
      recommendation := 'reduce';
    END IF;

    INSERT INTO capacity_forecasts (
      provider_id,
      forecast_date,
      available_slots,
      booked_slots,
      predicted_bookings,
      capacity_percentage,
      recommendation
    ) VALUES (
      provider_id_param,
      target_date,
      available,
      booked,
      predicted,
      utilization * 100,
      recommendation
    )
    ON CONFLICT (provider_id, forecast_date)
    DO UPDATE SET
      available_slots = EXCLUDED.available_slots,
      booked_slots = EXCLUDED.booked_slots,
      predicted_bookings = EXCLUDED.predicted_bookings,
      capacity_percentage = EXCLUDED.capacity_percentage,
      recommendation = EXCLUDED.recommendation,
      created_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql;