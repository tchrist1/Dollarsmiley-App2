/*
  # Create Trips Tracking System

  ## Summary
  Implements real-time map-based tracking for active jobs and services.
  Trips represent movements from one location to another for bookings.

  ## New Tables

  1. `trips` - Core trip tracking table
     - Tracks who is moving, from where to where
     - Status management (not_started, on_the_way, arriving_soon, arrived, completed, canceled)
     - Links to bookings and service types

  2. `trip_location_updates` - Real-time location tracking
     - Stores location updates during active trips
     - Includes heading, speed, and accuracy data
     - Temporary storage for safety/support

  ## Columns
  - trip_type: on_site_service, customer_pickup, provider_dropoff
  - mover_type: provider, customer
  - trip_status: not_started, on_the_way, arriving_soon, arrived, completed, canceled
  - visibility controls for live location sharing

  ## Security
  - RLS policies ensure only trip participants can view/update
  - Location data only shared during active trips
  - Automatic cleanup of old location data
*/

-- ============================================================================
-- 1. TRIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Trip sequence for multi-leg trips
  leg_number integer DEFAULT 1 NOT NULL,
  total_legs integer DEFAULT 1 NOT NULL,
  
  -- Who is moving
  mover_id uuid NOT NULL REFERENCES profiles(id),
  mover_type text NOT NULL CHECK (mover_type IN ('provider', 'customer')),
  
  -- Trip type based on fulfillment
  trip_type text NOT NULL CHECK (trip_type IN (
    'on_site_service',      -- Provider travels to customer location
    'customer_pickup',      -- Customer travels to pickup location
    'provider_dropoff',     -- Provider travels to drop-off location
    'provider_pickup',      -- Provider picks up from customer
    'customer_dropoff'      -- Customer drops off to provider
  )),
  
  -- Service type for bubble display
  service_type text DEFAULT 'service' CHECK (service_type IN ('job', 'service', 'custom_service')),
  
  -- Locations
  origin_address text,
  origin_latitude numeric,
  origin_longitude numeric,
  destination_address text NOT NULL,
  destination_latitude numeric NOT NULL,
  destination_longitude numeric NOT NULL,
  
  -- Current mover location (updated during active trip)
  current_latitude numeric,
  current_longitude numeric,
  current_heading numeric,
  current_speed numeric,
  last_location_update_at timestamptz,
  
  -- Status
  trip_status text DEFAULT 'not_started' CHECK (trip_status IN (
    'not_started',
    'on_the_way',
    'arriving_soon',
    'arrived',
    'completed',
    'canceled'
  )),
  
  -- Timing
  started_at timestamptz,
  arriving_soon_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  canceled_at timestamptz,
  
  -- ETA and distance
  estimated_arrival_time timestamptz,
  estimated_distance_meters integer,
  estimated_duration_seconds integer,
  
  -- Visibility settings
  live_location_visible boolean DEFAULT true,
  viewer_id uuid REFERENCES profiles(id),
  
  -- Metadata
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_trips_booking_id ON trips(booking_id);
CREATE INDEX idx_trips_mover_id ON trips(mover_id);
CREATE INDEX idx_trips_viewer_id ON trips(viewer_id);
CREATE INDEX idx_trips_status ON trips(trip_status);
CREATE INDEX idx_trips_active ON trips(trip_status) WHERE trip_status IN ('on_the_way', 'arriving_soon');
CREATE INDEX idx_trips_booking_leg ON trips(booking_id, leg_number);

COMMENT ON TABLE trips IS 'Tracks movements between locations for bookings. Each trip represents one leg of travel.';
COMMENT ON COLUMN trips.leg_number IS 'Which leg of a multi-leg trip (1, 2, etc.)';
COMMENT ON COLUMN trips.mover_type IS 'Whether the provider or customer is the one moving';
COMMENT ON COLUMN trips.trip_type IS 'Type of trip based on fulfillment mode';
COMMENT ON COLUMN trips.service_type IS 'Type of service for visual bubble display';
COMMENT ON COLUMN trips.viewer_id IS 'The other party who can view the live location';

-- ============================================================================
-- 2. TRIP LOCATION UPDATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS trip_location_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  
  -- Location data
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  heading numeric,           -- Direction of travel in degrees (0-360)
  speed numeric,             -- Speed in meters per second
  accuracy numeric,          -- Location accuracy in meters
  altitude numeric,          -- Altitude in meters
  
  -- Update source
  update_source text DEFAULT 'app' CHECK (update_source IN ('app', 'background', 'manual')),
  
  recorded_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_trip_location_updates_trip_id ON trip_location_updates(trip_id);
CREATE INDEX idx_trip_location_updates_recorded_at ON trip_location_updates(recorded_at);
CREATE INDEX idx_trip_location_updates_trip_recent ON trip_location_updates(trip_id, recorded_at DESC);

COMMENT ON TABLE trip_location_updates IS 'Stores location updates during active trips for smooth animation and history';
COMMENT ON COLUMN trip_location_updates.heading IS 'Direction of travel (0 = North, 90 = East, etc.)';
COMMENT ON COLUMN trip_location_updates.update_source IS 'How the update was recorded (app foreground, background, or manual)';

-- ============================================================================
-- 3. HELPER FUNCTIONS
-- ============================================================================

-- Function to create trips for a booking based on fulfillment type
CREATE OR REPLACE FUNCTION create_trips_for_booking(
  p_booking_id uuid,
  p_fulfillment_type text DEFAULT NULL
)
RETURNS SETOF trips AS $$
DECLARE
  v_booking RECORD;
  v_listing RECORD;
  v_trip trips%ROWTYPE;
  v_leg_number integer := 1;
  v_total_legs integer := 1;
  v_service_type text;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Get listing details
  SELECT * INTO v_listing FROM service_listings WHERE id = v_booking.listing_id;
  
  -- Determine service type for bubble display
  IF v_listing.listing_type = 'CustomService' THEN
    v_service_type := 'custom_service';
  ELSIF v_booking.job_id IS NOT NULL THEN
    v_service_type := 'job';
  ELSE
    v_service_type := 'service';
  END IF;

  -- Get fulfillment type if not provided
  IF p_fulfillment_type IS NULL THEN
    SELECT fulfillment_type INTO p_fulfillment_type
    FROM fulfillment_options
    WHERE listing_id = v_booking.listing_id AND is_active = true
    LIMIT 1;
  END IF;

  -- Determine total legs based on fulfillment type
  IF p_fulfillment_type IN ('PickupAndDropOffByCustomer', 'PickupAndDropOffByProvider') THEN
    v_total_legs := 2;
  ELSE
    v_total_legs := 1;
  END IF;

  -- Create trips based on fulfillment type
  CASE p_fulfillment_type
    WHEN 'PickupByCustomer' THEN
      -- Customer travels to provider's location
      INSERT INTO trips (
        booking_id, leg_number, total_legs, mover_id, mover_type, trip_type,
        service_type, destination_address, destination_latitude, destination_longitude,
        viewer_id
      ) VALUES (
        p_booking_id, 1, 1, v_booking.customer_id, 'customer', 'customer_pickup',
        v_service_type, v_listing.location, v_listing.latitude, v_listing.longitude,
        v_booking.provider_id
      ) RETURNING * INTO v_trip;
      RETURN NEXT v_trip;

    WHEN 'DropOffByProvider' THEN
      -- Provider travels to customer's location
      INSERT INTO trips (
        booking_id, leg_number, total_legs, mover_id, mover_type, trip_type,
        service_type, origin_address, origin_latitude, origin_longitude,
        destination_address, destination_latitude, destination_longitude,
        viewer_id
      ) VALUES (
        p_booking_id, 1, 1, v_booking.provider_id, 'provider', 'provider_dropoff',
        v_service_type, v_listing.location, v_listing.latitude, v_listing.longitude,
        v_booking.location, 
        (v_booking.metadata->>'latitude')::numeric,
        (v_booking.metadata->>'longitude')::numeric,
        v_booking.customer_id
      ) RETURNING * INTO v_trip;
      RETURN NEXT v_trip;

    WHEN 'PickupAndDropOffByCustomer' THEN
      -- Leg 1: Customer picks up from provider
      INSERT INTO trips (
        booking_id, leg_number, total_legs, mover_id, mover_type, trip_type,
        service_type, destination_address, destination_latitude, destination_longitude,
        viewer_id
      ) VALUES (
        p_booking_id, 1, 2, v_booking.customer_id, 'customer', 'customer_pickup',
        v_service_type, v_listing.location, v_listing.latitude, v_listing.longitude,
        v_booking.provider_id
      ) RETURNING * INTO v_trip;
      RETURN NEXT v_trip;

      -- Leg 2: Customer returns to provider (created but not started)
      INSERT INTO trips (
        booking_id, leg_number, total_legs, mover_id, mover_type, trip_type,
        service_type, destination_address, destination_latitude, destination_longitude,
        viewer_id
      ) VALUES (
        p_booking_id, 2, 2, v_booking.customer_id, 'customer', 'customer_dropoff',
        v_service_type, v_listing.location, v_listing.latitude, v_listing.longitude,
        v_booking.provider_id
      ) RETURNING * INTO v_trip;
      RETURN NEXT v_trip;

    WHEN 'PickupAndDropOffByProvider' THEN
      -- Leg 1: Provider picks up from customer
      INSERT INTO trips (
        booking_id, leg_number, total_legs, mover_id, mover_type, trip_type,
        service_type, origin_address, origin_latitude, origin_longitude,
        destination_address, destination_latitude, destination_longitude,
        viewer_id
      ) VALUES (
        p_booking_id, 1, 2, v_booking.provider_id, 'provider', 'provider_pickup',
        v_service_type, v_listing.location, v_listing.latitude, v_listing.longitude,
        v_booking.location,
        (v_booking.metadata->>'latitude')::numeric,
        (v_booking.metadata->>'longitude')::numeric,
        v_booking.customer_id
      ) RETURNING * INTO v_trip;
      RETURN NEXT v_trip;

      -- Leg 2: Provider returns to customer (created but not started)
      INSERT INTO trips (
        booking_id, leg_number, total_legs, mover_id, mover_type, trip_type,
        service_type, origin_address, origin_latitude, origin_longitude,
        destination_address, destination_latitude, destination_longitude,
        viewer_id
      ) VALUES (
        p_booking_id, 2, 2, v_booking.provider_id, 'provider', 'provider_dropoff',
        v_service_type, v_listing.location, v_listing.latitude, v_listing.longitude,
        v_booking.location,
        (v_booking.metadata->>'latitude')::numeric,
        (v_booking.metadata->>'longitude')::numeric,
        v_booking.customer_id
      ) RETURNING * INTO v_trip;
      RETURN NEXT v_trip;

    WHEN 'Shipping' THEN
      -- No live tracking for shipping - handled by carrier
      NULL;

    ELSE
      -- Default: on-site service - provider travels to customer
      IF v_booking.location IS NOT NULL THEN
        INSERT INTO trips (
          booking_id, leg_number, total_legs, mover_id, mover_type, trip_type,
          service_type, origin_address, origin_latitude, origin_longitude,
          destination_address, destination_latitude, destination_longitude,
          viewer_id
        ) VALUES (
          p_booking_id, 1, 1, v_booking.provider_id, 'provider', 'on_site_service',
          v_service_type, v_listing.location, v_listing.latitude, v_listing.longitude,
          v_booking.location,
          (v_booking.metadata->>'latitude')::numeric,
          (v_booking.metadata->>'longitude')::numeric,
          v_booking.customer_id
        ) RETURNING * INTO v_trip;
        RETURN NEXT v_trip;
      END IF;
  END CASE;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_trips_for_booking IS 'Creates trip records for a booking based on its fulfillment type';

-- Function to update trip with current location
CREATE OR REPLACE FUNCTION update_trip_location(
  p_trip_id uuid,
  p_latitude numeric,
  p_longitude numeric,
  p_heading numeric DEFAULT NULL,
  p_speed numeric DEFAULT NULL,
  p_accuracy numeric DEFAULT NULL,
  p_update_source text DEFAULT 'app'
)
RETURNS trips AS $$
DECLARE
  v_trip trips%ROWTYPE;
  v_distance_to_dest numeric;
BEGIN
  -- Update current location on trip
  UPDATE trips SET
    current_latitude = p_latitude,
    current_longitude = p_longitude,
    current_heading = p_heading,
    current_speed = p_speed,
    last_location_update_at = now(),
    updated_at = now()
  WHERE id = p_trip_id
  RETURNING * INTO v_trip;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  -- Record location update
  INSERT INTO trip_location_updates (
    trip_id, latitude, longitude, heading, speed, accuracy, update_source
  ) VALUES (
    p_trip_id, p_latitude, p_longitude, p_heading, p_speed, p_accuracy, p_update_source
  );

  -- Calculate distance to destination (approximate using Haversine)
  v_distance_to_dest := 6371000 * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(v_trip.destination_latitude - p_latitude) / 2), 2) +
    COS(RADIANS(p_latitude)) * COS(RADIANS(v_trip.destination_latitude)) *
    POWER(SIN(RADIANS(v_trip.destination_longitude - p_longitude) / 2), 2)
  ));

  -- Auto-update status to "arriving_soon" if within 500 meters
  IF v_trip.trip_status = 'on_the_way' AND v_distance_to_dest < 500 THEN
    UPDATE trips SET
      trip_status = 'arriving_soon',
      arriving_soon_at = now(),
      updated_at = now()
    WHERE id = p_trip_id
    RETURNING * INTO v_trip;
  END IF;

  RETURN v_trip;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_trip_location IS 'Updates trip with current mover location and records history';

-- Function to start a trip
CREATE OR REPLACE FUNCTION start_trip(p_trip_id uuid)
RETURNS trips AS $$
DECLARE
  v_trip trips%ROWTYPE;
BEGIN
  UPDATE trips SET
    trip_status = 'on_the_way',
    started_at = now(),
    updated_at = now()
  WHERE id = p_trip_id
    AND trip_status = 'not_started'
  RETURNING * INTO v_trip;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found or already started';
  END IF;

  RETURN v_trip;
END;
$$ LANGUAGE plpgsql;

-- Function to mark trip as arrived
CREATE OR REPLACE FUNCTION mark_trip_arrived(p_trip_id uuid)
RETURNS trips AS $$
DECLARE
  v_trip trips%ROWTYPE;
BEGIN
  UPDATE trips SET
    trip_status = 'arrived',
    arrived_at = now(),
    updated_at = now()
  WHERE id = p_trip_id
    AND trip_status IN ('on_the_way', 'arriving_soon')
  RETURNING * INTO v_trip;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found or not in valid state';
  END IF;

  RETURN v_trip;
END;
$$ LANGUAGE plpgsql;

-- Function to complete a trip
CREATE OR REPLACE FUNCTION complete_trip(p_trip_id uuid)
RETURNS trips AS $$
DECLARE
  v_trip trips%ROWTYPE;
BEGIN
  UPDATE trips SET
    trip_status = 'completed',
    completed_at = now(),
    live_location_visible = false,
    updated_at = now()
  WHERE id = p_trip_id
    AND trip_status = 'arrived'
  RETURNING * INTO v_trip;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found or not in valid state';
  END IF;

  RETURN v_trip;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel a trip
CREATE OR REPLACE FUNCTION cancel_trip(p_trip_id uuid)
RETURNS trips AS $$
DECLARE
  v_trip trips%ROWTYPE;
BEGIN
  UPDATE trips SET
    trip_status = 'canceled',
    canceled_at = now(),
    live_location_visible = false,
    updated_at = now()
  WHERE id = p_trip_id
    AND trip_status NOT IN ('completed', 'canceled')
  RETURNING * INTO v_trip;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found or already completed/canceled';
  END IF;

  RETURN v_trip;
END;
$$ LANGUAGE plpgsql;

-- Function to get active trip for a booking
CREATE OR REPLACE FUNCTION get_active_trip(p_booking_id uuid)
RETURNS trips AS $$
  SELECT * FROM trips
  WHERE booking_id = p_booking_id
    AND trip_status IN ('not_started', 'on_the_way', 'arriving_soon', 'arrived')
  ORDER BY leg_number
  LIMIT 1;
$$ LANGUAGE sql;

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Trip participants can view their trips
CREATE POLICY "Trip participants can view trips"
  ON trips FOR SELECT
  TO authenticated
  USING (
    mover_id = auth.uid() OR viewer_id = auth.uid()
  );

-- Only the mover can start/update their trip
CREATE POLICY "Mover can update own trip"
  ON trips FOR UPDATE
  TO authenticated
  USING (mover_id = auth.uid())
  WITH CHECK (mover_id = auth.uid());

-- System creates trips (via functions)
CREATE POLICY "Authenticated users can create trips for their bookings"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = trips.booking_id
      AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

ALTER TABLE trip_location_updates ENABLE ROW LEVEL SECURITY;

-- Trip participants can view location updates
CREATE POLICY "Trip participants can view location updates"
  ON trip_location_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_location_updates.trip_id
      AND (t.mover_id = auth.uid() OR t.viewer_id = auth.uid())
      AND t.live_location_visible = true
    )
  );

-- Only the mover can insert location updates
CREATE POLICY "Mover can insert location updates"
  ON trip_location_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_location_updates.trip_id
      AND t.mover_id = auth.uid()
      AND t.trip_status IN ('on_the_way', 'arriving_soon')
    )
  );

-- ============================================================================
-- 5. REALTIME SUBSCRIPTION
-- ============================================================================

-- Enable realtime for trips table
ALTER PUBLICATION supabase_realtime ADD TABLE trips;

-- ============================================================================
-- 6. CLEANUP FUNCTION FOR OLD LOCATION DATA
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_trip_locations()
RETURNS void AS $$
BEGIN
  -- Delete location updates older than 24 hours for completed/canceled trips
  DELETE FROM trip_location_updates
  WHERE trip_id IN (
    SELECT id FROM trips
    WHERE trip_status IN ('completed', 'canceled')
    AND completed_at < now() - interval '24 hours'
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_trip_locations IS 'Removes old location data for completed/canceled trips to manage storage';
