/*
  # Optional Provider-Controlled Proofing System

  ## Summary
  Makes proofing an optional, provider-configurable feature for Custom Services while
  preserving all existing proofing behavior. Providers can enable or disable proofing
  per listing or in batch.

  ## Changes Made

  1. **service_listings table enhancements**:
     - `proofing_required` - Boolean flag (defaults to true for backward compatibility)
     - `proofing_updated_at` - When proofing setting was last changed
     - `proofing_updated_by` - Who changed the proofing setting

  2. **production_orders table enhancements**:
     - `proofing_bypassed` - Flag when order proceeds without proofing
     - `proofing_bypass_reason` - Why proofing was not required

  3. **New Functions**:
     - `set_listing_proofing_requirement()` - Enable/disable proofing for one listing
     - `batch_update_listing_proofing()` - Update proofing for multiple listings
     - `get_listing_proofing_status()` - Check if proofing is required
     - `can_proceed_without_proof()` - Determine if order can proceed

  ## Business Rules

  - **Proofing Enabled**: Provider must submit proof, customer must approve
  - **Proofing Disabled**: Personalization snapshot becomes production reference
  - **Backward Compatibility**: Existing listings default to proofing required (true)
  - **No Retroactive Changes**: Existing orders maintain their original workflow
  - **Clear Communication**: Customers informed about proofing availability

  ## Data Safety

  - All new columns nullable with safe defaults
  - Backward compatible with existing listings
  - No impact on existing orders
  - Idempotent functions
*/

-- ============================================================================
-- PART 1: ENHANCE SERVICE LISTINGS TABLE
-- ============================================================================

-- Add proofing configuration columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'proofing_required'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN proofing_required boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'proofing_updated_at'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN proofing_updated_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'proofing_updated_by'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN proofing_updated_by uuid REFERENCES profiles(id);
  END IF;
END $$;

COMMENT ON COLUMN service_listings.proofing_required IS 
  'Whether this listing requires proof approval before production. Defaults to true for backward compatibility.';

COMMENT ON COLUMN service_listings.proofing_updated_at IS 
  'When the proofing requirement was last changed';

COMMENT ON COLUMN service_listings.proofing_updated_by IS 
  'Provider who changed the proofing requirement';

-- Add index for proofing queries
CREATE INDEX IF NOT EXISTS idx_service_listings_proofing 
  ON service_listings(listing_type, proofing_required) 
  WHERE listing_type = 'CustomService';

-- ============================================================================
-- PART 2: ENHANCE PRODUCTION ORDERS TABLE
-- ============================================================================

-- Add proofing bypass tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'proofing_bypassed'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN proofing_bypassed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'proofing_bypass_reason'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN proofing_bypass_reason text;
  END IF;
END $$;

COMMENT ON COLUMN production_orders.proofing_bypassed IS 
  'True when order proceeds without proofing because listing has proofing disabled';

COMMENT ON COLUMN production_orders.proofing_bypass_reason IS 
  'Explanation of why proofing was not required';

-- ============================================================================
-- PART 3: SET LISTING PROOFING REQUIREMENT (SINGLE LISTING)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_listing_proofing_requirement(
  p_listing_id uuid,
  p_provider_id uuid,
  p_proofing_required boolean,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_listing service_listings%ROWTYPE;
  v_old_value boolean;
BEGIN
  -- Get and verify listing
  SELECT * INTO v_listing
  FROM service_listings
  WHERE id = p_listing_id
    AND provider_id = p_provider_id
    AND listing_type = 'CustomService';

  IF v_listing.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Listing not found or not a Custom Service'
    );
  END IF;

  v_old_value := COALESCE(v_listing.proofing_required, true);

  -- Update listing
  UPDATE service_listings
  SET
    proofing_required = p_proofing_required,
    proofing_updated_at = now(),
    proofing_updated_by = p_provider_id,
    updated_at = now()
  WHERE id = p_listing_id;

  -- Log the change if value changed
  IF v_old_value != p_proofing_required THEN
    INSERT INTO production_timeline_events (
      production_order_id,
      event_type,
      description,
      metadata,
      created_at
    )
    SELECT
      NULL,
      'listing_proofing_changed',
      CASE 
        WHEN p_proofing_required THEN 'Proofing enabled for listing: ' || v_listing.title
        ELSE 'Proofing disabled for listing: ' || v_listing.title
      END,
      jsonb_build_object(
        'listing_id', p_listing_id,
        'previous_value', v_old_value,
        'new_value', p_proofing_required,
        'reason', p_reason,
        'provider_id', p_provider_id
      ),
      now();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'listing_id', p_listing_id,
    'proofing_required', p_proofing_required,
    'previous_value', v_old_value,
    'changed', v_old_value != p_proofing_required
  );
END;
$$;

-- ============================================================================
-- PART 4: BATCH UPDATE LISTING PROOFING
-- ============================================================================

CREATE OR REPLACE FUNCTION batch_update_listing_proofing(
  p_listing_ids uuid[],
  p_provider_id uuid,
  p_proofing_required boolean,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count integer := 0;
  v_listing_id uuid;
  v_result jsonb;
BEGIN
  -- Validate that all listings belong to provider
  IF EXISTS (
    SELECT 1
    FROM service_listings
    WHERE id = ANY(p_listing_ids)
      AND (provider_id != p_provider_id OR listing_type != 'CustomService')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'One or more listings not found or not owned by provider'
    );
  END IF;

  -- Update each listing
  FOREACH v_listing_id IN ARRAY p_listing_ids
  LOOP
    SELECT set_listing_proofing_requirement(
      v_listing_id,
      p_provider_id,
      p_proofing_required,
      p_reason
    ) INTO v_result;

    IF (v_result->>'success')::boolean THEN
      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'total_requested', array_length(p_listing_ids, 1),
    'proofing_required', p_proofing_required
  );
END;
$$;

-- ============================================================================
-- PART 5: GET LISTING PROOFING STATUS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_listing_proofing_status(p_listing_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_listing service_listings%ROWTYPE;
  v_proofing_required boolean;
BEGIN
  SELECT * INTO v_listing
  FROM service_listings
  WHERE id = p_listing_id;

  IF v_listing.id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Listing not found'
    );
  END IF;

  -- Default to true for backward compatibility
  v_proofing_required := COALESCE(v_listing.proofing_required, true);

  RETURN jsonb_build_object(
    'listing_id', p_listing_id,
    'listing_type', v_listing.listing_type,
    'proofing_required', v_proofing_required,
    'proofing_updated_at', v_listing.proofing_updated_at,
    'proofing_updated_by', v_listing.proofing_updated_by,
    'is_custom_service', v_listing.listing_type = 'CustomService'
  );
END;
$$;

-- ============================================================================
-- PART 6: CHECK IF ORDER CAN PROCEED WITHOUT PROOF
-- ============================================================================

CREATE OR REPLACE FUNCTION can_proceed_without_proof(p_production_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order production_orders%ROWTYPE;
  v_listing service_listings%ROWTYPE;
  v_proofing_required boolean;
  v_has_personalization_snapshot boolean;
BEGIN
  -- Get order
  SELECT * INTO v_order
  FROM production_orders
  WHERE id = p_production_order_id;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Production order not found'
    );
  END IF;

  -- Get listing from booking
  SELECT sl.* INTO v_listing
  FROM service_listings sl
  INNER JOIN bookings b ON b.listing_id = sl.id
  WHERE b.id = v_order.booking_id;

  IF v_listing.id IS NULL THEN
    RETURN jsonb_build_object(
      'can_proceed', false,
      'reason', 'Listing not found for this order'
    );
  END IF;

  -- Check proofing requirement
  v_proofing_required := COALESCE(v_listing.proofing_required, true);

  -- If proofing is required, cannot proceed without proof
  IF v_proofing_required THEN
    RETURN jsonb_build_object(
      'can_proceed', false,
      'reason', 'Proofing is required for this listing',
      'proofing_required', true
    );
  END IF;

  -- Check if personalization snapshot exists
  SELECT EXISTS(
    SELECT 1 
    FROM personalization_snapshots
    WHERE production_order_id = p_production_order_id
  ) INTO v_has_personalization_snapshot;

  RETURN jsonb_build_object(
    'can_proceed', true,
    'reason', 'Proofing is not required - proceeding with personalization snapshot',
    'proofing_required', false,
    'has_personalization_snapshot', v_has_personalization_snapshot
  );
END;
$$;

-- ============================================================================
-- PART 7: MARK ORDER AS PROCEEDING WITHOUT PROOFING
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_order_proofing_bypassed(
  p_production_order_id uuid,
  p_reason text DEFAULT 'Proofing not required for this listing'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order production_orders%ROWTYPE;
  v_can_proceed jsonb;
BEGIN
  -- Check if can proceed without proof
  SELECT can_proceed_without_proof(p_production_order_id) INTO v_can_proceed;

  IF NOT (v_can_proceed->>'can_proceed')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_can_proceed->>'reason'
    );
  END IF;

  -- Mark order as proofing bypassed
  UPDATE production_orders
  SET
    proofing_bypassed = true,
    proofing_bypass_reason = p_reason,
    updated_at = now()
  WHERE id = p_production_order_id
  RETURNING * INTO v_order;

  -- Create timeline event
  INSERT INTO production_timeline_events (
    production_order_id,
    event_type,
    description,
    metadata
  ) VALUES (
    p_production_order_id,
    'proofing_bypassed',
    'Order proceeding without proofing - using personalization snapshot as production reference',
    jsonb_build_object(
      'reason', p_reason,
      'proofing_required', false,
      'production_reference', 'personalization_snapshot'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'production_order_id', p_production_order_id,
    'proofing_bypassed', true,
    'current_status', v_order.status
  );
END;
$$;

-- ============================================================================
-- PART 8: RLS POLICIES
-- ============================================================================

-- Allow providers to update proofing settings for their listings
DROP POLICY IF EXISTS "Providers can update proofing for their listings" ON service_listings;
CREATE POLICY "Providers can update proofing for their listings"
  ON service_listings FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- ============================================================================
-- PART 9: HELPER VIEW FOR PROVIDERS
-- ============================================================================

CREATE OR REPLACE VIEW provider_listing_proofing_summary AS
SELECT
  sl.id as listing_id,
  sl.provider_id,
  sl.title,
  sl.listing_type,
  COALESCE(sl.proofing_required, true) as proofing_required,
  sl.proofing_updated_at,
  sl.proofing_updated_by,
  COUNT(DISTINCT po.id) as total_orders,
  COUNT(DISTINCT po.id) FILTER (WHERE po.proofing_bypassed = true) as orders_without_proofing,
  COUNT(DISTINCT p.id) as total_proofs_submitted
FROM service_listings sl
LEFT JOIN bookings b ON b.listing_id = sl.id
LEFT JOIN production_orders po ON po.booking_id = b.id
LEFT JOIN proofs p ON p.production_order_id = po.id
WHERE sl.listing_type = 'CustomService'
GROUP BY sl.id, sl.provider_id, sl.title, sl.listing_type, 
         sl.proofing_required, sl.proofing_updated_at, sl.proofing_updated_by;

COMMENT ON VIEW provider_listing_proofing_summary IS
  'Summary of proofing settings and usage for provider Custom Service listings';

-- ============================================================================
-- PART 10: DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION set_listing_proofing_requirement IS
  'Enable or disable proofing requirement for a single Custom Service listing';

COMMENT ON FUNCTION batch_update_listing_proofing IS
  'Enable or disable proofing requirement for multiple listings in one operation';

COMMENT ON FUNCTION get_listing_proofing_status IS
  'Check if proofing is required for a specific listing';

COMMENT ON FUNCTION can_proceed_without_proof IS
  'Determine if a production order can proceed without proof submission based on listing configuration';

COMMENT ON FUNCTION mark_order_proofing_bypassed IS
  'Mark an order as proceeding without proofing when listing has proofing disabled';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Optional provider-controlled proofing enabled';
  RAISE NOTICE '  - Proofing requirement now configurable per listing';
  RAISE NOTICE '  - Batch update functions created';
  RAISE NOTICE '  - Backward compatible: existing listings default to proofing required';
  RAISE NOTICE '  - Personalization snapshots become production reference when proofing disabled';
  RAISE NOTICE '  - Complete audit trail maintained';
END $$;
