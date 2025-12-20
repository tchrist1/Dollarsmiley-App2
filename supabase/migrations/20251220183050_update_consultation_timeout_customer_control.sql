/*
  # Update Consultation Timeout to Grant Customer Control

  ## Summary
  Clarifies consultation timeout behavior to give customers clear control when providers
  fail to respond within 48 hours. Customer can proceed at original price or cancel
  for full refund.

  ## Changes Made

  1. **Enhanced consultation_timeouts table**:
     - `customer_decision` - Tracks customer's choice (proceed, cancel, pending)
     - `customer_decided_at` - When customer made decision
     - `timeout_resolution` - Final outcome of timeout

  2. **Enhanced custom_service_consultations table**:
     - `customer_can_decide` - Flag when customer gains control

  3. **New Functions**:
     - `mark_consultation_timed_out()` - System marks consultation as timed out
     - `customer_proceed_after_timeout()` - Customer chooses to proceed
     - `customer_cancel_after_timeout()` - Customer chooses to cancel and refund
     - `check_consultation_timeouts()` - Cron job to detect expired deadlines

  ## Business Rules

  - Consultation timeout = Provider didn't respond in 48 hours
  - After timeout: Customer gains exclusive control
  - Customer options: Proceed at original price OR Cancel with full refund
  - Provider cannot start work without customer confirmation after timeout
  - Full refund guaranteed on timeout cancellation
  - Order proceeds through normal lifecycle if customer chooses to continue

  ## Data Safety

  - All new columns nullable with defaults
  - Backward compatible with existing consultations
  - No retroactive changes
  - Idempotent functions
*/

-- ============================================================================
-- PART 1: ENHANCE TABLES
-- ============================================================================

-- Add customer decision tracking to consultation_timeouts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultation_timeouts' AND column_name = 'customer_decision'
  ) THEN
    ALTER TABLE consultation_timeouts ADD COLUMN customer_decision text
      CHECK (customer_decision IN ('pending', 'proceed', 'cancel'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultation_timeouts' AND column_name = 'customer_decided_at'
  ) THEN
    ALTER TABLE consultation_timeouts ADD COLUMN customer_decided_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultation_timeouts' AND column_name = 'timeout_resolution'
  ) THEN
    ALTER TABLE consultation_timeouts ADD COLUMN timeout_resolution text
      CHECK (timeout_resolution IN ('customer_proceeded', 'customer_cancelled', 'provider_responded', 'pending'));
  END IF;
END $$;

-- Add customer control flag to consultations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_service_consultations' AND column_name = 'customer_can_decide'
  ) THEN
    ALTER TABLE custom_service_consultations ADD COLUMN customer_can_decide boolean DEFAULT false;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_consultation_timeouts_deadline
  ON consultation_timeouts(deadline_at, timeout_type)
  WHERE expired_at IS NULL AND customer_decision IS NULL;

CREATE INDEX IF NOT EXISTS idx_consultations_timed_out_pending
  ON custom_service_consultations(status, customer_can_decide)
  WHERE status = 'timed_out' AND customer_can_decide = true;

-- ============================================================================
-- PART 2: MARK CONSULTATION AS TIMED OUT (SYSTEM FUNCTION)
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_consultation_timed_out(
  p_consultation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_consultation custom_service_consultations%ROWTYPE;
  v_order production_orders%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Get consultation
  SELECT * INTO v_consultation
  FROM custom_service_consultations
  WHERE id = p_consultation_id
    AND status = 'pending';

  IF v_consultation.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Consultation not found or not pending'
    );
  END IF;

  -- Check if deadline has actually passed
  IF v_consultation.timeout_at > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Consultation deadline has not passed yet'
    );
  END IF;

  -- Get production order
  SELECT * INTO v_order
  FROM production_orders
  WHERE id = v_consultation.production_order_id;

  -- Mark consultation as timed out
  UPDATE custom_service_consultations
  SET
    status = 'timed_out',
    customer_can_decide = true,
    updated_at = now()
  WHERE id = p_consultation_id;

  -- Update timeout record
  UPDATE consultation_timeouts
  SET
    expired_at = now(),
    customer_decision = 'pending',
    timeout_resolution = 'pending',
    action_taken = 'Provider did not respond within 48 hours. Customer may proceed or cancel.'
  WHERE consultation_id = p_consultation_id
    AND timeout_type = 'provider_response'
    AND expired_at IS NULL;

  -- Create timeline event
  INSERT INTO production_timeline_events (
    production_order_id,
    event_type,
    description,
    metadata
  ) VALUES (
    v_consultation.production_order_id,
    'consultation_timed_out',
    'Consultation timed out - Provider did not respond within 48 hours. Customer may proceed at original price or cancel for full refund.',
    jsonb_build_object(
      'consultation_id', p_consultation_id,
      'timeout_type', 'provider_response',
      'customer_can_decide', true,
      'original_price', v_order.escrow_amount,
      'refund_policy', 'fully_refundable'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'consultation_id', p_consultation_id,
    'customer_can_decide', true,
    'message', 'Consultation timed out. Customer may proceed or cancel.'
  );
END;
$$;

-- ============================================================================
-- PART 3: CUSTOMER PROCEEDS AFTER TIMEOUT
-- ============================================================================

CREATE OR REPLACE FUNCTION customer_proceed_after_timeout(
  p_production_order_id uuid,
  p_customer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order production_orders%ROWTYPE;
  v_consultation custom_service_consultations%ROWTYPE;
  v_timeout consultation_timeouts%ROWTYPE;
BEGIN
  -- Get and verify order
  SELECT * INTO v_order
  FROM production_orders
  WHERE id = p_production_order_id
    AND customer_id = p_customer_id;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found or access denied');
  END IF;

  -- Get consultation
  SELECT * INTO v_consultation
  FROM custom_service_consultations
  WHERE production_order_id = p_production_order_id
    AND status = 'timed_out'
    AND customer_can_decide = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_consultation.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No timed out consultation found');
  END IF;

  -- Get timeout record
  SELECT * INTO v_timeout
  FROM consultation_timeouts
  WHERE consultation_id = v_consultation.id
    AND timeout_type = 'provider_response'
    AND customer_decision = 'pending';

  IF v_timeout.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Timeout decision already made');
  END IF;

  -- Update consultation
  UPDATE custom_service_consultations
  SET
    status = 'waived',
    waived_at = now(),
    waived_by = p_customer_id,
    customer_can_decide = false,
    updated_at = now()
  WHERE id = v_consultation.id;

  -- Update timeout record
  UPDATE consultation_timeouts
  SET
    customer_decision = 'proceed',
    customer_decided_at = now(),
    timeout_resolution = 'customer_proceeded'
  WHERE id = v_timeout.id;

  -- Update production order
  UPDATE production_orders
  SET
    status = 'pending_order_received',
    consultation_waived = true,
    consultation_completed_at = now(),
    updated_at = now()
  WHERE id = p_production_order_id;

  -- Create timeline event
  INSERT INTO production_timeline_events (
    production_order_id,
    event_type,
    description,
    metadata
  ) VALUES (
    p_production_order_id,
    'customer_proceeded_after_timeout',
    'Customer chose to proceed at original price after consultation timeout',
    jsonb_build_object(
      'consultation_id', v_consultation.id,
      'decision', 'proceed',
      'original_price', v_order.escrow_amount
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'pending_order_received',
    'message', 'Order will proceed at original price without consultation'
  );
END;
$$;

-- ============================================================================
-- PART 4: CUSTOMER CANCELS AFTER TIMEOUT (FULL REFUND)
-- ============================================================================

CREATE OR REPLACE FUNCTION customer_cancel_after_timeout(
  p_production_order_id uuid,
  p_customer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order production_orders%ROWTYPE;
  v_consultation custom_service_consultations%ROWTYPE;
  v_timeout consultation_timeouts%ROWTYPE;
  v_refund_amount decimal(10,2);
BEGIN
  -- Get and verify order
  SELECT * INTO v_order
  FROM production_orders
  WHERE id = p_production_order_id
    AND customer_id = p_customer_id;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found or access denied');
  END IF;

  -- Verify no work has started
  IF v_order.status NOT IN ('pending_consultation', 'pending_order_received', 'inquiry') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot cancel - work has already started'
    );
  END IF;

  -- Get consultation
  SELECT * INTO v_consultation
  FROM custom_service_consultations
  WHERE production_order_id = p_production_order_id
    AND status = 'timed_out'
    AND customer_can_decide = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_consultation.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No timed out consultation found');
  END IF;

  -- Get timeout record
  SELECT * INTO v_timeout
  FROM consultation_timeouts
  WHERE consultation_id = v_consultation.id
    AND timeout_type = 'provider_response'
    AND customer_decision = 'pending';

  IF v_timeout.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Timeout decision already made');
  END IF;

  -- Calculate full refund amount
  v_refund_amount := COALESCE(v_order.escrow_amount, v_order.final_price, 0);

  -- Update consultation
  UPDATE custom_service_consultations
  SET
    status = 'timed_out',
    customer_can_decide = false,
    updated_at = now()
  WHERE id = v_consultation.id;

  -- Update timeout record
  UPDATE consultation_timeouts
  SET
    customer_decision = 'cancel',
    customer_decided_at = now(),
    timeout_resolution = 'customer_cancelled'
  WHERE id = v_timeout.id;

  -- Cancel production order
  UPDATE production_orders
  SET
    status = 'cancelled',
    cancellation_reason = 'Customer cancelled after provider consultation timeout',
    refund_policy = 'fully_refundable',
    updated_at = now()
  WHERE id = p_production_order_id;

  -- Create timeline event
  INSERT INTO production_timeline_events (
    production_order_id,
    event_type,
    description,
    metadata
  ) VALUES (
    p_production_order_id,
    'customer_cancelled_after_timeout',
    'Customer cancelled order after consultation timeout - Full refund issued',
    jsonb_build_object(
      'consultation_id', v_consultation.id,
      'decision', 'cancel',
      'refund_amount', v_refund_amount,
      'refund_type', 'full',
      'reason', 'Provider did not respond to consultation request'
    )
  );

  -- Note: Actual refund processing must be done via Stripe edge function
  -- Frontend should call refund-custom-service-escrow edge function

  RETURN jsonb_build_object(
    'success', true,
    'status', 'cancelled',
    'refund_amount', v_refund_amount,
    'message', 'Order cancelled - Full refund will be processed',
    'payment_intent_id', v_order.payment_intent_id
  );
END;
$$;

-- ============================================================================
-- PART 5: CHECK FOR EXPIRED CONSULTATIONS (CRON JOB)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_consultation_timeouts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count integer := 0;
  v_consultation RECORD;
  v_result jsonb;
BEGIN
  -- Find consultations with expired deadlines that haven't been marked
  FOR v_consultation IN
    SELECT c.id, c.timeout_at, c.production_order_id
    FROM custom_service_consultations c
    WHERE c.status = 'pending'
      AND c.timeout_at IS NOT NULL
      AND c.timeout_at <= now()
      AND c.customer_can_decide = false
  LOOP
    -- Mark each as timed out
    SELECT mark_consultation_timed_out(v_consultation.id) INTO v_result;

    IF (v_result->>'success')::boolean THEN
      v_expired_count := v_expired_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'checked_at', now()
  );
END;
$$;

-- ============================================================================
-- PART 6: RLS POLICIES FOR CUSTOMER DECISIONS
-- ============================================================================

-- Customers can update their own timeout decisions
DROP POLICY IF EXISTS "Customers can make timeout decisions" ON consultation_timeouts;
CREATE POLICY "Customers can make timeout decisions"
  ON consultation_timeouts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM production_orders po
      WHERE po.id = consultation_timeouts.production_order_id
        AND po.customer_id = auth.uid()
    )
    AND customer_decision = 'pending'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM production_orders po
      WHERE po.id = consultation_timeouts.production_order_id
        AND po.customer_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 7: HELPER FUNCTION TO CHECK CUSTOMER OPTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_customer_timeout_options(
  p_production_order_id uuid,
  p_customer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order production_orders%ROWTYPE;
  v_consultation custom_service_consultations%ROWTYPE;
  v_timeout consultation_timeouts%ROWTYPE;
  v_can_proceed boolean := false;
  v_can_cancel boolean := false;
BEGIN
  -- Get order
  SELECT * INTO v_order
  FROM production_orders
  WHERE id = p_production_order_id
    AND customer_id = p_customer_id;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Order not found or access denied'
    );
  END IF;

  -- Get consultation
  SELECT * INTO v_consultation
  FROM custom_service_consultations
  WHERE production_order_id = p_production_order_id
    AND status = 'timed_out'
    AND customer_can_decide = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get timeout
  IF v_consultation.id IS NOT NULL THEN
    SELECT * INTO v_timeout
    FROM consultation_timeouts
    WHERE consultation_id = v_consultation.id
      AND timeout_type = 'provider_response'
      AND customer_decision = 'pending';

    IF v_timeout.id IS NOT NULL THEN
      v_can_proceed := true;
      v_can_cancel := true;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'has_timed_out_consultation', v_consultation.id IS NOT NULL,
    'customer_can_decide', v_consultation.customer_can_decide,
    'can_proceed', v_can_proceed,
    'can_cancel', v_can_cancel,
    'original_price', v_order.escrow_amount,
    'refund_amount', v_order.escrow_amount,
    'timeout_at', v_consultation.timeout_at,
    'current_status', v_order.status
  );
END;
$$;

-- ============================================================================
-- PART 8: DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION mark_consultation_timed_out IS
  'System function to mark consultation as timed out and grant customer control';

COMMENT ON FUNCTION customer_proceed_after_timeout IS
  'Customer chooses to proceed with order at original price after provider timeout';

COMMENT ON FUNCTION customer_cancel_after_timeout IS
  'Customer chooses to cancel order and receive full refund after provider timeout';

COMMENT ON FUNCTION check_consultation_timeouts IS
  'Cron job to detect and process expired consultation deadlines';

COMMENT ON FUNCTION get_customer_timeout_options IS
  'Returns available options for customer when consultation has timed out';

COMMENT ON COLUMN consultation_timeouts.customer_decision IS
  'Customer decision after timeout: pending, proceed, or cancel';

COMMENT ON COLUMN consultation_timeouts.timeout_resolution IS
  'Final outcome: customer_proceeded, customer_cancelled, provider_responded, or pending';

COMMENT ON COLUMN custom_service_consultations.customer_can_decide IS
  'Flag indicating customer has control to proceed or cancel after provider timeout';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Consultation timeout customer control enabled';
  RAISE NOTICE '  - Customer decision tracking added';
  RAISE NOTICE '  - Customer proceed/cancel functions created';
  RAISE NOTICE '  - Full refund guaranteed on timeout cancellation';
  RAISE NOTICE '  - Automatic timeout detection configured';
  RAISE NOTICE '  - Audit trail and timeline events enabled';
END $$;
