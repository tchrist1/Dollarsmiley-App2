/*
  # Add Service Agreements and Damage Deposits to Listings and Bookings

  ## Summary
  Adds columns for service agreements and damage deposits to service_listings and bookings.
  Creates fulfillment_tracking table and helper functions.

  ## Changes Made

  1. **Columns Added to service_listings**:
     - `requires_agreement` - Provider toggle
     - `requires_damage_deposit` - Provider toggle  
     - `damage_deposit_amount` - Deposit amount

  2. **Columns Added to bookings**:
     - `agreement_id` - Reference to agreement
     - `agreement_accepted_at` - Acceptance timestamp
     - `damage_deposit_amount` - Actual deposit
     - `damage_deposit_status` - Status tracking
     - `damage_deposit_payment_intent_id` - Stripe reference
     - `fulfillment_status` - Current fulfillment status
     - `fulfillment_completed_at` - Completion timestamp

  3. **New Table**:
     - `fulfillment_tracking` - Event tracking

  4. **Functions**:
     - `get_applicable_agreement()` - Agreement selection
     - `check_fulfillment_completion()` - Completion validation

  ## Backward Compatibility
  - Safe defaults on all columns
  - No existing data affected
*/

-- ============================================================================
-- 1. ADD COLUMNS TO SERVICE_LISTINGS
-- ============================================================================

ALTER TABLE service_listings
  ADD COLUMN IF NOT EXISTS requires_agreement boolean DEFAULT false;

ALTER TABLE service_listings
  ADD COLUMN IF NOT EXISTS requires_damage_deposit boolean DEFAULT false;

ALTER TABLE service_listings
  ADD COLUMN IF NOT EXISTS damage_deposit_amount numeric DEFAULT 0 CHECK (damage_deposit_amount >= 0);

COMMENT ON COLUMN service_listings.requires_agreement IS 'Provider toggle: require customer to accept standard service agreement at checkout';
COMMENT ON COLUMN service_listings.requires_damage_deposit IS 'Provider toggle: require refundable damage deposit';
COMMENT ON COLUMN service_listings.damage_deposit_amount IS 'Amount of damage deposit if required';

-- ============================================================================
-- 2. ADD COLUMNS TO BOOKINGS
-- ============================================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS agreement_id uuid REFERENCES standard_service_agreements(id);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS agreement_accepted_at timestamptz;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS damage_deposit_amount numeric DEFAULT 0 CHECK (damage_deposit_amount >= 0);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS damage_deposit_status text DEFAULT 'None' CHECK (damage_deposit_status IN (
    'None', 'Authorized', 'Held', 'Assessed', 'PartialCaptured', 'FullyCaptured', 'Released'
  ));

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS damage_deposit_payment_intent_id text;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS fulfillment_status text DEFAULT 'NotRequired' CHECK (fulfillment_status IN (
    'NotRequired', 'Pending', 'InTransit', 'AwaitingPickup', 'AwaitingDropOff', 
    'AwaitingReturn', 'Completed', 'Expired'
  ));

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS fulfillment_completed_at timestamptz;

COMMENT ON COLUMN bookings.agreement_id IS 'Reference to the agreement customer accepted';
COMMENT ON COLUMN bookings.agreement_accepted_at IS 'Timestamp when customer explicitly accepted the agreement';
COMMENT ON COLUMN bookings.damage_deposit_amount IS 'Actual damage deposit amount charged for this booking';
COMMENT ON COLUMN bookings.damage_deposit_status IS 'Current status of damage deposit';
COMMENT ON COLUMN bookings.damage_deposit_payment_intent_id IS 'Stripe payment intent ID for the damage deposit';
COMMENT ON COLUMN bookings.fulfillment_status IS 'Current fulfillment status based on selected fulfillment mode';
COMMENT ON COLUMN bookings.fulfillment_completed_at IS 'Timestamp when fulfillment was confirmed complete';

-- ============================================================================
-- 3. CREATE FULFILLMENT TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS fulfillment_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  fulfillment_type text NOT NULL CHECK (fulfillment_type IN (
    'PickupByCustomer',
    'DropOffByProvider',
    'PickupAndDropOffByCustomer',
    'PickupAndDropOffByProvider',
    'Shipping'
  )),
  event_type text NOT NULL CHECK (event_type IN (
    'PickupScheduled', 'PickupConfirmed', 'DropOffScheduled', 'DropOffConfirmed',
    'ShipmentCreated', 'InTransit', 'Delivered', 'ReturnShipmentCreated', 'ReturnDelivered'
  )),
  event_date timestamptz DEFAULT now(),
  confirmed_by uuid REFERENCES profiles(id),
  confirmation_method text CHECK (confirmation_method IN ('CustomerConfirm', 'ProviderConfirm', 'AutoExpired', 'CarrierConfirm')),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_tracking_booking ON fulfillment_tracking(booking_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_tracking_type ON fulfillment_tracking(fulfillment_type);
CREATE INDEX IF NOT EXISTS idx_fulfillment_tracking_event ON fulfillment_tracking(event_type);

COMMENT ON TABLE fulfillment_tracking IS 'Tracks all fulfillment events for pickup, drop-off, and shipping confirmations';

-- ============================================================================
-- 4. RLS POLICIES FOR FULFILLMENT TRACKING
-- ============================================================================

ALTER TABLE fulfillment_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking participants can view tracking"
  ON fulfillment_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = fulfillment_tracking.booking_id
      AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Booking participants can insert tracking"
  ON fulfillment_tracking FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = fulfillment_tracking.booking_id
      AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to get applicable agreement based on fulfillment modes
CREATE OR REPLACE FUNCTION get_applicable_agreement(p_listing_id uuid)
RETURNS uuid AS $$
DECLARE
  v_requires_fulfilment boolean;
  v_fulfillment_modes text[];
  v_agreement_type text;
  v_agreement_id uuid;
BEGIN
  SELECT requires_fulfilment INTO v_requires_fulfilment
  FROM service_listings
  WHERE id = p_listing_id;

  IF v_requires_fulfilment = false OR v_requires_fulfilment IS NULL THEN
    SELECT id INTO v_agreement_id
    FROM standard_service_agreements
    WHERE agreement_type = 'NoFulfillment' AND is_active = true
    ORDER BY version DESC
    LIMIT 1;
    RETURN v_agreement_id;
  END IF;

  SELECT array_agg(fulfillment_type) INTO v_fulfillment_modes
  FROM fulfillment_options
  WHERE listing_id = p_listing_id AND is_active = true;

  -- Priority order: most complex first
  IF 'Shipping' = ANY(v_fulfillment_modes) THEN
    v_agreement_type := 'Shipping';
  ELSIF 'PickupAndDropOffByProvider' = ANY(v_fulfillment_modes) THEN
    v_agreement_type := 'PickupAndDropOffByProvider';
  ELSIF 'PickupAndDropOffByCustomer' = ANY(v_fulfillment_modes) THEN
    v_agreement_type := 'PickupAndDropOffByCustomer';
  ELSIF 'DropOffByProvider' = ANY(v_fulfillment_modes) THEN
    v_agreement_type := 'DropOffByProvider';
  ELSIF 'PickupByCustomer' = ANY(v_fulfillment_modes) THEN
    v_agreement_type := 'PickupByCustomer';
  ELSE
    v_agreement_type := 'NoFulfillment';
  END IF;

  SELECT id INTO v_agreement_id
  FROM standard_service_agreements
  WHERE agreement_type = v_agreement_type AND is_active = true
  ORDER BY version DESC
  LIMIT 1;

  RETURN v_agreement_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_applicable_agreement IS 'Returns the appropriate agreement ID based on listing fulfillment modes';

-- Function to check if fulfillment is complete
CREATE OR REPLACE FUNCTION check_fulfillment_completion(p_booking_id uuid)
RETURNS boolean AS $$
DECLARE
  v_requires_fulfilment boolean;
  v_fulfillment_modes text[];
  v_fulfillment_events text[];
  v_is_complete boolean := false;
BEGIN
  SELECT sl.requires_fulfilment INTO v_requires_fulfilment
  FROM bookings b
  JOIN service_listings sl ON sl.id = b.listing_id
  WHERE b.id = p_booking_id;

  IF v_requires_fulfilment = false OR v_requires_fulfilment IS NULL THEN
    RETURN true;
  END IF;

  SELECT array_agg(fo.fulfillment_type) INTO v_fulfillment_modes
  FROM bookings b
  JOIN service_listings sl ON sl.id = b.listing_id
  JOIN fulfillment_options fo ON fo.listing_id = sl.id
  WHERE b.id = p_booking_id AND fo.is_active = true;

  SELECT array_agg(event_type) INTO v_fulfillment_events
  FROM fulfillment_tracking
  WHERE booking_id = p_booking_id;

  IF 'Shipping' = ANY(v_fulfillment_modes) THEN
    v_is_complete := 'Delivered' = ANY(v_fulfillment_events);
    IF 'ReturnShipmentCreated' = ANY(v_fulfillment_events) THEN
      v_is_complete := v_is_complete AND 'ReturnDelivered' = ANY(v_fulfillment_events);
    END IF;
  ELSIF 'PickupAndDropOffByProvider' = ANY(v_fulfillment_modes) THEN
    v_is_complete := 'PickupConfirmed' = ANY(v_fulfillment_events) 
                     AND 'DropOffConfirmed' = ANY(v_fulfillment_events);
  ELSIF 'PickupAndDropOffByCustomer' = ANY(v_fulfillment_modes) THEN
    v_is_complete := 'PickupConfirmed' = ANY(v_fulfillment_events) 
                     AND 'DropOffConfirmed' = ANY(v_fulfillment_events);
  ELSIF 'DropOffByProvider' = ANY(v_fulfillment_modes) THEN
    v_is_complete := 'DropOffConfirmed' = ANY(v_fulfillment_events);
  ELSIF 'PickupByCustomer' = ANY(v_fulfillment_modes) THEN
    v_is_complete := 'PickupConfirmed' = ANY(v_fulfillment_events);
  END IF;

  RETURN COALESCE(v_is_complete, false);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_fulfillment_completion IS 'Validates if fulfillment requirements are met for a booking';

-- ============================================================================
-- 6. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_service_listings_requires_agreement 
  ON service_listings(requires_agreement) WHERE requires_agreement = true;

CREATE INDEX IF NOT EXISTS idx_service_listings_requires_deposit 
  ON service_listings(requires_damage_deposit) WHERE requires_damage_deposit = true;

CREATE INDEX IF NOT EXISTS idx_bookings_agreement_id ON bookings(agreement_id);
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_status ON bookings(damage_deposit_status);
CREATE INDEX IF NOT EXISTS idx_bookings_fulfillment_status ON bookings(fulfillment_status);
