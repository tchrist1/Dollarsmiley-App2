/*
  # Create Mileage Tracking System

  ## Overview
  Provides comprehensive mileage tracking for service providers to log business trips,
  calculate tax deductions, generate IRS-compliant reports, and integrate with bookings
  for automatic expense tracking and reimbursement.

  ## New Tables

  ### 1. `mileage_trips`
  Individual trip records
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles) - Provider who took trip
  - `booking_id` (uuid, references bookings) - Related booking if applicable
  - `trip_date` (date) - Date of trip
  - `start_location` (text) - Starting address
  - `start_coordinates` (point) - GPS coordinates
  - `end_location` (text) - Ending address
  - `end_coordinates` (point) - GPS coordinates
  - `distance_miles` (numeric) - Trip distance in miles
  - `distance_km` (numeric) - Trip distance in kilometers
  - `purpose` (text) - Business, Personal, Commute
  - `trip_type` (text) - OneWay, RoundTrip
  - `description` (text) - Trip description/notes
  - `odometer_start` (int) - Starting odometer reading
  - `odometer_end` (int) - Ending odometer reading
  - `vehicle_id` (uuid, references mileage_vehicles)
  - `rate_per_mile` (numeric) - IRS rate or custom
  - `reimbursement_amount` (numeric) - Calculated reimbursement
  - `is_reimbursed` (boolean) - Reimbursement status
  - `reimbursed_at` (timestamptz)
  - `is_exported` (boolean) - Included in export
  - `tags` (text[]) - Custom tags
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `mileage_vehicles`
  User vehicles
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `nickname` (text) - Vehicle nickname
  - `make` (text) - Vehicle make
  - `model` (text) - Vehicle model
  - `year` (int) - Vehicle year
  - `license_plate` (text) - License plate
  - `vin` (text) - Vehicle identification number
  - `color` (text)
  - `is_primary` (boolean) - Default vehicle
  - `odometer_reading` (int) - Current odometer
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### 3. `mileage_rates`
  IRS and custom mileage rates
  - `id` (uuid, primary key)
  - `year` (int) - Tax year
  - `rate_per_mile` (numeric) - Rate per mile
  - `rate_type` (text) - Business, Medical, Charity
  - `effective_date` (date) - When rate starts
  - `end_date` (date) - When rate ends
  - `is_irs_rate` (boolean) - Official IRS rate
  - `source` (text) - Rate source
  - `created_at` (timestamptz)

  ### 4. `mileage_summaries`
  Monthly/yearly aggregated summaries
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `summary_period` (text) - Monthly, Quarterly, Yearly
  - `start_date` (date)
  - `end_date` (date)
  - `total_trips` (int)
  - `total_business_miles` (numeric)
  - `total_personal_miles` (numeric)
  - `total_commute_miles` (numeric)
  - `business_percentage` (numeric) - Business use %
  - `total_reimbursement` (numeric)
  - `total_deduction` (numeric) - Tax deduction amount
  - `vehicle_id` (uuid, references mileage_vehicles)
  - `created_at` (timestamptz)

  ### 5. `mileage_routes`
  Common route templates
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `name` (text) - Route name
  - `start_location` (text)
  - `start_coordinates` (point)
  - `end_location` (text)
  - `end_coordinates` (point)
  - `distance_miles` (numeric)
  - `distance_km` (numeric)
  - `is_round_trip` (boolean)
  - `usage_count` (int)
  - `created_at` (timestamptz)

  ### 6. `mileage_auto_tracking`
  Automatic tracking sessions
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `vehicle_id` (uuid, references mileage_vehicles)
  - `session_start` (timestamptz)
  - `session_end` (timestamptz)
  - `start_location` (text)
  - `start_coordinates` (point)
  - `end_location` (text)
  - `end_coordinates` (point)
  - `distance_miles` (numeric)
  - `route_points` (jsonb) - GPS breadcrumb trail
  - `is_converted_to_trip` (boolean)
  - `created_at` (timestamptz)

  ## Trip Purposes
  - **Business**: Deductible business travel
  - **Personal**: Non-deductible personal travel
  - **Commute**: Daily commute (generally non-deductible)

  ## Trip Types
  - **OneWay**: Single direction trip
  - **RoundTrip**: There and back (distance x2)

  ## IRS Compliance
  - Track date, destination, purpose, miles
  - Standard mileage rate (2024: $0.67/mile)
  - Business use percentage
  - Contemporaneous records requirement
  - Export to CSV/PDF for tax filing

  ## Features
  - Manual trip entry
  - Quick add from saved routes
  - Automatic GPS tracking
  - Booking integration (auto-create trips)
  - Vehicle management
  - IRS rate updates
  - Custom rate support
  - Monthly/yearly summaries
  - Tax deduction calculator
  - Reimbursement tracking
  - Export to CSV/PDF/QuickBooks/Xero
  - Odometer tracking
  - Round trip calculator
  - Tag-based categorization
  - Common route templates
  - GPS breadcrumb trails

  ## Security
  - Enable RLS on all tables
  - Users can only access own records
  - Booking integration with permissions

  ## Important Notes
  - Trips linked to bookings auto-populate from booking location
  - IRS rates updated annually (typically January)
  - Business percentage calculated automatically
  - Summaries regenerated on trip changes
  - GPS tracking requires user permission
  - Exports maintain IRS compliance format
*/

-- Create trip purpose enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_purpose') THEN
    CREATE TYPE trip_purpose AS ENUM ('Business', 'Personal', 'Commute');
  END IF;
END $$;

-- Create trip type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_type') THEN
    CREATE TYPE trip_type AS ENUM ('OneWay', 'RoundTrip');
  END IF;
END $$;

-- Create mileage_vehicles table
CREATE TABLE IF NOT EXISTS mileage_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nickname text NOT NULL,
  make text,
  model text,
  year int CHECK (year >= 1900 AND year <= 2100),
  license_plate text,
  vin text,
  color text,
  is_primary boolean DEFAULT false,
  odometer_reading int DEFAULT 0 CHECK (odometer_reading >= 0),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create mileage_rates table
CREATE TABLE IF NOT EXISTS mileage_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  rate_per_mile numeric(5, 3) NOT NULL,
  rate_type text DEFAULT 'Business' CHECK (rate_type IN ('Business', 'Medical', 'Charity')),
  effective_date date NOT NULL,
  end_date date,
  is_irs_rate boolean DEFAULT true,
  source text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(year, rate_type, effective_date)
);

-- Create mileage_trips table
CREATE TABLE IF NOT EXISTS mileage_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  trip_date date NOT NULL DEFAULT CURRENT_DATE,
  start_location text NOT NULL,
  start_coordinates point,
  end_location text NOT NULL,
  end_coordinates point,
  distance_miles numeric(10, 2) NOT NULL CHECK (distance_miles >= 0),
  distance_km numeric(10, 2) CHECK (distance_km >= 0),
  purpose trip_purpose DEFAULT 'Business' NOT NULL,
  trip_type trip_type DEFAULT 'OneWay' NOT NULL,
  description text,
  odometer_start int CHECK (odometer_start >= 0),
  odometer_end int CHECK (odometer_end >= 0),
  vehicle_id uuid REFERENCES mileage_vehicles(id) ON DELETE SET NULL,
  rate_per_mile numeric(5, 3) NOT NULL,
  reimbursement_amount numeric(10, 2) DEFAULT 0,
  is_reimbursed boolean DEFAULT false,
  reimbursed_at timestamptz,
  is_exported boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (odometer_end IS NULL OR odometer_start IS NULL OR odometer_end >= odometer_start)
);

-- Create mileage_summaries table
CREATE TABLE IF NOT EXISTS mileage_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  summary_period text NOT NULL CHECK (summary_period IN ('Monthly', 'Quarterly', 'Yearly')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_trips int DEFAULT 0,
  total_business_miles numeric(10, 2) DEFAULT 0,
  total_personal_miles numeric(10, 2) DEFAULT 0,
  total_commute_miles numeric(10, 2) DEFAULT 0,
  business_percentage numeric(5, 2) DEFAULT 0,
  total_reimbursement numeric(10, 2) DEFAULT 0,
  total_deduction numeric(10, 2) DEFAULT 0,
  vehicle_id uuid REFERENCES mileage_vehicles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, summary_period, start_date, vehicle_id)
);

-- Create mileage_routes table
CREATE TABLE IF NOT EXISTS mileage_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  start_location text NOT NULL,
  start_coordinates point,
  end_location text NOT NULL,
  end_coordinates point,
  distance_miles numeric(10, 2) NOT NULL CHECK (distance_miles >= 0),
  distance_km numeric(10, 2) CHECK (distance_km >= 0),
  is_round_trip boolean DEFAULT false,
  usage_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create mileage_auto_tracking table
CREATE TABLE IF NOT EXISTS mileage_auto_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vehicle_id uuid REFERENCES mileage_vehicles(id) ON DELETE SET NULL,
  session_start timestamptz DEFAULT now(),
  session_end timestamptz,
  start_location text,
  start_coordinates point,
  end_location text,
  end_coordinates point,
  distance_miles numeric(10, 2),
  route_points jsonb DEFAULT '[]',
  is_converted_to_trip boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE mileage_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_auto_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own vehicles"
  ON mileage_vehicles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own vehicles"
  ON mileage_vehicles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vehicles"
  ON mileage_vehicles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view current mileage rates"
  ON mileage_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view own trips"
  ON mileage_trips FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own trips"
  ON mileage_trips FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own trips"
  ON mileage_trips FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own trips"
  ON mileage_trips FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own summaries"
  ON mileage_summaries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own routes"
  ON mileage_routes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own routes"
  ON mileage_routes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own tracking sessions"
  ON mileage_auto_tracking FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mileage_vehicles_user ON mileage_vehicles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_mileage_trips_user ON mileage_trips(user_id, trip_date DESC);
CREATE INDEX IF NOT EXISTS idx_mileage_trips_booking ON mileage_trips(booking_id);
CREATE INDEX IF NOT EXISTS idx_mileage_trips_date ON mileage_trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_mileage_trips_purpose ON mileage_trips(purpose);
CREATE INDEX IF NOT EXISTS idx_mileage_summaries_user ON mileage_summaries(user_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_mileage_routes_user ON mileage_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_mileage_auto_tracking_user ON mileage_auto_tracking(user_id, session_start DESC);

-- Function to calculate distance between coordinates (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_miles(
  lat1 numeric,
  lon1 numeric,
  lat2 numeric,
  lon2 numeric
)
RETURNS numeric AS $$
DECLARE
  earth_radius_miles numeric := 3959;
  dlat numeric;
  dlon numeric;
  a numeric;
  c numeric;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);

  a := sin(dlat/2) * sin(dlat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon/2) * sin(dlon/2);

  c := 2 * atan2(sqrt(a), sqrt(1-a));

  RETURN earth_radius_miles * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get current IRS rate
CREATE OR REPLACE FUNCTION get_current_irs_rate(rate_type_param text DEFAULT 'Business')
RETURNS numeric AS $$
DECLARE
  current_rate numeric;
BEGIN
  SELECT rate_per_mile INTO current_rate
  FROM mileage_rates
  WHERE rate_type = rate_type_param
  AND is_irs_rate = true
  AND effective_date <= CURRENT_DATE
  AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY effective_date DESC
  LIMIT 1;

  RETURN COALESCE(current_rate, 0.67);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate reimbursement
CREATE OR REPLACE FUNCTION calculate_trip_reimbursement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.purpose = 'Business' THEN
    NEW.reimbursement_amount := NEW.distance_miles * NEW.rate_per_mile;
  ELSE
    NEW.reimbursement_amount := 0;
  END IF;

  IF NEW.rate_per_mile IS NULL OR NEW.rate_per_mile = 0 THEN
    NEW.rate_per_mile := get_current_irs_rate();
    NEW.reimbursement_amount := NEW.distance_miles * NEW.rate_per_mile;
  END IF;

  NEW.distance_km := NEW.distance_miles * 1.60934;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_reimbursement ON mileage_trips;
CREATE TRIGGER trigger_calculate_reimbursement
  BEFORE INSERT OR UPDATE ON mileage_trips
  FOR EACH ROW
  EXECUTE FUNCTION calculate_trip_reimbursement();

-- Function to update mileage summaries
CREATE OR REPLACE FUNCTION update_mileage_summary(
  user_id_param uuid,
  start_date_param date,
  end_date_param date,
  period_param text
)
RETURNS void AS $$
DECLARE
  summary_data RECORD;
  total_miles numeric;
BEGIN
  SELECT
    COUNT(*)::int as trip_count,
    COALESCE(SUM(CASE WHEN purpose = 'Business' THEN distance_miles ELSE 0 END), 0) as business_miles,
    COALESCE(SUM(CASE WHEN purpose = 'Personal' THEN distance_miles ELSE 0 END), 0) as personal_miles,
    COALESCE(SUM(CASE WHEN purpose = 'Commute' THEN distance_miles ELSE 0 END), 0) as commute_miles,
    COALESCE(SUM(CASE WHEN purpose = 'Business' THEN reimbursement_amount ELSE 0 END), 0) as total_reimb
  INTO summary_data
  FROM mileage_trips
  WHERE user_id = user_id_param
  AND trip_date >= start_date_param
  AND trip_date <= end_date_param;

  total_miles := summary_data.business_miles + summary_data.personal_miles + summary_data.commute_miles;

  INSERT INTO mileage_summaries (
    user_id,
    summary_period,
    start_date,
    end_date,
    total_trips,
    total_business_miles,
    total_personal_miles,
    total_commute_miles,
    business_percentage,
    total_reimbursement,
    total_deduction
  ) VALUES (
    user_id_param,
    period_param,
    start_date_param,
    end_date_param,
    summary_data.trip_count,
    summary_data.business_miles,
    summary_data.personal_miles,
    summary_data.commute_miles,
    CASE WHEN total_miles > 0 THEN (summary_data.business_miles / total_miles * 100) ELSE 0 END,
    summary_data.total_reimb,
    summary_data.total_reimb
  )
  ON CONFLICT (user_id, summary_period, start_date, vehicle_id)
  DO UPDATE SET
    total_trips = EXCLUDED.total_trips,
    total_business_miles = EXCLUDED.total_business_miles,
    total_personal_miles = EXCLUDED.total_personal_miles,
    total_commute_miles = EXCLUDED.total_commute_miles,
    business_percentage = EXCLUDED.business_percentage,
    total_reimbursement = EXCLUDED.total_reimbursement,
    total_deduction = EXCLUDED.total_deduction;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update vehicle odometer
CREATE OR REPLACE FUNCTION update_vehicle_odometer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.odometer_end IS NOT NULL AND NEW.vehicle_id IS NOT NULL THEN
    UPDATE mileage_vehicles
    SET odometer_reading = NEW.odometer_end
    WHERE id = NEW.vehicle_id
    AND odometer_reading < NEW.odometer_end;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vehicle_odometer ON mileage_trips;
CREATE TRIGGER trigger_update_vehicle_odometer
  AFTER INSERT OR UPDATE ON mileage_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_odometer();

-- Insert current IRS rates (2024)
INSERT INTO mileage_rates (year, rate_per_mile, rate_type, effective_date, is_irs_rate, source) VALUES
  (2024, 0.670, 'Business', '2024-01-01', true, 'IRS Notice 2024-08'),
  (2024, 0.210, 'Medical', '2024-01-01', true, 'IRS Notice 2024-08'),
  (2024, 0.140, 'Charity', '2024-01-01', true, 'IRS Notice 2024-08'),
  (2023, 0.655, 'Business', '2023-01-01', true, 'IRS Notice 2023-03'),
  (2023, 0.220, 'Medical', '2023-01-01', true, 'IRS Notice 2023-03'),
  (2023, 0.140, 'Charity', '2023-01-01', true, 'IRS Notice 2023-03')
ON CONFLICT (year, rate_type, effective_date) DO NOTHING;
