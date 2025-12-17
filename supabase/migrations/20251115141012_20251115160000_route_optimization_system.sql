/*
  # Route Optimization System for Deliveries

  1. New Tables
    - `delivery_routes` - Planned delivery routes
    - `route_stops` - Individual stops on routes  
    - `route_optimizations` - Track optimization history

  2. Security
    - Enable RLS on all tables
*/

CREATE TABLE IF NOT EXISTS delivery_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  route_name text NOT NULL,
  route_date date NOT NULL,
  start_location jsonb NOT NULL,
  end_location jsonb,
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  total_distance numeric DEFAULT 0,
  estimated_duration integer DEFAULT 0,
  actual_duration integer,
  optimization_score numeric DEFAULT 0,
  vehicle_type text,
  driver_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routes_provider ON delivery_routes(provider_id);
CREATE INDEX IF NOT EXISTS idx_routes_date ON delivery_routes(route_date);
CREATE INDEX IF NOT EXISTS idx_routes_status ON delivery_routes(status);

ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own routes"
  ON delivery_routes FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

CREATE TABLE IF NOT EXISTS route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES delivery_routes(id) ON DELETE CASCADE,
  shipment_id uuid REFERENCES shipments(id) ON DELETE SET NULL,
  stop_order integer NOT NULL,
  location jsonb NOT NULL,
  address text,
  contact_name text,
  contact_phone text,
  estimated_arrival timestamptz,
  actual_arrival timestamptz,
  estimated_duration integer DEFAULT 15,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'arrived', 'completed', 'failed')),
  notes text,
  signature_url text,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stops_route ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_stops_shipment ON route_stops(shipment_id);
CREATE INDEX IF NOT EXISTS idx_stops_order ON route_stops(stop_order);
CREATE INDEX IF NOT EXISTS idx_stops_status ON route_stops(status);

ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stops"
  ON route_stops FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage stops"
  ON route_stops FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS route_optimizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES delivery_routes(id) ON DELETE CASCADE,
  optimization_type text DEFAULT 'distance',
  original_distance numeric,
  optimized_distance numeric,
  distance_saved numeric,
  time_saved integer,
  fuel_saved numeric,
  cost_saved numeric,
  algorithm_used text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_optimizations_route ON route_optimizations(route_id);

ALTER TABLE route_optimizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view optimizations"
  ON route_optimizations FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 numeric,
  lng1 numeric,
  lat2 numeric,
  lng2 numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  earth_radius numeric := 6371;
  dlat numeric;
  dlng numeric;
  a numeric;
  c numeric;
BEGIN
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  
  a := sin(dlat/2) * sin(dlat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlng/2) * sin(dlng/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN earth_radius * c;
END;
$$;