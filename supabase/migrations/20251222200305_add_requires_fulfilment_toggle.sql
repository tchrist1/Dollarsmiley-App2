/*
  # Add Requires Fulfilment Toggle and Extended Fulfillment Modes

  ## Summary
  Introduces service-level "Requires Fulfilment" setting and expands fulfillment modes
  to support all provider and customer transport combinations.

  ## Changes Made

  1. **Add requires_fulfilment column to service_listings**:
     - `requires_fulfilment` (boolean) - Provider-controlled setting
     - Default: false
     - When disabled: No delivery/transport required
     - When enabled: Provider must select fulfillment mode(s)

  2. **Expand fulfillment_type constraint**:
     - Add 'PickupByCustomer' - Customer picks up from provider location
     - Add 'DropOffByProvider' - Provider delivers to customer location
     - Add 'PickupAndDropOffByCustomer' - Customer handles both pickup and return
     - Add 'PickupAndDropOffByProvider' - Provider handles both pickup and return
     - Add 'Shipping' - Third-party carrier delivery

  3. **Behavior**:
     - Standard Services: When requires_fulfilment is enabled, fulfillment rules apply
     - Custom Services: Settings captured for consistency, NO logic/enforcement changes

  ## Data Safety
  - Fully backward-compatible
  - Default requires_fulfilment = false maintains current behavior
  - Existing fulfillment_options rows remain valid
  - No breaking changes to Stripe, escrow, or marketplace logic
*/

-- Add requires_fulfilment column to service_listings
ALTER TABLE service_listings
  ADD COLUMN IF NOT EXISTS requires_fulfilment boolean DEFAULT false;

COMMENT ON COLUMN service_listings.requires_fulfilment IS
  'Provider-controlled setting. When enabled, service requires physical fulfillment (pickup, delivery, or shipping). When disabled, service is purely on-location or virtual.';

-- Update fulfillment_type constraint to support all 5 modes
DO $$
BEGIN
  -- Drop existing constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'fulfillment_options'
    AND constraint_name = 'fulfillment_options_fulfillment_type_check'
  ) THEN
    ALTER TABLE fulfillment_options DROP CONSTRAINT fulfillment_options_fulfillment_type_check;
  END IF;

  -- Add updated constraint with all 5 modes
  ALTER TABLE fulfillment_options
    ADD CONSTRAINT fulfillment_options_fulfillment_type_check
    CHECK (fulfillment_type IN (
      'PickupByCustomer',
      'DropOffByProvider',
      'PickupAndDropOffByCustomer',
      'PickupAndDropOffByProvider',
      'Shipping'
    ));
END $$;

-- Update comments for clarity
COMMENT ON COLUMN fulfillment_options.fulfillment_type IS
  'Type of fulfillment:
  - PickupByCustomer: Customer picks up from provider location
  - DropOffByProvider: Provider delivers to customer location
  - PickupAndDropOffByCustomer: Customer handles both pickup and return
  - PickupAndDropOffByProvider: Provider handles both pickup and return
  - Shipping: Third-party carrier delivery';

-- Create index for better filtering on requires_fulfilment
CREATE INDEX IF NOT EXISTS idx_service_listings_requires_fulfilment
  ON service_listings(requires_fulfilment) WHERE requires_fulfilment = true;

-- Add validation helper function to check at least one fulfillment mode is selected
CREATE OR REPLACE FUNCTION validate_fulfillment_modes_present(p_listing_id uuid)
RETURNS boolean AS $$
DECLARE
  v_requires_fulfilment boolean;
  v_mode_count integer;
BEGIN
  -- Get requires_fulfilment setting
  SELECT requires_fulfilment INTO v_requires_fulfilment
  FROM service_listings
  WHERE id = p_listing_id;

  -- If requires_fulfilment is false, no validation needed
  IF v_requires_fulfilment = false OR v_requires_fulfilment IS NULL THEN
    RETURN true;
  END IF;

  -- Count active fulfillment modes
  SELECT COUNT(*) INTO v_mode_count
  FROM fulfillment_options
  WHERE listing_id = p_listing_id
  AND is_active = true;

  -- Must have at least one fulfillment mode when requires_fulfilment is true
  RETURN v_mode_count > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_fulfillment_modes_present IS
  'Validates that when requires_fulfilment is enabled, at least one active fulfillment mode exists. Returns true if valid, false otherwise.';