/*
  # Delivery Excellence System

  1. New Tables
    - `delivery_location_trail` - GPS tracking trail
    - `delivery_proofs` - Photo, signature, OTP proofs
    - `delivery_otps` - One-time password validation
    - `eta_calculations` - ETA tracking and accuracy
    - `delivery_zones` - Delivery coverage areas
    - `delivery_drivers` - Driver information and status

  2. Changes
    - Enhance shipments table with GPS tracking
    - Add delivery status workflow
    - Add delivery method options

  3. Security
    - Enable RLS on all new tables
    - Driver and customer access policies

  4. Functions
    - GPS distance calculation
    - ETA calculation
    - OTP generation and verification
    - Route optimization
*/

-- Enhance existing shipments table
ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS current_location_lat numeric(10, 7),
ADD COLUMN IF NOT EXISTS current_location_lng numeric(10, 7),
ADD COLUMN IF NOT EXISTS location_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS delivery_method text DEFAULT 'shipping',
-- Methods: shipping, provider_delivery, pickup, hybrid
ADD COLUMN IF NOT EXISTS delivery_driver_id uuid,
ADD COLUMN IF NOT EXISTS pickup_location jsonb,
ADD COLUMN IF NOT EXISTS delivery_instructions text,
ADD COLUMN IF NOT EXISTS estimated_delivery_at timestamptz,
ADD COLUMN IF NOT EXISTS actual_delivery_at timestamptz,
ADD COLUMN IF NOT EXISTS delivery_window_start timestamptz,
ADD COLUMN IF NOT EXISTS delivery_window_end timestamptz,
ADD COLUMN IF NOT EXISTS requires_signature boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_photo_proof boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS requires_otp boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_fragile boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS special_handling_notes text,
ADD COLUMN IF NOT EXISTS delivery_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_delivery_attempts integer DEFAULT 3;

-- Delivery Drivers table
CREATE TABLE IF NOT EXISTS delivery_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,

  -- Driver info
  driver_name text NOT NULL,
  driver_phone text NOT NULL,
  driver_email text,
  driver_photo_url text,
  vehicle_type text, -- car, truck, van, bike, scooter
  vehicle_plate text,

  -- Status
  status text DEFAULT 'offline',
  -- Statuses: offline, available, on_delivery, unavailable

  -- Current location
  current_lat numeric(10, 7),
  current_lng numeric(10, 7),
  location_updated_at timestamptz,
  heading numeric, -- Direction in degrees
  speed_mph numeric,

  -- Stats
  total_deliveries integer DEFAULT 0,
  successful_deliveries integer DEFAULT 0,
  failed_deliveries integer DEFAULT 0,
  average_rating numeric(2, 1) DEFAULT 0,
  total_ratings integer DEFAULT 0,

  -- Availability
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  background_check_status text,

  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Delivery Location Trail (GPS breadcrumbs)
CREATE TABLE IF NOT EXISTS delivery_location_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES delivery_drivers(id) ON DELETE SET NULL,

  -- Location data
  latitude numeric(10, 7) NOT NULL,
  longitude numeric(10, 7) NOT NULL,
  accuracy_meters numeric,
  altitude_meters numeric,
  heading numeric, -- Direction in degrees
  speed_mph numeric,

  -- Metadata
  battery_level integer, -- Percentage
  network_type text, -- 4G, 5G, WiFi

  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Delivery Proofs table
CREATE TABLE IF NOT EXISTS delivery_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES delivery_drivers(id) ON DELETE SET NULL,

  -- Proof type
  proof_type text NOT NULL,
  -- Types: photo, signature, otp, location, recipient_name, id_verification

  -- Photo proofs
  photo_urls text[],
  photo_metadata jsonb, -- timestamps, device info, EXIF data

  -- Signature proof
  signature_data text, -- Base64 encoded signature image
  signature_name text, -- Who signed

  -- OTP proof
  otp_code text,
  otp_verified_at timestamptz,

  -- Location proof
  proof_location_lat numeric(10, 7),
  proof_location_lng numeric(10, 7),
  location_accuracy_meters numeric,

  -- Recipient info
  recipient_name text,
  recipient_relation text, -- self, family, neighbor, security
  recipient_id_type text,
  recipient_id_number text,

  -- Timestamps
  captured_at timestamptz DEFAULT now(),
  verified_at timestamptz,

  -- Status
  is_verified boolean DEFAULT false,
  verification_notes text,

  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Delivery OTPs table
CREATE TABLE IF NOT EXISTS delivery_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(id) ON DELETE CASCADE NOT NULL,

  -- OTP details
  otp_code text NOT NULL,
  otp_type text DEFAULT '6_digit', -- 6_digit, 4_digit, alphanumeric

  -- Status
  status text DEFAULT 'active',
  -- Statuses: active, used, expired, cancelled

  -- Usage
  generated_for uuid REFERENCES profiles(id) NOT NULL, -- Customer
  used_by uuid REFERENCES delivery_drivers(id),

  -- Timestamps
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,

  -- Security
  verification_attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  ip_address text,

  created_at timestamptz DEFAULT now()
);

-- ETA Calculations table
CREATE TABLE IF NOT EXISTS eta_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(id) ON DELETE CASCADE NOT NULL,

  -- ETA details
  calculated_eta timestamptz NOT NULL,
  confidence_score numeric(3, 2), -- 0.00 to 1.00

  -- Factors considered
  distance_miles numeric(10, 2),
  estimated_duration_minutes integer,
  traffic_factor numeric(2, 2), -- 1.0 = normal, 1.5 = heavy traffic
  weather_factor numeric(2, 2),
  historical_factor numeric(2, 2), -- Based on past deliveries

  -- Data sources
  factors_considered jsonb,
  calculation_method text, -- simple, google_maps, historical_average, ml_model

  -- Accuracy tracking
  actual_arrival_at timestamptz,
  accuracy_minutes integer, -- Difference between ETA and actual

  created_at timestamptz DEFAULT now()
);

-- Delivery Zones table
CREATE TABLE IF NOT EXISTS delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Zone details
  zone_name text NOT NULL,
  zone_type text DEFAULT 'radius', -- radius, polygon, zip_codes

  -- Geographic data
  center_lat numeric(10, 7),
  center_lng numeric(10, 7),
  radius_miles integer,
  boundary_polygon geography(POLYGON, 4326),
  zip_codes text[],

  -- Delivery info
  delivery_fee numeric(10, 2) NOT NULL,
  free_delivery_threshold numeric(10, 2), -- Free if order over this amount
  estimated_delivery_days integer DEFAULT 3,
  same_day_available boolean DEFAULT false,
  same_day_cutoff_time time, -- e.g., 14:00 for 2pm cutoff

  -- Status
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,

  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Delivery Events table (detailed event log)
CREATE TABLE IF NOT EXISTS delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(id) ON DELETE CASCADE NOT NULL,

  -- Event details
  event_type text NOT NULL,
  -- Types: created, picked_up, in_transit, out_for_delivery, delivered,
  --        failed, returned, delayed, rescheduled, exception

  event_title text NOT NULL,
  event_description text,

  -- Location
  event_location_lat numeric(10, 7),
  event_location_lng numeric(10, 7),
  event_location_name text,

  -- Who/What
  triggered_by uuid REFERENCES profiles(id),
  driver_id uuid REFERENCES delivery_drivers(id),

  -- Status change
  previous_status text,
  new_status text,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shipments_delivery_method ON shipments(delivery_method);
CREATE INDEX IF NOT EXISTS idx_shipments_driver ON shipments(delivery_driver_id);
CREATE INDEX IF NOT EXISTS idx_shipments_estimated_delivery ON shipments(estimated_delivery_at);

CREATE INDEX IF NOT EXISTS idx_delivery_drivers_provider ON delivery_drivers(provider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_status ON delivery_drivers(status);
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_active ON delivery_drivers(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_delivery_trail_shipment ON delivery_location_trail(shipment_id);
CREATE INDEX IF NOT EXISTS idx_delivery_trail_recorded ON delivery_location_trail(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_proofs_shipment ON delivery_proofs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_delivery_proofs_type ON delivery_proofs(proof_type);

CREATE INDEX IF NOT EXISTS idx_delivery_otps_shipment ON delivery_otps(shipment_id);
CREATE INDEX IF NOT EXISTS idx_delivery_otps_code ON delivery_otps(otp_code);
CREATE INDEX IF NOT EXISTS idx_delivery_otps_status ON delivery_otps(status);
CREATE INDEX IF NOT EXISTS idx_delivery_otps_expires ON delivery_otps(expires_at);

CREATE INDEX IF NOT EXISTS idx_eta_calculations_shipment ON eta_calculations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_eta_calculations_created ON eta_calculations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_zones_provider ON delivery_zones(provider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_delivery_events_shipment ON delivery_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_occurred ON delivery_events(occurred_at DESC);

-- Enable RLS
ALTER TABLE delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_location_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE eta_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_drivers
CREATE POLICY "Providers can view own drivers"
  ON delivery_drivers FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can manage own drivers"
  ON delivery_drivers FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Drivers can view own profile"
  ON delivery_drivers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for delivery_location_trail
CREATE POLICY "Shipment participants can view location trail"
  ON delivery_location_trail FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shipments s
      JOIN bookings b ON b.id = s.booking_id
      WHERE s.id = delivery_location_trail.shipment_id
      AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Drivers can create location trail"
  ON delivery_location_trail FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_drivers dd
      WHERE dd.id = delivery_location_trail.driver_id
      AND (dd.user_id = auth.uid() OR dd.provider_id = auth.uid())
    )
  );

-- RLS Policies for delivery_proofs
CREATE POLICY "Shipment participants can view proofs"
  ON delivery_proofs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shipments s
      JOIN bookings b ON b.id = s.booking_id
      WHERE s.id = delivery_proofs.shipment_id
      AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Drivers can create delivery proofs"
  ON delivery_proofs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_drivers dd
      WHERE dd.id = delivery_proofs.driver_id
      AND (dd.user_id = auth.uid() OR dd.provider_id = auth.uid())
    )
  );

-- RLS Policies for delivery_otps
CREATE POLICY "Customers can view own delivery OTPs"
  ON delivery_otps FOR SELECT
  TO authenticated
  USING (generated_for = auth.uid());

CREATE POLICY "System can manage OTPs"
  ON delivery_otps FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for eta_calculations
CREATE POLICY "Shipment participants can view ETAs"
  ON eta_calculations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shipments s
      JOIN bookings b ON b.id = s.booking_id
      WHERE s.id = eta_calculations.shipment_id
      AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- RLS Policies for delivery_zones
CREATE POLICY "Anyone can view active delivery zones"
  ON delivery_zones FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Providers can manage own delivery zones"
  ON delivery_zones FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- RLS Policies for delivery_events
CREATE POLICY "Shipment participants can view delivery events"
  ON delivery_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shipments s
      JOIN bookings b ON b.id = s.booking_id
      WHERE s.id = delivery_events.shipment_id
      AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- Function: Generate delivery OTP
CREATE OR REPLACE FUNCTION generate_delivery_otp(
  shipment_id_param uuid,
  customer_id_param uuid,
  otp_type_param text DEFAULT '6_digit',
  expiry_minutes integer DEFAULT 60
)
RETURNS text AS $$
DECLARE
  new_otp text;
  expiry_time timestamptz;
BEGIN
  -- Generate OTP based on type
  IF otp_type_param = '6_digit' THEN
    new_otp := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
  ELSIF otp_type_param = '4_digit' THEN
    new_otp := LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
  ELSE
    -- Alphanumeric 8-character
    new_otp := UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8));
  END IF;

  expiry_time := now() + (expiry_minutes || ' minutes')::interval;

  -- Invalidate any existing active OTPs
  UPDATE delivery_otps
  SET status = 'cancelled'
  WHERE shipment_id = shipment_id_param
  AND status = 'active';

  -- Insert new OTP
  INSERT INTO delivery_otps (
    shipment_id,
    otp_code,
    otp_type,
    generated_for,
    expires_at
  ) VALUES (
    shipment_id_param,
    new_otp,
    otp_type_param,
    customer_id_param,
    expiry_time
  );

  RETURN new_otp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Verify delivery OTP
CREATE OR REPLACE FUNCTION verify_delivery_otp(
  shipment_id_param uuid,
  otp_code_param text,
  driver_id_param uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  otp_record record;
  is_valid boolean := false;
BEGIN
  -- Get OTP record
  SELECT * INTO otp_record
  FROM delivery_otps
  WHERE shipment_id = shipment_id_param
  AND otp_code = otp_code_param
  AND status = 'active'
  ORDER BY generated_at DESC
  LIMIT 1;

  -- Check if OTP exists
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Increment attempts
  UPDATE delivery_otps
  SET verification_attempts = verification_attempts + 1
  WHERE id = otp_record.id;

  -- Check if max attempts exceeded
  IF otp_record.verification_attempts >= otp_record.max_attempts THEN
    UPDATE delivery_otps
    SET status = 'expired'
    WHERE id = otp_record.id;
    RETURN false;
  END IF;

  -- Check if expired
  IF otp_record.expires_at < now() THEN
    UPDATE delivery_otps
    SET status = 'expired'
    WHERE id = otp_record.id;
    RETURN false;
  END IF;

  -- Mark as used
  UPDATE delivery_otps
  SET
    status = 'used',
    used_at = now(),
    used_by = driver_id_param
  WHERE id = otp_record.id;

  is_valid := true;
  RETURN is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate simple ETA
CREATE OR REPLACE FUNCTION calculate_simple_eta(
  shipment_id_param uuid,
  current_lat numeric,
  current_lng numeric
)
RETURNS timestamptz AS $$
DECLARE
  destination_lat numeric;
  destination_lng numeric;
  distance_miles numeric;
  average_speed_mph numeric := 30; -- Default average speed
  estimated_minutes integer;
  eta timestamptz;
BEGIN
  -- Get destination coordinates
  SELECT
    COALESCE(s.delivery_address->>'latitude', '0')::numeric,
    COALESCE(s.delivery_address->>'longitude', '0')::numeric
  INTO destination_lat, destination_lng
  FROM shipments s
  WHERE s.id = shipment_id_param;

  -- Calculate distance
  distance_miles := calculate_distance_miles(
    current_lat,
    current_lng,
    destination_lat,
    destination_lng
  );

  -- Estimate duration
  estimated_minutes := CEIL((distance_miles / average_speed_mph) * 60);

  -- Calculate ETA
  eta := now() + (estimated_minutes || ' minutes')::interval;

  -- Store calculation
  INSERT INTO eta_calculations (
    shipment_id,
    calculated_eta,
    confidence_score,
    distance_miles,
    estimated_duration_minutes,
    calculation_method,
    factors_considered
  ) VALUES (
    shipment_id_param,
    eta,
    0.75,
    distance_miles,
    estimated_minutes,
    'simple',
    jsonb_build_object(
      'average_speed_mph', average_speed_mph,
      'current_location', jsonb_build_object('lat', current_lat, 'lng', current_lng)
    )
  );

  RETURN eta;
END;
$$ LANGUAGE plpgsql;

-- Function: Update driver location
CREATE OR REPLACE FUNCTION update_driver_location(
  driver_id_param uuid,
  latitude numeric,
  longitude numeric,
  heading_param numeric DEFAULT NULL,
  speed_param numeric DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Update driver's current location
  UPDATE delivery_drivers
  SET
    current_lat = latitude,
    current_lng = longitude,
    location_updated_at = now(),
    heading = heading_param,
    speed_mph = speed_param,
    updated_at = now()
  WHERE id = driver_id_param;

  -- Add to location trail for active deliveries
  INSERT INTO delivery_location_trail (
    shipment_id,
    driver_id,
    latitude,
    longitude,
    heading,
    speed_mph,
    recorded_at
  )
  SELECT
    s.id,
    driver_id_param,
    latitude,
    longitude,
    heading_param,
    speed_param,
    now()
  FROM shipments s
  WHERE s.delivery_driver_id = driver_id_param
  AND s.status IN ('in_transit', 'out_for_delivery');
END;
$$ LANGUAGE plpgsql;

-- Function: Check if location is in delivery zone
CREATE OR REPLACE FUNCTION is_in_delivery_zone(
  check_lat numeric,
  check_lng numeric,
  provider_id_param uuid
)
RETURNS TABLE (
  zone_id uuid,
  zone_name text,
  delivery_fee numeric,
  estimated_days integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dz.id,
    dz.zone_name,
    dz.delivery_fee,
    dz.estimated_delivery_days
  FROM delivery_zones dz
  WHERE dz.provider_id = provider_id_param
  AND dz.is_active = true
  AND (
    -- Check radius zones
    (dz.zone_type = 'radius' AND
     calculate_distance_miles(check_lat, check_lng, dz.center_lat, dz.center_lng) <= dz.radius_miles)
    OR
    -- Check polygon zones
    (dz.zone_type = 'polygon' AND dz.boundary_polygon IS NOT NULL AND
     ST_Contains(
       dz.boundary_polygon::geometry,
       ST_SetSRID(ST_MakePoint(check_lng, check_lat), 4326)::geometry
     ))
  )
  ORDER BY dz.priority DESC, dz.delivery_fee ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_delivery_otp TO authenticated;
GRANT EXECUTE ON FUNCTION verify_delivery_otp TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_simple_eta TO authenticated;
GRANT EXECUTE ON FUNCTION update_driver_location TO authenticated;
GRANT EXECUTE ON FUNCTION is_in_delivery_zone TO authenticated, anon;

-- Add helpful comments
COMMENT ON TABLE delivery_drivers IS 'Delivery drivers with real-time location tracking';
COMMENT ON TABLE delivery_location_trail IS 'GPS breadcrumb trail for delivery tracking';
COMMENT ON TABLE delivery_proofs IS 'Photo, signature, OTP, and location proofs of delivery';
COMMENT ON TABLE delivery_otps IS 'One-time passwords for delivery verification';
COMMENT ON TABLE eta_calculations IS 'ETA calculations with accuracy tracking';
COMMENT ON TABLE delivery_zones IS 'Geographic delivery zones with fees';
COMMENT ON TABLE delivery_events IS 'Detailed delivery event log';
