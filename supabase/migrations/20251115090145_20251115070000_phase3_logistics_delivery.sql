/*
  # Phase 3: Logistics & Delivery Engine

  1. Enhancements to Existing Tables
    - Add GPS tracking to shipments table
    - Add real-time location updates
    
  2. New Tables
    - `delivery_location_trail` - GPS tracking trail
      - `id` (uuid, primary key)
      - `shipment_id` (uuid, references shipments)
      - `latitude` (numeric)
      - `longitude` (numeric)
      - `accuracy_meters` (numeric)
      - `recorded_at` (timestamptz)
    
    - `delivery_proofs` - Delivery verification
      - `id` (uuid, primary key)
      - `shipment_id` (uuid, references shipments)
      - `proof_type` (text) - photo, signature, otp, location
      - `proof_data` (jsonb)
      - `photo_urls` (text[])
      - `signature_data` (text) - Base64 signature
      - `otp_code` (text)
      - `location_lat` (numeric)
      - `location_lng` (numeric)
      - `verified_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `eta_calculations` - ETA tracking
      - `id` (uuid, primary key)
      - `shipment_id` (uuid, references shipments)
      - `calculated_eta` (timestamptz)
      - `confidence_score` (numeric)
      - `factors_considered` (jsonb)
      - `created_at` (timestamptz)
    
    - `delivery_routes` - Optimized routes
      - `id` (uuid, primary key)
      - `driver_id` (uuid, references profiles)
      - `route_date` (date)
      - `waypoints` (jsonb[])
      - `total_distance_km` (numeric)
      - `estimated_duration_minutes` (integer)
      - `status` (text)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on all tables
    - Delivery personnel can update tracking
    - Customers can view their delivery status
*/

-- Enhance shipments table with GPS tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shipments' AND column_name = 'current_location_lat'
  ) THEN
    ALTER TABLE shipments ADD COLUMN current_location_lat numeric;
    ALTER TABLE shipments ADD COLUMN current_location_lng numeric;
    ALTER TABLE shipments ADD COLUMN location_updated_at timestamptz;
    ALTER TABLE shipments ADD COLUMN delivery_mode text DEFAULT 'shipping' CHECK (delivery_mode IN ('pickup', 'provider_delivery', 'shipping', 'hybrid'));
    ALTER TABLE shipments ADD COLUMN otp_code text;
    ALTER TABLE shipments ADD COLUMN otp_verified_at timestamptz;
  END IF;
END $$;

-- Delivery Location Trail Table
CREATE TABLE IF NOT EXISTS delivery_location_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  accuracy_meters numeric,
  speed_kmh numeric,
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX idx_delivery_trail_shipment ON delivery_location_trail(shipment_id);
CREATE INDEX idx_delivery_trail_recorded ON delivery_location_trail(recorded_at DESC);

ALTER TABLE delivery_location_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view trail for own shipments"
  ON delivery_location_trail FOR SELECT
  TO authenticated
  USING (
    shipment_id IN (
      SELECT s.id FROM shipments s
      INNER JOIN bookings b ON s.booking_id = b.id
      WHERE b.customer_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view trail for own shipments"
  ON delivery_location_trail FOR SELECT
  TO authenticated
  USING (
    shipment_id IN (
      SELECT s.id FROM shipments s
      INNER JOIN bookings b ON s.booking_id = b.id
      WHERE b.provider_id = auth.uid()
    )
  );

CREATE POLICY "Delivery personnel can create trail points"
  ON delivery_location_trail FOR INSERT
  TO authenticated
  WITH CHECK (
    shipment_id IN (
      SELECT s.id FROM shipments s
      INNER JOIN bookings b ON s.booking_id = b.id
      WHERE b.provider_id = auth.uid()
    )
  );

-- Delivery Proofs Table
CREATE TABLE IF NOT EXISTS delivery_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  proof_type text NOT NULL CHECK (proof_type IN ('photo', 'signature', 'otp', 'location')),
  proof_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  photo_urls text[] DEFAULT ARRAY[]::text[],
  signature_data text,
  otp_code text,
  location_lat numeric,
  location_lng numeric,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_delivery_proofs_shipment ON delivery_proofs(shipment_id);
CREATE INDEX idx_delivery_proofs_type ON delivery_proofs(proof_type);

ALTER TABLE delivery_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view delivery proofs"
  ON delivery_proofs FOR SELECT
  TO authenticated
  USING (
    shipment_id IN (
      SELECT s.id FROM shipments s
      INNER JOIN bookings b ON s.booking_id = b.id
      WHERE b.customer_id = auth.uid() OR b.provider_id = auth.uid()
    )
  );

CREATE POLICY "Providers can create delivery proofs"
  ON delivery_proofs FOR INSERT
  TO authenticated
  WITH CHECK (
    shipment_id IN (
      SELECT s.id FROM shipments s
      INNER JOIN bookings b ON s.booking_id = b.id
      WHERE b.provider_id = auth.uid()
    )
  );

-- ETA Calculations Table
CREATE TABLE IF NOT EXISTS eta_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  calculated_eta timestamptz NOT NULL,
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  factors_considered jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_eta_calculations_shipment ON eta_calculations(shipment_id);
CREATE INDEX idx_eta_calculations_created ON eta_calculations(created_at DESC);

ALTER TABLE eta_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view ETA calculations"
  ON eta_calculations FOR SELECT
  TO authenticated
  USING (
    shipment_id IN (
      SELECT s.id FROM shipments s
      INNER JOIN bookings b ON s.booking_id = b.id
      WHERE b.customer_id = auth.uid() OR b.provider_id = auth.uid()
    )
  );

CREATE POLICY "System can create ETA calculations"
  ON eta_calculations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Delivery Routes Table
CREATE TABLE IF NOT EXISTS delivery_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  route_date date NOT NULL,
  waypoints jsonb[] DEFAULT ARRAY[]::jsonb[],
  total_distance_km numeric,
  estimated_duration_minutes integer,
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_delivery_routes_driver ON delivery_routes(driver_id);
CREATE INDEX idx_delivery_routes_date ON delivery_routes(route_date);
CREATE INDEX idx_delivery_routes_status ON delivery_routes(status);

ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own routes"
  ON delivery_routes FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Drivers can manage own routes"
  ON delivery_routes FOR ALL
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- Function to update shipment location
CREATE OR REPLACE FUNCTION update_shipment_location(
  shipment_id_param uuid,
  lat numeric,
  lng numeric,
  accuracy numeric DEFAULT NULL,
  speed numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE shipments
  SET 
    current_location_lat = lat,
    current_location_lng = lng,
    location_updated_at = now()
  WHERE id = shipment_id_param;
  
  INSERT INTO delivery_location_trail (
    shipment_id,
    latitude,
    longitude,
    accuracy_meters,
    speed_kmh
  ) VALUES (
    shipment_id_param,
    lat,
    lng,
    accuracy,
    speed
  );
END;
$$;

-- Function to calculate ETA
CREATE OR REPLACE FUNCTION calculate_eta(
  shipment_id_param uuid,
  current_lat numeric,
  current_lng numeric,
  destination_lat numeric,
  destination_lng numeric,
  avg_speed_kmh numeric DEFAULT 40
)
RETURNS timestamptz
LANGUAGE plpgsql
AS $$
DECLARE
  distance_km numeric;
  duration_hours numeric;
  eta_result timestamptz;
BEGIN
  SELECT ST_Distance(
    ST_MakePoint(current_lng, current_lat)::geography,
    ST_MakePoint(destination_lng, destination_lat)::geography
  ) / 1000 INTO distance_km;
  
  duration_hours := distance_km / avg_speed_kmh;
  
  eta_result := now() + (duration_hours || ' hours')::interval;
  
  INSERT INTO eta_calculations (
    shipment_id,
    calculated_eta,
    confidence_score,
    factors_considered
  ) VALUES (
    shipment_id_param,
    eta_result,
    0.8,
    jsonb_build_object(
      'distance_km', distance_km,
      'avg_speed_kmh', avg_speed_kmh,
      'calculated_at', now()
    )
  );
  
  RETURN eta_result;
END;
$$;

-- Function to verify OTP
CREATE OR REPLACE FUNCTION verify_delivery_otp(
  shipment_id_param uuid,
  otp_code_param text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  stored_otp text;
  is_valid boolean := false;
BEGIN
  SELECT otp_code INTO stored_otp
  FROM shipments
  WHERE id = shipment_id_param;
  
  IF stored_otp = otp_code_param THEN
    UPDATE shipments
    SET 
      otp_verified_at = now(),
      status = 'delivered'
    WHERE id = shipment_id_param;
    
    is_valid := true;
  END IF;
  
  RETURN is_valid;
END;
$$;

-- Function to get shipment live tracking
CREATE OR REPLACE FUNCTION get_shipment_tracking(shipment_id_param uuid)
RETURNS TABLE(
  current_lat numeric,
  current_lng numeric,
  last_update timestamptz,
  eta timestamptz,
  distance_remaining_km numeric,
  location_trail jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.current_location_lat,
    s.current_location_lng,
    s.location_updated_at,
    (
      SELECT ec.calculated_eta 
      FROM eta_calculations ec 
      WHERE ec.shipment_id = shipment_id_param 
      ORDER BY ec.created_at DESC 
      LIMIT 1
    ) as eta,
    NULL::numeric as distance_remaining_km,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'lat', dlt.latitude,
          'lng', dlt.longitude,
          'recorded_at', dlt.recorded_at
        ) ORDER BY dlt.recorded_at DESC
      )
      FROM delivery_location_trail dlt
      WHERE dlt.shipment_id = shipment_id_param
      AND dlt.recorded_at > now() - interval '24 hours'
    ) as location_trail
  FROM shipments s
  WHERE s.id = shipment_id_param;
END;
$$;

-- Function to generate delivery OTP
CREATE OR REPLACE FUNCTION generate_delivery_otp(shipment_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  otp_code text;
BEGIN
  otp_code := LPAD(floor(random() * 1000000)::text, 6, '0');
  
  UPDATE shipments
  SET otp_code = otp_code
  WHERE id = shipment_id_param;
  
  RETURN otp_code;
END;
$$;