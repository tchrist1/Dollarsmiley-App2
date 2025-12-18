/*
  # Create Custom Service Payment Flow System
  
  ## Summary
  Creates comprehensive custom service order management with Stripe manual capture payment flow,
  price change approval tracking, provider capacity controls, and refund policy management.
  
  ## Tables Created/Enhanced
  
  ### 1. production_orders (create if not exists)
  Tracks custom product/service orders through consultation, proofing, production, and delivery.
  Now includes payment authorization and capture tracking.
  
  ### 2. proofs (create if not exists)
  Tracks design proofs and customer approvals.
  
  ### 3. production_timeline_events (create if not exists)
  Audit trail of all order status changes and activities.
  
  ## New Features
  - Stripe PaymentIntent integration with manual capture
  - Price change approval workflow
  - Provider capacity controls
  - Automatic refund policy determination
  - Authorization hold expiry tracking
  - Price change audit trail
  
  ## Payment Flow States
  1. inquiry → No payment yet
  2. procurement_started → Authorization hold placed
  3. price_proposed → Provider proposed final price
  4. price_approved → Customer approved final price
  5. order_received → Payment captured (triggers payout schedule)
  6. in_production → Order being fulfilled
  7. completed → Order complete
  8. cancelled → Order cancelled (refund if captured)
  
  ## Data Safety
  - Uses IF NOT EXISTS for all tables and columns
  - All new fields nullable or have defaults
  - Backward compatible with existing code
*/

-- ============================================================================
-- PART 1: CREATE CORE TABLES IF NOT EXISTS
-- ============================================================================

-- Production Orders Table
CREATE TABLE IF NOT EXISTS production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_type text NOT NULL,
  requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  materials jsonb DEFAULT '{}'::jsonb,
  
  -- Order status and lifecycle
  status text DEFAULT 'inquiry' CHECK (status IN (
    'inquiry',
    'procurement_started',
    'price_proposed',
    'price_approved',
    'order_received',
    'consultation',
    'proofing',
    'approved',
    'in_production',
    'quality_check',
    'completed',
    'cancelled'
  )),
  
  -- Payment and pricing tracking
  payment_intent_id text,
  authorization_amount numeric CHECK (authorization_amount >= 0),
  proposed_price numeric CHECK (proposed_price >= 0),
  final_price numeric CHECK (final_price >= 0),
  price_change_reason text,
  customer_price_approved_at timestamptz,
  order_received_at timestamptz,
  payment_captured_at timestamptz,
  authorization_expires_at timestamptz,
  price_changes jsonb DEFAULT '[]'::jsonb,
  
  -- Refund and cancellation
  refund_policy text CHECK (refund_policy IN ('fully_refundable', 'partially_refundable', 'non_refundable')),
  cancellation_reason text,
  
  -- Production tracking
  estimated_completion_date timestamptz,
  actual_completion_date timestamptz,
  production_notes text,
  cost_breakdown jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Proofs Table
CREATE TABLE IF NOT EXISTS proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  proof_images text[] DEFAULT ARRAY[]::text[],
  design_files text[] DEFAULT ARRAY[]::text[],
  provider_notes text,
  customer_feedback text,
  change_requests jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'revision_requested'
  )),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Production Timeline Events
CREATE TABLE IF NOT EXISTS production_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- PART 2: ADD PROVIDER CAPACITY SETTINGS TO PROFILES
-- ============================================================================

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS max_active_custom_orders integer CHECK (max_active_custom_orders > 0);

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS max_daily_custom_orders integer CHECK (max_daily_custom_orders > 0);

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS service_radius_miles numeric CHECK (service_radius_miles > 0);

-- ============================================================================
-- PART 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_production_orders_booking ON production_orders(booking_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_customer ON production_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_provider ON production_orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_orders_created ON production_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_orders_payment_intent ON production_orders(payment_intent_id) WHERE payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_production_orders_auth_expiry ON production_orders(authorization_expires_at) 
  WHERE authorization_expires_at IS NOT NULL AND status IN ('procurement_started', 'price_proposed', 'price_approved');

CREATE INDEX IF NOT EXISTS idx_proofs_production_order ON proofs(production_order_id);
CREATE INDEX IF NOT EXISTS idx_proofs_status ON proofs(status);
CREATE INDEX IF NOT EXISTS idx_proofs_version ON proofs(production_order_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_production_timeline_order ON production_timeline_events(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_timeline_created ON production_timeline_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_capacity ON profiles(id) 
  WHERE max_active_custom_orders IS NOT NULL OR max_daily_custom_orders IS NOT NULL;

-- ============================================================================
-- PART 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_timeline_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for production_orders
DROP POLICY IF EXISTS "Customers can view own production orders" ON production_orders;
CREATE POLICY "Customers can view own production orders"
  ON production_orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Providers can view assigned production orders" ON production_orders;
CREATE POLICY "Providers can view assigned production orders"
  ON production_orders FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "Customers can create production orders" ON production_orders;
CREATE POLICY "Customers can create production orders"
  ON production_orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can update own production orders" ON production_orders;
CREATE POLICY "Customers can update own production orders"
  ON production_orders FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Providers can update assigned production orders" ON production_orders;
CREATE POLICY "Providers can update assigned production orders"
  ON production_orders FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- RLS Policies for proofs
DROP POLICY IF EXISTS "Users can view proofs for their production orders" ON proofs;
CREATE POLICY "Users can view proofs for their production orders"
  ON proofs FOR SELECT
  TO authenticated
  USING (
    production_order_id IN (
      SELECT id FROM production_orders 
      WHERE customer_id = auth.uid() OR provider_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Providers can create proofs" ON proofs;
CREATE POLICY "Providers can create proofs"
  ON proofs FOR INSERT
  TO authenticated
  WITH CHECK (
    production_order_id IN (
      SELECT id FROM production_orders WHERE provider_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update proofs for their orders" ON proofs;
CREATE POLICY "Users can update proofs for their orders"
  ON proofs FOR UPDATE
  TO authenticated
  USING (
    production_order_id IN (
      SELECT id FROM production_orders 
      WHERE customer_id = auth.uid() OR provider_id = auth.uid()
    )
  )
  WITH CHECK (
    production_order_id IN (
      SELECT id FROM production_orders 
      WHERE customer_id = auth.uid() OR provider_id = auth.uid()
    )
  );

-- RLS Policies for timeline events
DROP POLICY IF EXISTS "Users can view timeline for their production orders" ON production_timeline_events;
CREATE POLICY "Users can view timeline for their production orders"
  ON production_timeline_events FOR SELECT
  TO authenticated
  USING (
    production_order_id IN (
      SELECT id FROM production_orders 
      WHERE customer_id = auth.uid() OR provider_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can create timeline events" ON production_timeline_events;
CREATE POLICY "System can create timeline events"
  ON production_timeline_events FOR INSERT
  TO authenticated
  WITH CHECK (
    production_order_id IN (
      SELECT id FROM production_orders 
      WHERE customer_id = auth.uid() OR provider_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 5: CREATE BUSINESS LOGIC FUNCTIONS
-- ============================================================================

-- Function to check provider capacity
CREATE OR REPLACE FUNCTION check_provider_capacity(
  p_provider_id uuid
)
RETURNS TABLE(
  can_accept_order boolean,
  reason text,
  active_orders integer,
  today_orders integer,
  max_active integer,
  max_daily integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_active integer;
  v_max_daily integer;
  v_active_count integer;
  v_today_count integer;
BEGIN
  SELECT 
    p.max_active_custom_orders,
    p.max_daily_custom_orders
  INTO v_max_active, v_max_daily
  FROM profiles p
  WHERE p.id = p_provider_id;
  
  SELECT COUNT(*) INTO v_active_count
  FROM production_orders
  WHERE provider_id = p_provider_id
    AND status NOT IN ('completed', 'cancelled')
    AND created_at > now() - interval '90 days';
  
  SELECT COUNT(*) INTO v_today_count
  FROM production_orders
  WHERE provider_id = p_provider_id
    AND created_at >= CURRENT_DATE;
  
  IF v_max_active IS NOT NULL AND v_active_count >= v_max_active THEN
    RETURN QUERY SELECT 
      false, 
      'Provider at maximum active order capacity'::text,
      v_active_count,
      v_today_count,
      v_max_active,
      v_max_daily;
    RETURN;
  END IF;
  
  IF v_max_daily IS NOT NULL AND v_today_count >= v_max_daily THEN
    RETURN QUERY SELECT 
      false,
      'Provider at maximum daily order capacity'::text,
      v_active_count,
      v_today_count,
      v_max_active,
      v_max_daily;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    true,
    'Provider can accept new orders'::text,
    v_active_count,
    v_today_count,
    v_max_active,
    v_max_daily;
END;
$$;

-- Function to update refund policy based on status
CREATE OR REPLACE FUNCTION update_refund_policy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.refund_policy := CASE
    WHEN NEW.status IN ('inquiry', 'procurement_started', 'price_proposed') THEN 'fully_refundable'
    WHEN NEW.status = 'price_approved' AND NEW.order_received_at IS NULL THEN 'fully_refundable'
    WHEN NEW.status IN ('order_received', 'consultation', 'proofing') THEN 'partially_refundable'
    WHEN NEW.status IN ('approved', 'in_production', 'quality_check') THEN 'non_refundable'
    WHEN NEW.status = 'completed' THEN 'non_refundable'
    ELSE COALESCE(NEW.refund_policy, 'fully_refundable')
  END;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-update refund policy
DROP TRIGGER IF EXISTS trigger_update_refund_policy ON production_orders;
CREATE TRIGGER trigger_update_refund_policy
  BEFORE INSERT OR UPDATE ON production_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_refund_policy();

-- Function to log price changes
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_price_change jsonb;
BEGIN
  IF (OLD.proposed_price IS DISTINCT FROM NEW.proposed_price) OR 
     (OLD.final_price IS DISTINCT FROM NEW.final_price) THEN
    
    v_price_change := jsonb_build_object(
      'timestamp', now(),
      'old_proposed_price', OLD.proposed_price,
      'new_proposed_price', NEW.proposed_price,
      'old_final_price', OLD.final_price,
      'new_final_price', NEW.final_price,
      'reason', NEW.price_change_reason,
      'status', NEW.status
    );
    
    NEW.price_changes := COALESCE(NEW.price_changes, '[]'::jsonb) || v_price_change;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to log price changes
DROP TRIGGER IF EXISTS trigger_log_price_changes ON production_orders;
CREATE TRIGGER trigger_log_price_changes
  BEFORE UPDATE ON production_orders
  FOR EACH ROW
  WHEN (OLD.proposed_price IS DISTINCT FROM NEW.proposed_price OR OLD.final_price IS DISTINCT FROM NEW.final_price)
  EXECUTE FUNCTION log_price_change();

-- ============================================================================
-- PART 6: ADD DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE production_orders IS 'Custom service orders with Stripe manual capture payment flow';
COMMENT ON COLUMN production_orders.payment_intent_id IS 'Stripe PaymentIntent ID for authorization hold';
COMMENT ON COLUMN production_orders.authorization_amount IS 'Initial amount authorized on customer card';
COMMENT ON COLUMN production_orders.proposed_price IS 'Provider-proposed final price (may differ from initial estimate)';
COMMENT ON COLUMN production_orders.final_price IS 'Customer-approved final price (captured amount)';
COMMENT ON COLUMN production_orders.customer_price_approved_at IS 'When customer explicitly approved final price';
COMMENT ON COLUMN production_orders.order_received_at IS 'When provider marked order received (triggers payment capture)';
COMMENT ON COLUMN production_orders.payment_captured_at IS 'When payment was captured from authorization hold';
COMMENT ON COLUMN production_orders.authorization_expires_at IS 'When authorization hold expires (typically ~7 days)';
COMMENT ON COLUMN production_orders.refund_policy IS 'Current refund eligibility: fully_refundable, partially_refundable, non_refundable';
COMMENT ON COLUMN production_orders.price_changes IS 'Audit trail of all price changes';

COMMENT ON COLUMN profiles.max_active_custom_orders IS 'Maximum concurrent custom orders (null = unlimited)';
COMMENT ON COLUMN profiles.max_daily_custom_orders IS 'Maximum daily custom orders (null = unlimited)';
COMMENT ON COLUMN profiles.service_radius_miles IS 'Maximum DropOff delivery radius (null = unlimited)';
