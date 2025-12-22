/*
  # Update get_applicable_agreement Function with Correct Type Mapping

  ## Summary
  Updates the get_applicable_agreement function to properly map between
  PascalCase fulfillment types (used in fulfillment_options) and snake_case
  agreement types (used in standard_service_agreements).

  ## Mapping
  - PickupByCustomer -> pickup_by_customer
  - DropOffByProvider -> dropoff_by_provider
  - PickupAndDropOffByCustomer -> pickup_dropoff_customer
  - PickupAndDropOffByProvider -> pickup_dropoff_provider
  - Shipping -> shipping
*/

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
    WHERE agreement_type = 'no_fulfillment' AND is_active = true
    ORDER BY version DESC
    LIMIT 1;
    RETURN v_agreement_id;
  END IF;

  SELECT array_agg(fulfillment_type) INTO v_fulfillment_modes
  FROM fulfillment_options
  WHERE listing_id = p_listing_id AND is_active = true;

  -- Priority order: most complex first
  -- Map PascalCase fulfillment types to snake_case agreement types
  IF 'Shipping' = ANY(v_fulfillment_modes) THEN
    v_agreement_type := 'shipping';
  ELSIF 'PickupAndDropOffByProvider' = ANY(v_fulfillment_modes) THEN
    v_agreement_type := 'pickup_dropoff_provider';
  ELSIF 'PickupAndDropOffByCustomer' = ANY(v_fulfillment_modes) THEN
    v_agreement_type := 'pickup_dropoff_customer';
  ELSIF 'DropOffByProvider' = ANY(v_fulfillment_modes) THEN
    v_agreement_type := 'dropoff_by_provider';
  ELSIF 'PickupByCustomer' = ANY(v_fulfillment_modes) THEN
    v_agreement_type := 'pickup_by_customer';
  ELSE
    v_agreement_type := 'no_fulfillment';
  END IF;

  SELECT id INTO v_agreement_id
  FROM standard_service_agreements
  WHERE agreement_type = v_agreement_type AND is_active = true
  ORDER BY version DESC
  LIMIT 1;

  RETURN v_agreement_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_applicable_agreement IS 'Returns the appropriate agreement ID based on listing fulfillment modes. Maps PascalCase fulfillment types to snake_case agreement types.';
