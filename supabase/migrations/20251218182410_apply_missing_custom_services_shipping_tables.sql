/*
  # Apply Missing Custom Services & Shipping Tables

  ## Summary
  Creates missing tables that should have been created by migration 20251109000000

  ## New Tables
  - custom_service_options - Custom options for listings
  - value_added_services - VAS like gift wrapping, installation
  - shipping_addresses - Customer shipping addresses
  - shipments - Shipment tracking
  - cart_items - Shopping cart
  - order_items - Order line items
  - payout_schedules - Provider payout tracking
  - order_communications - In-order communication logs
  - shipping_rate_cache - Cached shipping rates
*/

-- Create custom_service_options table
CREATE TABLE IF NOT EXISTS custom_service_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES service_listings(id) ON DELETE CASCADE NOT NULL,
  option_type text NOT NULL,
  option_name text NOT NULL,
  option_values jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create value_added_services table
CREATE TABLE IF NOT EXISTS value_added_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES service_listings(id) ON DELETE CASCADE NOT NULL,
  service_name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0),
  estimated_duration integer DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shipping_addresses table
CREATE TABLE IF NOT EXISTS shipping_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  label text DEFAULT 'Home',
  full_name text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text DEFAULT 'US',
  phone text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  carrier text NOT NULL,
  tracking_number text,
  shipping_label_url text,
  origin_address jsonb NOT NULL,
  destination_address jsonb NOT NULL,
  weight_oz numeric NOT NULL,
  dimensions jsonb DEFAULT '{"length": 0, "width": 0, "height": 0}'::jsonb,
  shipping_cost numeric NOT NULL,
  estimated_delivery_date date,
  actual_delivery_date date,
  shipment_status text DEFAULT 'Pending' CHECK (shipment_status IN ('Pending', 'InTransit', 'OutForDelivery', 'Delivered', 'Exception', 'Cancelled')),
  tracking_events jsonb DEFAULT '[]'::jsonb,
  proof_of_delivery_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES service_listings(id) ON DELETE CASCADE NOT NULL,
  listing_type text DEFAULT 'Service',
  quantity integer DEFAULT 1 CHECK (quantity > 0),
  custom_options jsonb DEFAULT '{}'::jsonb,
  selected_vas jsonb DEFAULT '[]'::jsonb,
  fulfillment_option_id uuid REFERENCES fulfillment_options(id) ON DELETE SET NULL,
  shipping_address_id uuid REFERENCES shipping_addresses(id) ON DELETE SET NULL,
  price_snapshot jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES service_listings(id) ON DELETE CASCADE NOT NULL,
  listing_type text DEFAULT 'Service',
  quantity integer DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  custom_options jsonb DEFAULT '{}'::jsonb,
  selected_vas jsonb DEFAULT '[]'::jsonb,
  fulfillment_type text,
  shipping_cost numeric DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create payout_schedules table
CREATE TABLE IF NOT EXISTS payout_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('Job', 'Service', 'CustomService')),
  completed_at timestamptz NOT NULL DEFAULT now(),
  eligible_for_payout_at timestamptz NOT NULL DEFAULT now(),
  scheduled_payout_date date NOT NULL DEFAULT CURRENT_DATE,
  early_payout_eligible_at timestamptz NOT NULL DEFAULT now(),
  early_payout_requested boolean DEFAULT false,
  early_payout_requested_at timestamptz,
  payout_status text DEFAULT 'Pending' CHECK (payout_status IN ('Pending', 'Scheduled', 'Processing', 'Completed', 'Failed')),
  payout_amount numeric NOT NULL DEFAULT 0,
  processed_at timestamptz,
  escrow_hold_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_communications table
CREATE TABLE IF NOT EXISTS order_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  initiated_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  communication_type text NOT NULL CHECK (communication_type IN ('Text', 'Voice', 'Video')),
  session_id text,
  duration_seconds integer DEFAULT 0,
  recording_url text,
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Ended', 'Failed')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create shipping_rate_cache table
CREATE TABLE IF NOT EXISTS shipping_rate_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_zip text NOT NULL,
  destination_zip text NOT NULL,
  weight_oz numeric NOT NULL,
  dimensions_hash text NOT NULL,
  carrier text NOT NULL,
  service_type text NOT NULL,
  rate numeric NOT NULL,
  delivery_days integer NOT NULL,
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_service_options_listing ON custom_service_options(listing_id);
CREATE INDEX IF NOT EXISTS idx_value_added_services_listing ON value_added_services(listing_id);
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user ON shipping_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_booking ON shipments(booking_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number) WHERE tracking_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_booking ON order_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_payout_schedules_provider ON payout_schedules(provider_id);
CREATE INDEX IF NOT EXISTS idx_payout_schedules_status ON payout_schedules(payout_status);
CREATE INDEX IF NOT EXISTS idx_payout_schedules_dates ON payout_schedules(scheduled_payout_date, eligible_for_payout_at);
CREATE INDEX IF NOT EXISTS idx_order_communications_booking ON order_communications(booking_id);
CREATE INDEX IF NOT EXISTS idx_shipping_cache_lookup ON shipping_rate_cache(origin_zip, destination_zip, weight_oz, dimensions_hash);

-- Enable RLS
ALTER TABLE custom_service_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE value_added_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_rate_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_service_options
CREATE POLICY "Anyone can view custom service options"
  ON custom_service_options FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage their listing options"
  ON custom_service_options FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_listings
      WHERE service_listings.id = custom_service_options.listing_id
      AND service_listings.provider_id = auth.uid()
    )
  );

-- RLS Policies for value_added_services
CREATE POLICY "Anyone can view VAS"
  ON value_added_services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage their VAS"
  ON value_added_services FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_listings
      WHERE service_listings.id = value_added_services.listing_id
      AND service_listings.provider_id = auth.uid()
    )
  );

-- RLS Policies for shipping_addresses
CREATE POLICY "Users can view own addresses"
  ON shipping_addresses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own addresses"
  ON shipping_addresses FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for shipments
CREATE POLICY "Booking participants can view shipments"
  ON shipments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = shipments.booking_id
      AND (bookings.customer_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Providers can create shipments"
  ON shipments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = shipments.booking_id
      AND bookings.provider_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update their shipments"
  ON shipments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = shipments.booking_id
      AND bookings.provider_id = auth.uid()
    )
  );

-- RLS Policies for cart_items
CREATE POLICY "Users can view own cart"
  ON cart_items FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own cart"
  ON cart_items FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for order_items
CREATE POLICY "Booking participants can view order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = order_items.booking_id
      AND (bookings.customer_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "System can create order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for payout_schedules
CREATE POLICY "Providers can view own payout schedules"
  ON payout_schedules FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "System can manage payout schedules"
  ON payout_schedules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for order_communications
CREATE POLICY "Booking participants can view communications"
  ON order_communications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = order_communications.booking_id
      AND (bookings.customer_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Booking participants can create communications"
  ON order_communications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = order_communications.booking_id
      AND (bookings.customer_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

-- RLS Policies for shipping_rate_cache
CREATE POLICY "Anyone can view shipping rate cache"
  ON shipping_rate_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage shipping rate cache"
  ON shipping_rate_cache FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update shipment tracking
CREATE OR REPLACE FUNCTION update_shipment_tracking(
  p_shipment_id uuid,
  p_status text,
  p_tracking_event jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE shipments
  SET
    shipment_status = p_status,
    tracking_events = tracking_events || p_tracking_event,
    actual_delivery_date = CASE
      WHEN p_status = 'Delivered' THEN CURRENT_DATE
      ELSE actual_delivery_date
    END,
    updated_at = now()
  WHERE id = p_shipment_id;

  IF p_status = 'Delivered' THEN
    UPDATE bookings
    SET delivery_confirmed_at = now()
    WHERE id = (SELECT booking_id FROM shipments WHERE id = p_shipment_id);
  END IF;
END;
$$;