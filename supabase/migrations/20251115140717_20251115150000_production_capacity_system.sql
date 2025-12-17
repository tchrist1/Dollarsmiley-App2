/*
  # Production Capacity Planning System

  1. New Tables
    - `production_capacity` - Define provider capacity
      - `id` (uuid, primary key)
      - `provider_id` (uuid, references profiles)
      - `capacity_type` (text)
      - `daily_capacity` (numeric)
      - `weekly_capacity` (numeric)
      - `monthly_capacity` (numeric)
      - `unit` (text)
      - `start_date` (date)
      - `end_date` (date)
    
    - `capacity_bookings` - Track capacity usage
      - `id` (uuid, primary key)
      - `capacity_id` (uuid, references production_capacity)
      - `booking_id` (uuid, references bookings)
      - `production_order_id` (uuid, references production_orders)
      - `capacity_used` (numeric)
      - `scheduled_date` (date)
      - `status` (text)
    
    - `production_schedule` - Daily production schedule
      - `id` (uuid, primary key)
      - `provider_id` (uuid, references profiles)
      - `schedule_date` (date)
      - `capacity_allocated` (numeric)
      - `capacity_available` (numeric)
      - `bookings_count` (integer)
      - `notes` (text)

  2. Security
    - Enable RLS on all tables
    - Providers can manage their own capacity
*/

-- Production Capacity Table
CREATE TABLE IF NOT EXISTS production_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  capacity_type text NOT NULL,
  daily_capacity numeric NOT NULL CHECK (daily_capacity > 0),
  weekly_capacity numeric,
  monthly_capacity numeric,
  unit text DEFAULT 'orders',
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_capacity_provider ON production_capacity(provider_id);
CREATE INDEX idx_capacity_dates ON production_capacity(start_date, end_date);
CREATE INDEX idx_capacity_active ON production_capacity(is_active);

ALTER TABLE production_capacity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own capacity"
  ON production_capacity FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Capacity Bookings Table
CREATE TABLE IF NOT EXISTS capacity_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capacity_id uuid NOT NULL REFERENCES production_capacity(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  production_order_id uuid REFERENCES production_orders(id) ON DELETE CASCADE,
  capacity_used numeric NOT NULL CHECK (capacity_used > 0),
  scheduled_date date NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_capacity_bookings_capacity ON capacity_bookings(capacity_id);
CREATE INDEX idx_capacity_bookings_date ON capacity_bookings(scheduled_date);
CREATE INDEX idx_capacity_bookings_booking ON capacity_bookings(booking_id);
CREATE INDEX idx_capacity_bookings_order ON capacity_bookings(production_order_id);

ALTER TABLE capacity_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view own capacity bookings"
  ON capacity_bookings FOR SELECT
  TO authenticated
  USING (
    capacity_id IN (
      SELECT id FROM production_capacity WHERE provider_id = auth.uid()
    )
  );

CREATE POLICY "Providers can manage own capacity bookings"
  ON capacity_bookings FOR ALL
  TO authenticated
  USING (
    capacity_id IN (
      SELECT id FROM production_capacity WHERE provider_id = auth.uid()
    )
  )
  WITH CHECK (
    capacity_id IN (
      SELECT id FROM production_capacity WHERE provider_id = auth.uid()
    )
  );

-- Production Schedule Table
CREATE TABLE IF NOT EXISTS production_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  schedule_date date NOT NULL,
  capacity_allocated numeric DEFAULT 0,
  capacity_available numeric NOT NULL,
  bookings_count integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider_id, schedule_date)
);

CREATE INDEX idx_schedule_provider ON production_schedule(provider_id);
CREATE INDEX idx_schedule_date ON production_schedule(schedule_date);

ALTER TABLE production_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own schedule"
  ON production_schedule FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Function to get available capacity for date
CREATE OR REPLACE FUNCTION get_available_capacity(
  provider_id_param uuid,
  date_param date
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  total_capacity numeric;
  used_capacity numeric;
BEGIN
  SELECT COALESCE(SUM(daily_capacity), 0) INTO total_capacity
  FROM production_capacity
  WHERE provider_id = provider_id_param
    AND is_active = true
    AND (start_date IS NULL OR start_date <= date_param)
    AND (end_date IS NULL OR end_date >= date_param);
  
  SELECT COALESCE(SUM(capacity_used), 0) INTO used_capacity
  FROM capacity_bookings cb
  INNER JOIN production_capacity pc ON cb.capacity_id = pc.id
  WHERE pc.provider_id = provider_id_param
    AND cb.scheduled_date = date_param
    AND cb.status IN ('scheduled', 'in_progress');
  
  RETURN total_capacity - used_capacity;
END;
$$;

-- Function to check if capacity available
CREATE OR REPLACE FUNCTION check_capacity_available(
  provider_id_param uuid,
  date_param date,
  required_capacity numeric
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  available numeric;
BEGIN
  available := get_available_capacity(provider_id_param, date_param);
  RETURN available >= required_capacity;
END;
$$;

-- Function to book capacity
CREATE OR REPLACE FUNCTION book_capacity(
  provider_id_param uuid,
  date_param date,
  capacity_needed numeric,
  booking_id_param uuid DEFAULT NULL,
  order_id_param uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  capacity_id uuid;
  booking_id uuid;
  available numeric;
BEGIN
  available := get_available_capacity(provider_id_param, date_param);
  
  IF available < capacity_needed THEN
    RAISE EXCEPTION 'Insufficient capacity available';
  END IF;
  
  SELECT id INTO capacity_id
  FROM production_capacity
  WHERE provider_id = provider_id_param
    AND is_active = true
    AND (start_date IS NULL OR start_date <= date_param)
    AND (end_date IS NULL OR end_date >= date_param)
  LIMIT 1;
  
  IF capacity_id IS NULL THEN
    RAISE EXCEPTION 'No active capacity configuration found';
  END IF;
  
  INSERT INTO capacity_bookings (
    capacity_id,
    booking_id,
    production_order_id,
    capacity_used,
    scheduled_date,
    status
  ) VALUES (
    capacity_id,
    booking_id_param,
    order_id_param,
    capacity_needed,
    date_param,
    'scheduled'
  ) RETURNING id INTO booking_id;
  
  INSERT INTO production_schedule (
    provider_id,
    schedule_date,
    capacity_allocated,
    capacity_available,
    bookings_count
  ) VALUES (
    provider_id_param,
    date_param,
    capacity_needed,
    available - capacity_needed,
    1
  )
  ON CONFLICT (provider_id, schedule_date)
  DO UPDATE SET
    capacity_allocated = production_schedule.capacity_allocated + capacity_needed,
    capacity_available = production_schedule.capacity_available - capacity_needed,
    bookings_count = production_schedule.bookings_count + 1,
    updated_at = now();
  
  RETURN booking_id;
END;
$$;

-- Function to get capacity utilization
CREATE OR REPLACE FUNCTION get_capacity_utilization(
  provider_id_param uuid,
  start_date_param date,
  end_date_param date
)
RETURNS TABLE(
  schedule_date date,
  total_capacity numeric,
  allocated_capacity numeric,
  utilization_percent numeric,
  bookings_count integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      start_date_param,
      end_date_param,
      '1 day'::interval
    )::date as date_val
  ),
  capacity_per_day AS (
    SELECT 
      ds.date_val,
      COALESCE(SUM(pc.daily_capacity), 0) as total_cap
    FROM date_series ds
    LEFT JOIN production_capacity pc ON pc.provider_id = provider_id_param
      AND pc.is_active = true
      AND (pc.start_date IS NULL OR pc.start_date <= ds.date_val)
      AND (pc.end_date IS NULL OR pc.end_date >= ds.date_val)
    GROUP BY ds.date_val
  ),
  usage_per_day AS (
    SELECT 
      cb.scheduled_date,
      COALESCE(SUM(cb.capacity_used), 0) as used_cap,
      COUNT(*) as booking_count
    FROM capacity_bookings cb
    INNER JOIN production_capacity pc ON cb.capacity_id = pc.id
    WHERE pc.provider_id = provider_id_param
      AND cb.scheduled_date BETWEEN start_date_param AND end_date_param
      AND cb.status IN ('scheduled', 'in_progress', 'completed')
    GROUP BY cb.scheduled_date
  )
  SELECT 
    cpd.date_val,
    cpd.total_cap,
    COALESCE(upd.used_cap, 0),
    CASE 
      WHEN cpd.total_cap > 0 
      THEN (COALESCE(upd.used_cap, 0) / cpd.total_cap) * 100
      ELSE 0
    END,
    COALESCE(upd.booking_count, 0)::integer
  FROM capacity_per_day cpd
  LEFT JOIN usage_per_day upd ON cpd.date_val = upd.scheduled_date
  ORDER BY cpd.date_val;
END;
$$;

-- Function to get optimal production dates
CREATE OR REPLACE FUNCTION get_optimal_production_dates(
  provider_id_param uuid,
  capacity_needed numeric,
  start_from_date date DEFAULT CURRENT_DATE,
  days_to_check integer DEFAULT 30
)
RETURNS TABLE(
  suggested_date date,
  available_capacity numeric,
  utilization_percent numeric,
  priority_score numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH date_capacity AS (
    SELECT 
      generate_series(
        start_from_date,
        start_from_date + (days_to_check || ' days')::interval,
        '1 day'::interval
      )::date as date_val,
      get_available_capacity(provider_id_param, generate_series(
        start_from_date,
        start_from_date + (days_to_check || ' days')::interval,
        '1 day'::interval
      )::date) as avail_cap
  )
  SELECT 
    dc.date_val,
    dc.avail_cap,
    CASE 
      WHEN dc.avail_cap > 0 
      THEN ((dc.avail_cap - capacity_needed) / dc.avail_cap) * 100
      ELSE 100
    END as util_pct,
    CASE 
      WHEN dc.avail_cap >= capacity_needed 
      THEN (dc.avail_cap - capacity_needed) * 10 / EXTRACT(DAY FROM dc.date_val - start_from_date + 1)
      ELSE 0
    END as priority
  FROM date_capacity dc
  WHERE dc.avail_cap >= capacity_needed
  ORDER BY priority DESC, dc.date_val
  LIMIT 10;
END;
$$;