/*
  # Add Custom Services, Shipping, and VAS Features

  ## Summary
  Extends the Dollarsmiley marketplace with custom services, shipping options, value-added services,
  and automated payout scheduling.

  ## New Tables

  ### 1. custom_service_options
  - `id` (uuid) - Option ID
  - `listing_id` (uuid) - Parent listing reference
  - `option_type` (text) - Size, Color, Material, Quantity, etc.
  - `option_name` (text) - Display name
  - `option_values` (jsonb) - Array of available values with price modifiers
  - `is_required` (boolean) - Must customer select this option
  - `sort_order` (integer) - Display order

  ### 2. value_added_services
  - `id` (uuid) - VAS ID
  - `listing_id` (uuid) - Parent listing
  - `service_name` (text) - e.g., "Gift Wrapping", "Installation"
  - `description` (text) - Service details
  - `price` (numeric) - Additional cost
  - `estimated_duration` (integer) - Additional time in minutes
  - `is_active` (boolean) - Availability status
  - `sort_order` (integer) - Display order

  ### 3. fulfillment_options
  - `id` (uuid) - Fulfillment ID
  - `listing_id` (uuid) - Parent listing
  - `fulfillment_type` (text) - Pickup, DropOff, PickupDropOff, Shipping
  - `shipping_mode` (text) - Platform, External, null (for non-shipping)
  - `base_cost` (numeric) - Base fulfillment cost
  - `cost_per_mile` (numeric) - For pickup/dropoff distance calculation
  - `cost_per_pound` (numeric) - Weight-based pricing
  - `estimated_days_min` (integer) - Minimum delivery days
  - `estimated_days_max` (integer) - Maximum delivery days
  - `carrier_preference` (text[]) - USPS, UPS, FedEx, DHL
  - `is_active` (boolean) - Availability status

  ### 4. shipping_addresses
  - `id` (uuid) - Address ID
  - `user_id` (uuid) - Owner
  - `label` (text) - Home, Work, etc.
  - `full_name` (text) - Recipient name
  - `address_line1` (text) - Street address
  - `address_line2` (text) - Apt, suite, etc.
  - `city` (text) - City
  - `state` (text) - State/Province
  - `postal_code` (text) - ZIP/Postal code
  - `country` (text) - Country code
  - `phone` (text) - Contact phone
  - `is_default` (boolean) - Default shipping address

  ### 5. shipments
  - `id` (uuid) - Shipment ID
  - `booking_id` (uuid) - Related booking
  - `carrier` (text) - USPS, UPS, FedEx, etc.
  - `tracking_number` (text) - Carrier tracking ID
  - `shipping_label_url` (text) - Label PDF URL
  - `origin_address` (jsonb) - Provider location
  - `destination_address` (jsonb) - Customer address
  - `weight_oz` (numeric) - Package weight in ounces
  - `dimensions` (jsonb) - Length, width, height in inches
  - `shipping_cost` (numeric) - Actual shipping cost
  - `estimated_delivery_date` (date) - Expected delivery
  - `actual_delivery_date` (date) - Actual delivery
  - `status` (text) - Pending, InTransit, OutForDelivery, Delivered, Exception
  - `tracking_events` (jsonb) - Array of tracking updates
  - `proof_of_delivery_url` (text) - Delivery photo
  - `created_at` (timestamptz) - Shipment creation
  - `updated_at` (timestamptz) - Last tracking update

  ### 6. cart_items
  - `id` (uuid) - Cart item ID
  - `user_id` (uuid) - Customer
  - `listing_id` (uuid) - Service listing
  - `listing_type` (text) - Service, CustomService
  - `quantity` (integer) - Item quantity
  - `custom_options` (jsonb) - Selected custom options
  - `selected_vas` (jsonb) - Selected value-added services
  - `fulfillment_option_id` (uuid) - Chosen fulfillment method
  - `shipping_address_id` (uuid) - Delivery address (if applicable)
  - `price_snapshot` (jsonb) - Price breakdown at add time
  - `created_at` (timestamptz) - Added to cart

  ### 7. order_items
  - `id` (uuid) - Order item ID
  - `booking_id` (uuid) - Parent booking/order
  - `listing_id` (uuid) - Service listing
  - `listing_type` (text) - Service, CustomService
  - `quantity` (integer) - Ordered quantity
  - `unit_price` (numeric) - Price per unit
  - `custom_options` (jsonb) - Selected options with values
  - `selected_vas` (jsonb) - Applied VAS with prices
  - `fulfillment_type` (text) - Pickup, DropOff, Shipping
  - `shipping_cost` (numeric) - Shipping charges
  - `subtotal` (numeric) - Items + VAS subtotal
  - `total` (numeric) - Subtotal + shipping + tax

  ### 8. payout_schedules
  - `id` (uuid) - Schedule ID
  - `booking_id` (uuid) - Related booking
  - `provider_id` (uuid) - Provider receiving payout
  - `transaction_type` (text) - Job, Service, CustomService
  - `completed_at` (timestamptz) - Booking completion date
  - `eligible_for_payout_at` (timestamptz) - After cut-off period
  - `scheduled_payout_date` (date) - Next batch payout date
  - `early_payout_eligible_at` (timestamptz) - When early request allowed
  - `early_payout_requested` (boolean) - Has provider requested early
  - `early_payout_requested_at` (timestamptz) - Request timestamp
  - `payout_status` (text) - Pending, Scheduled, Processing, Completed, Failed
  - `payout_amount` (numeric) - Provider earnings
  - `processed_at` (timestamptz) - Actual payout timestamp
  - `escrow_hold_id` (uuid) - Related escrow record

  ### 9. order_communications
  - `id` (uuid) - Communication ID
  - `booking_id` (uuid) - Related order
  - `initiated_by` (uuid) - User who started
  - `communication_type` (text) - Text, Voice, Video
  - `session_id` (text) - WebRTC or Twilio session ID
  - `duration_seconds` (integer) - Call duration
  - `recording_url` (text) - Optional recording
  - `status` (text) - Active, Ended, Failed
  - `started_at` (timestamptz) - Session start
  - `ended_at` (timestamptz) - Session end

  ### 10. shipping_rate_cache
  - `id` (uuid) - Cache entry ID
  - `origin_zip` (text) - Origin postal code
  - `destination_zip` (text) - Destination postal code
  - `weight_oz` (numeric) - Package weight
  - `dimensions_hash` (text) - Hash of dimensions
  - `carrier` (text) - Carrier name
  - `service_type` (text) - Service level
  - `rate` (numeric) - Cached rate
  - `delivery_days` (integer) - Estimated days
  - `expires_at` (timestamptz) - Cache expiration (24 hours)
  - `created_at` (timestamptz) - Cache creation

  ## Modified Tables

  ### service_listings
  - Added `listing_type` (text) - Service, CustomService
  - Added `item_weight_oz` (numeric) - Weight for shipping calculations
  - Added `item_dimensions` (jsonb) - Length, width, height for shipping
  - Added `fulfillment_window_days` (integer) - Provider's fulfillment timeline

  ### bookings
  - Added `order_type` (text) - Job, Service, CustomService
  - Added `fulfillment_type` (text) - Pickup, DropOff, Shipping
  - Added `shipping_cost` (numeric) - Shipping charges
  - Added `vas_total` (numeric) - Value-added services total
  - Added `tax_amount` (numeric) - Calculated tax
  - Added `subtotal` (numeric) - Before shipping and tax
  - Added `total_amount` (numeric) - Final total
  - Added `delivery_confirmed_at` (timestamptz) - Delivery confirmation timestamp

  ## Security
  - Enable RLS on all new tables
  - Policies restrict access to involved parties (customer, provider, admin)
  - Cart items owned by user
  - Shipments visible to customer and provider of booking
  - Communications restricted to booking participants
  - Payout schedules visible to provider and admin

  ## Indexes
  - Fast lookups on listing_id, booking_id, user_id
  - Shipping cache indexed on origin, destination, weight
  - Payout schedules indexed on dates and status
*/

-- Add listing_type to service_listings
ALTER TABLE service_listings ADD COLUMN IF NOT EXISTS listing_type text DEFAULT 'Service' CHECK (listing_type IN ('Service', 'CustomService'));
ALTER TABLE service_listings ADD COLUMN IF NOT EXISTS item_weight_oz numeric DEFAULT 0;
ALTER TABLE service_listings ADD COLUMN IF NOT EXISTS item_dimensions jsonb DEFAULT '{"length": 0, "width": 0, "height": 0}'::jsonb;
ALTER TABLE service_listings ADD COLUMN IF NOT EXISTS fulfillment_window_days integer DEFAULT 7;

-- Add order details to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'Service' CHECK (order_type IN ('Job', 'Service', 'CustomService'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fulfillment_type text CHECK (fulfillment_type IN ('Pickup', 'DropOff', 'PickupDropOff', 'Shipping'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vas_total numeric DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamptz;

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

-- Create fulfillment_options table
CREATE TABLE IF NOT EXISTS fulfillment_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES service_listings(id) ON DELETE CASCADE NOT NULL,
  fulfillment_type text NOT NULL CHECK (fulfillment_type IN ('Pickup', 'DropOff', 'PickupDropOff', 'Shipping')),
  shipping_mode text CHECK (shipping_mode IN ('Platform', 'External')),
  base_cost numeric DEFAULT 0,
  cost_per_mile numeric DEFAULT 0,
  cost_per_pound numeric DEFAULT 0,
  estimated_days_min integer DEFAULT 1,
  estimated_days_max integer DEFAULT 7,
  carrier_preference text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
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
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'InTransit', 'OutForDelivery', 'Delivered', 'Exception', 'Cancelled')),
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
  price_snapshot jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES service_listings(id) ON DELETE CASCADE NOT NULL,
  listing_type text DEFAULT 'Service',
  quantity integer DEFAULT 1,
  unit_price numeric NOT NULL,
  custom_options jsonb DEFAULT '{}'::jsonb,
  selected_vas jsonb DEFAULT '[]'::jsonb,
  fulfillment_type text,
  shipping_cost numeric DEFAULT 0,
  subtotal numeric NOT NULL,
  total numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create payout_schedules table
CREATE TABLE IF NOT EXISTS payout_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('Job', 'Service', 'CustomService')),
  completed_at timestamptz NOT NULL,
  eligible_for_payout_at timestamptz NOT NULL,
  scheduled_payout_date date NOT NULL,
  early_payout_eligible_at timestamptz NOT NULL,
  early_payout_requested boolean DEFAULT false,
  early_payout_requested_at timestamptz,
  payout_status text DEFAULT 'Pending' CHECK (payout_status IN ('Pending', 'Scheduled', 'Processing', 'Completed', 'Failed')),
  payout_amount numeric NOT NULL,
  processed_at timestamptz,
  escrow_hold_id uuid REFERENCES escrow_holds(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_fulfillment_options_listing ON fulfillment_options(listing_id);
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
ALTER TABLE fulfillment_options ENABLE ROW LEVEL SECURITY;
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

-- RLS Policies for fulfillment_options
CREATE POLICY "Anyone can view fulfillment options"
  ON fulfillment_options FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage their fulfillment options"
  ON fulfillment_options FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_listings
      WHERE service_listings.id = fulfillment_options.listing_id
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

CREATE POLICY "Providers can create and update shipments"
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

-- Function to calculate next payout date
CREATE OR REPLACE FUNCTION calculate_next_payout_date(
  p_transaction_type text,
  p_completed_at timestamptz
)
RETURNS date
LANGUAGE plpgsql
AS $$
DECLARE
  v_cycle_days integer;
  v_cutoff_days integer;
  v_eligible_date timestamptz;
  v_next_payout date;
BEGIN
  -- Determine cycle and cutoff based on transaction type
  IF p_transaction_type = 'Job' THEN
    v_cycle_days := 7;
    v_cutoff_days := 3;
  ELSE
    v_cycle_days := 14;
    v_cutoff_days := 5;
  END IF;

  -- Calculate eligible date (completion + cutoff)
  v_eligible_date := p_completed_at + (v_cutoff_days || ' days')::interval;

  -- Find next payout date (next cycle date after eligible)
  v_next_payout := (v_eligible_date::date + v_cycle_days);

  RETURN v_next_payout;
END;
$$;

-- Function to create payout schedule on booking completion
CREATE OR REPLACE FUNCTION create_payout_schedule_on_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_transaction_type text;
  v_cutoff_days integer;
  v_early_days integer;
BEGIN
  -- Only proceed if status changed to Completed
  IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN

    -- Determine transaction type
    IF NEW.job_id IS NOT NULL THEN
      v_transaction_type := 'Job';
      v_cutoff_days := 3;
      v_early_days := 3;
    ELSIF NEW.order_type = 'CustomService' THEN
      v_transaction_type := 'CustomService';
      v_cutoff_days := 5;
      v_early_days := 7;
    ELSE
      v_transaction_type := 'Service';
      v_cutoff_days := 5;
      v_early_days := 7;
    END IF;

    -- Get or create escrow hold
    IF NOT EXISTS (SELECT 1 FROM escrow_holds WHERE booking_id = NEW.id) THEN
      INSERT INTO escrow_holds (
        booking_id,
        customer_id,
        provider_id,
        amount,
        platform_fee,
        provider_payout,
        status,
        held_at,
        expires_at
      ) VALUES (
        NEW.id,
        NEW.customer_id,
        NEW.provider_id,
        NEW.total_amount,
        NEW.platform_fee,
        NEW.provider_payout,
        'Held',
        now(),
        now() + interval '90 days'
      );
    END IF;

    -- Create payout schedule
    INSERT INTO payout_schedules (
      booking_id,
      provider_id,
      transaction_type,
      completed_at,
      eligible_for_payout_at,
      scheduled_payout_date,
      early_payout_eligible_at,
      payout_amount,
      payout_status,
      escrow_hold_id
    ) VALUES (
      NEW.id,
      NEW.provider_id,
      v_transaction_type,
      now(),
      now() + (v_cutoff_days || ' days')::interval,
      calculate_next_payout_date(v_transaction_type, now()),
      now() + (v_early_days || ' days')::interval,
      NEW.provider_payout,
      'Pending',
      (SELECT id FROM escrow_holds WHERE booking_id = NEW.id ORDER BY created_at DESC LIMIT 1)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for automatic payout schedule creation
DROP TRIGGER IF EXISTS trigger_create_payout_schedule ON bookings;
CREATE TRIGGER trigger_create_payout_schedule
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_payout_schedule_on_completion();

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
    status = p_status,
    tracking_events = tracking_events || p_tracking_event,
    actual_delivery_date = CASE
      WHEN p_status = 'Delivered' THEN CURRENT_DATE
      ELSE actual_delivery_date
    END,
    updated_at = now()
  WHERE id = p_shipment_id;

  -- If delivered, update booking
  IF p_status = 'Delivered' THEN
    UPDATE bookings
    SET delivery_confirmed_at = now()
    WHERE id = (SELECT booking_id FROM shipments WHERE id = p_shipment_id);
  END IF;
END;
$$;
