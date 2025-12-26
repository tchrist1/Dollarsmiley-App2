/*
  # Add proofing_required Column to Service Listings

  1. Schema Changes
    - Add `proofing_required` boolean column to `service_listings` table
    - Default: FALSE (proofing is optional by default)
    - Existing Custom Service listings: Set to TRUE for backward compatibility

  2. Business Logic
    - When proofing_required is TRUE:
      - Provider must submit proof before production can complete
      - Customer must approve proof before production begins
    - When proofing_required is FALSE:
      - Proofing step is skipped entirely
      - Production proceeds directly after order_received

  3. Production Order Status Updates
    - Add `proofing_required` field to production_orders for tracking
    - Add `proofing_bypassed` flag for orders that skip proofing

  4. No destructive operations - safe additive changes only
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'proofing_required'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN proofing_required boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'proofing_required'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN proofing_required boolean DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'proofing_bypassed'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN proofing_bypassed boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proofs' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE proofs ADD COLUMN reviewed_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proofs' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE proofs ADD COLUMN reviewed_by uuid REFERENCES profiles(id);
  END IF;
END $$;

UPDATE service_listings
SET proofing_required = true
WHERE listing_type = 'CustomService'
  AND proofing_required IS NULL;

UPDATE service_listings
SET proofing_required = false
WHERE (listing_type != 'CustomService' OR listing_type IS NULL)
  AND proofing_required IS NULL;

UPDATE production_orders
SET proofing_required = true
WHERE proofing_required IS NULL;

CREATE OR REPLACE FUNCTION check_production_start_allowed(order_id uuid)
RETURNS boolean AS $$
DECLARE
  v_order RECORD;
  v_latest_proof RECORD;
BEGIN
  SELECT po.*, sl.proofing_required as listing_proofing_required
  INTO v_order
  FROM production_orders po
  LEFT JOIN service_listings sl ON po.listing_id = sl.id
  WHERE po.id = order_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_order.proofing_bypassed THEN
    RETURN true;
  END IF;

  IF v_order.listing_proofing_required = false OR v_order.proofing_required = false THEN
    RETURN true;
  END IF;

  SELECT * INTO v_latest_proof
  FROM proofs
  WHERE production_order_id = order_id
  ORDER BY version_number DESC
  LIMIT 1;

  IF FOUND AND v_latest_proof.status = 'approved' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_proof_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    NEW.reviewed_at := NOW();

    UPDATE production_orders
    SET status = 'approved',
        proof_approved_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.production_order_id;
  ELSIF NEW.status = 'revision_requested' AND (OLD.status IS NULL OR OLD.status != 'revision_requested') THEN
    NEW.reviewed_at := NOW();

    UPDATE production_orders
    SET status = 'revision_requested',
        updated_at = NOW()
    WHERE id = NEW.production_order_id;
  ELSIF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    NEW.reviewed_at := NOW();

    UPDATE production_orders
    SET status = 'rejected',
        updated_at = NOW()
    WHERE id = NEW.production_order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_proof_status_change ON proofs;

CREATE TRIGGER trigger_proof_status_change
  BEFORE UPDATE OF status ON proofs
  FOR EACH ROW
  EXECUTE FUNCTION handle_proof_status_change();

CREATE OR REPLACE FUNCTION bypass_proofing_for_order(order_id uuid, actor_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE production_orders
  SET proofing_bypassed = true,
      status = 'approved',
      updated_at = NOW()
  WHERE id = order_id
    AND proofing_required = false;

  IF FOUND THEN
    INSERT INTO production_timeline_events (
      production_order_id,
      event_type,
      description,
      actor_id,
      metadata
    ) VALUES (
      order_id,
      'proofing_bypassed',
      'Proofing bypassed - not required for this listing',
      actor_id,
      '{"reason": "proofing_not_required"}'::jsonb
    );
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN service_listings.proofing_required IS 'When TRUE, Custom Service orders require proof approval before production can begin';
COMMENT ON COLUMN production_orders.proofing_required IS 'Cached from listing at order creation - determines if proof approval is needed';
COMMENT ON COLUMN production_orders.proofing_bypassed IS 'TRUE if proofing was automatically bypassed because it was not required';