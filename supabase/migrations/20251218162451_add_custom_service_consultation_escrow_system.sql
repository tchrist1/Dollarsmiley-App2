/*
  # Custom Service Consultation & Escrow Payment System

  This migration adds consultation flow, escrow-based payment capture, and controlled 
  price adjustment logic for Custom Services only.

  ## 1. Service Listings Changes
    - `requires_consultation` (boolean) - Provider can require consultation before work

  ## 2. Production Orders Enhancements
    - New Custom Service statuses: pending_order_received, pending_consultation
    - Consultation tracking fields
    - Price adjustment tracking
    - Escrow payment model fields

  ## 3. New Tables
    - `custom_service_consultations` - Tracks consultation requests and sessions
    - `price_adjustments` - Tracks price change requests and approvals
    - `consultation_messages` - Messages during consultation phase

  ## 4. Security
    - RLS policies for all new tables
    - Proper access controls for customers and providers

  ## Important Notes
    - This ONLY affects Custom Services
    - Does NOT modify Jobs or Standard Services
    - Uses existing escrow infrastructure
    - Captures 100% at checkout, holds in escrow
*/

-- Add requires_consultation to service_listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'requires_consultation'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN requires_consultation boolean DEFAULT false;
  END IF;
END $$;

-- Add Custom Service specific fields to production_orders
DO $$
BEGIN
  -- Consultation requested by customer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'consultation_requested'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN consultation_requested boolean DEFAULT false;
  END IF;

  -- Consultation required (enforced)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'consultation_required'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN consultation_required boolean DEFAULT false;
  END IF;

  -- Consultation completed timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'consultation_completed_at'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN consultation_completed_at timestamptz;
  END IF;

  -- Consultation waived (provider can waive if customer didn't request)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'consultation_waived'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN consultation_waived boolean DEFAULT false;
  END IF;

  -- Escrow amount (full captured amount held)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'escrow_amount'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN escrow_amount decimal(10,2) DEFAULT 0;
  END IF;

  -- Escrow captured timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'escrow_captured_at'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN escrow_captured_at timestamptz;
  END IF;

  -- Escrow released timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'escrow_released_at'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN escrow_released_at timestamptz;
  END IF;

  -- Price adjustment allowed flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'price_adjustment_allowed'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN price_adjustment_allowed boolean DEFAULT true;
  END IF;

  -- Price adjustment used flag (only one allowed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'price_adjustment_used'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN price_adjustment_used boolean DEFAULT false;
  END IF;

  -- Consultation timer start
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'consultation_timer_started_at'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN consultation_timer_started_at timestamptz;
  END IF;

  -- Provider response deadline
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'provider_response_deadline'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN provider_response_deadline timestamptz;
  END IF;

  -- Customer response deadline
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'customer_response_deadline'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN customer_response_deadline timestamptz;
  END IF;
END $$;

-- Create custom_service_consultations table
CREATE TABLE IF NOT EXISTS custom_service_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id),
  provider_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'completed',
    'waived',
    'timed_out'
  )),
  requested_by text NOT NULL CHECK (requested_by IN ('customer', 'provider_required')),
  started_at timestamptz,
  completed_at timestamptz,
  waived_at timestamptz,
  waived_by uuid REFERENCES profiles(id),
  timeout_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create price_adjustments table
CREATE TABLE IF NOT EXISTS price_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id),
  customer_id uuid NOT NULL REFERENCES profiles(id),
  original_price decimal(10,2) NOT NULL,
  adjusted_price decimal(10,2) NOT NULL,
  adjustment_amount decimal(10,2) NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('increase', 'decrease')),
  justification text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'expired'
  )),
  customer_notified_at timestamptz,
  customer_responded_at timestamptz,
  response_deadline timestamptz,
  payment_intent_id text,
  difference_captured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create consultation_messages table
CREATE TABLE IF NOT EXISTS consultation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES custom_service_consultations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create consultation_timeouts table for tracking timeout events
CREATE TABLE IF NOT EXISTS consultation_timeouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  consultation_id uuid REFERENCES custom_service_consultations(id),
  timeout_type text NOT NULL CHECK (timeout_type IN (
    'provider_response',
    'customer_response',
    'price_adjustment_response'
  )),
  deadline_at timestamptz NOT NULL,
  notified_at timestamptz,
  expired_at timestamptz,
  action_taken text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE custom_service_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_timeouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_service_consultations
DROP POLICY IF EXISTS "Customers can view their consultations" ON custom_service_consultations;
CREATE POLICY "Customers can view their consultations"
  ON custom_service_consultations FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Providers can view their consultations" ON custom_service_consultations;
CREATE POLICY "Providers can view their consultations"
  ON custom_service_consultations FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "System can manage consultations" ON custom_service_consultations;
CREATE POLICY "System can manage consultations"
  ON custom_service_consultations FOR ALL
  TO authenticated
  USING (customer_id = auth.uid() OR provider_id = auth.uid());

-- RLS Policies for price_adjustments
DROP POLICY IF EXISTS "Customers can view their price adjustments" ON price_adjustments;
CREATE POLICY "Customers can view their price adjustments"
  ON price_adjustments FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Providers can manage their price adjustments" ON price_adjustments;
CREATE POLICY "Providers can manage their price adjustments"
  ON price_adjustments FOR ALL
  TO authenticated
  USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "Customers can respond to price adjustments" ON price_adjustments;
CREATE POLICY "Customers can respond to price adjustments"
  ON price_adjustments FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- RLS Policies for consultation_messages
DROP POLICY IF EXISTS "Consultation participants can view messages" ON consultation_messages;
CREATE POLICY "Consultation participants can view messages"
  ON consultation_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_service_consultations c
      WHERE c.id = consultation_id
      AND (c.customer_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Consultation participants can send messages" ON consultation_messages;
CREATE POLICY "Consultation participants can send messages"
  ON consultation_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_service_consultations c
      WHERE c.id = consultation_id
      AND (c.customer_id = auth.uid() OR c.provider_id = auth.uid())
    )
    AND sender_id = auth.uid()
  );

-- RLS Policies for consultation_timeouts
DROP POLICY IF EXISTS "Participants can view timeout info" ON consultation_timeouts;
CREATE POLICY "Participants can view timeout info"
  ON consultation_timeouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM production_orders po
      WHERE po.id = production_order_id
      AND (po.customer_id = auth.uid() OR po.provider_id = auth.uid())
    )
  );

-- Function to determine if consultation is required
CREATE OR REPLACE FUNCTION determine_consultation_requirement(
  p_provider_requires boolean,
  p_customer_requested boolean
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Consultation is required if:
  -- 1. Provider requires it (regardless of customer choice)
  -- 2. Customer requested AND provider requires (same result)
  RETURN p_provider_requires;
END;
$$;

-- Function to check if order can be marked as received
CREATE OR REPLACE FUNCTION can_mark_order_received(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order record;
  v_consultation record;
  v_pending_adjustment record;
BEGIN
  SELECT * INTO v_order FROM production_orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Order not found');
  END IF;

  -- Check if consultation is required and not completed
  IF v_order.consultation_required AND NOT v_order.consultation_waived THEN
    SELECT * INTO v_consultation 
    FROM custom_service_consultations 
    WHERE production_order_id = p_order_id 
    AND status IN ('completed', 'waived')
    LIMIT 1;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'allowed', false, 
        'reason', 'Consultation must be completed or waived before marking order as received'
      );
    END IF;
  END IF;

  -- Check for pending price adjustments
  SELECT * INTO v_pending_adjustment
  FROM price_adjustments
  WHERE production_order_id = p_order_id
  AND status = 'pending'
  LIMIT 1;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Pending price adjustment must be resolved before marking order as received'
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'reason', null);
END;
$$;

-- Function to check if price adjustment is allowed
CREATE OR REPLACE FUNCTION can_request_price_adjustment(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order record;
BEGIN
  SELECT * INTO v_order FROM production_orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Order not found');
  END IF;

  -- Check if already used price adjustment
  IF v_order.price_adjustment_used THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Price adjustment has already been used for this order'
    );
  END IF;

  -- Check if price adjustment is still allowed (before order received)
  IF NOT v_order.price_adjustment_allowed THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Price adjustments are no longer allowed for this order'
    );
  END IF;

  -- Check order status - only allowed in early stages
  IF v_order.status NOT IN ('pending_order_received', 'pending_consultation', 'inquiry', 'procurement_started') THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Price adjustments are only allowed before order is marked as received'
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'reason', null);
END;
$$;

-- Function to lock price adjustments after key events
CREATE OR REPLACE FUNCTION lock_price_adjustment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Lock price adjustments when order moves past certain stages
  IF NEW.status IN ('order_received', 'proofing', 'approved', 'in_production', 'quality_check', 'ready_for_delivery', 'shipped', 'delivered', 'completed') 
     AND OLD.status NOT IN ('order_received', 'proofing', 'approved', 'in_production', 'quality_check', 'ready_for_delivery', 'shipped', 'delivered', 'completed') THEN
    NEW.price_adjustment_allowed := false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to lock price adjustments
DROP TRIGGER IF EXISTS lock_price_adjustment_trigger ON production_orders;
CREATE TRIGGER lock_price_adjustment_trigger
  BEFORE UPDATE ON production_orders
  FOR EACH ROW
  EXECUTE FUNCTION lock_price_adjustment();

-- Function to start consultation timer
CREATE OR REPLACE FUNCTION start_consultation_timer(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE production_orders
  SET 
    consultation_timer_started_at = now(),
    provider_response_deadline = now() + interval '48 hours'
  WHERE id = p_order_id;

  -- Create timeout record
  INSERT INTO consultation_timeouts (
    production_order_id,
    timeout_type,
    deadline_at
  ) VALUES (
    p_order_id,
    'provider_response',
    now() + interval '48 hours'
  );
END;
$$;

-- Function to set customer response deadline
CREATE OR REPLACE FUNCTION set_customer_response_deadline(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE production_orders
  SET customer_response_deadline = now() + interval '72 hours'
  WHERE id = p_order_id;

  -- Create timeout record
  INSERT INTO consultation_timeouts (
    production_order_id,
    timeout_type,
    deadline_at
  ) VALUES (
    p_order_id,
    'customer_response',
    now() + interval '72 hours'
  );
END;
$$;

-- Function to handle consultation creation
CREATE OR REPLACE FUNCTION create_consultation_for_order(
  p_order_id uuid,
  p_requested_by text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order record;
  v_consultation_id uuid;
BEGIN
  SELECT * INTO v_order FROM production_orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  INSERT INTO custom_service_consultations (
    production_order_id,
    customer_id,
    provider_id,
    status,
    requested_by,
    timeout_at
  ) VALUES (
    p_order_id,
    v_order.customer_id,
    v_order.provider_id,
    'pending',
    p_requested_by,
    now() + interval '48 hours'
  )
  RETURNING id INTO v_consultation_id;

  -- Start consultation timer
  PERFORM start_consultation_timer(p_order_id);

  RETURN v_consultation_id;
END;
$$;

-- Function to release escrow funds
CREATE OR REPLACE FUNCTION release_escrow_funds(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order record;
  v_provider_amount decimal(10,2);
  v_platform_fee decimal(10,2);
BEGIN
  SELECT * INTO v_order FROM production_orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.escrow_released_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Escrow already released');
  END IF;

  -- Calculate amounts (15% platform fee)
  v_platform_fee := v_order.escrow_amount * 0.15;
  v_provider_amount := v_order.escrow_amount - v_platform_fee;

  -- Update order
  UPDATE production_orders
  SET escrow_released_at = now()
  WHERE id = p_order_id;

  -- Create wallet transaction for provider
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    status,
    description,
    reference_type,
    reference_id
  ) VALUES (
    v_order.provider_id,
    'credit',
    v_provider_amount,
    'completed',
    'Custom service payment released from escrow',
    'production_order',
    p_order_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'provider_amount', v_provider_amount,
    'platform_fee', v_platform_fee
  );
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_consultations_order_id ON custom_service_consultations(production_order_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON custom_service_consultations(status);
CREATE INDEX IF NOT EXISTS idx_price_adjustments_order_id ON price_adjustments(production_order_id);
CREATE INDEX IF NOT EXISTS idx_price_adjustments_status ON price_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_consultation_messages_consultation ON consultation_messages(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_timeouts_deadline ON consultation_timeouts(deadline_at) WHERE expired_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_consultation_required ON production_orders(consultation_required) WHERE consultation_required = true;
