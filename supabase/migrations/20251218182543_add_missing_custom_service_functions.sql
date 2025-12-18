/*
  # Add Missing Custom Service Functions

  ## Summary
  Creates functions needed for the custom services workflow:
  - log_production_timeline_event - Logs events to timeline
  - determine_refund_policy - Determines refund eligibility
  - increment_wallet_balance - Updates provider wallet
*/

-- Function to log production timeline events
CREATE OR REPLACE FUNCTION log_production_timeline_event(
  p_production_order_id uuid,
  p_event_type text,
  p_description text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO production_timeline_events (
    production_order_id,
    event_type,
    description,
    metadata,
    created_at
  ) VALUES (
    p_production_order_id,
    p_event_type,
    p_description,
    p_metadata,
    now()
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Function to determine refund policy based on order status
CREATE OR REPLACE FUNCTION determine_refund_policy(p_status text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  CASE p_status
    WHEN 'pending_consultation', 'pending_order_received' THEN
      RETURN 'FULLY_REFUNDABLE';
    WHEN 'order_received', 'proofing', 'pending_approval' THEN
      RETURN 'PARTIAL_REFUND';
    WHEN 'in_production', 'quality_check', 'ready_for_delivery', 'shipped' THEN
      RETURN 'NON_REFUNDABLE';
    WHEN 'completed', 'cancelled', 'refunded' THEN
      RETURN 'NO_REFUND';
    ELSE
      RETURN 'FULLY_REFUNDABLE';
  END CASE;
END;
$$;

-- Function to increment wallet balance
CREATE OR REPLACE FUNCTION increment_wallet_balance(
  p_user_id uuid,
  p_amount numeric,
  p_description text DEFAULT 'Wallet credit'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update wallet balance
  UPDATE wallets 
  SET 
    balance = balance + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- If no wallet exists, create one
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance, updated_at)
    VALUES (p_user_id, p_amount, now())
    ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + p_amount,
        updated_at = now();
  END IF;
  
  -- Log the transaction
  INSERT INTO wallet_transactions (
    wallet_id,
    type,
    amount,
    description,
    status,
    created_at
  )
  SELECT 
    w.id,
    'credit',
    p_amount,
    p_description,
    'completed',
    now()
  FROM wallets w
  WHERE w.user_id = p_user_id;
END;
$$;

-- Trigger to auto-update refund policy on status change
CREATE OR REPLACE FUNCTION update_refund_policy_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.refund_policy := determine_refund_policy(NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_refund_policy ON production_orders;
CREATE TRIGGER trigger_update_refund_policy
  BEFORE UPDATE ON production_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_refund_policy_on_status_change();