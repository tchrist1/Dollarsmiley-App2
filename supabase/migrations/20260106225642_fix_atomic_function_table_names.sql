/*
  # Fix Atomic Function Table Names

  1. Issue
    - Function referenced non-existent 'service_options' table
    - Actual table name is 'custom_service_options'
    - This prevented the atomic transaction from working

  2. Changes
    - DROP old function
    - CREATE new function with correct table names
    - custom_service_options (not service_options)
    - value_added_services (correct)
*/

-- Drop old function with wrong table references
DROP FUNCTION IF EXISTS update_service_options_atomic(uuid, jsonb, jsonb);

-- Create corrected function with proper table names
CREATE OR REPLACE FUNCTION update_service_options_atomic(
  p_listing_id uuid,
  p_options jsonb DEFAULT '[]'::jsonb,
  p_vas jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_id uuid;
  v_user_id uuid;
  v_options_inserted integer := 0;
  v_vas_inserted integer := 0;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Must be logged in'
    );
  END IF;

  -- Verify listing exists and get provider_id
  SELECT provider_id INTO v_provider_id
  FROM service_listings
  WHERE id = p_listing_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Listing not found'
    );
  END IF;

  -- Verify user owns this listing
  IF v_provider_id != v_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: You do not own this listing'
    );
  END IF;

  -- ATOMIC TRANSACTION: DELETE existing + INSERT new
  -- If any step fails, entire transaction rolls back

  -- Step 1: Delete all existing custom service options
  DELETE FROM custom_service_options WHERE listing_id = p_listing_id;

  -- Step 2: Delete all existing VAS
  DELETE FROM value_added_services WHERE listing_id = p_listing_id;

  -- Step 3: Insert new custom service options (if provided)
  IF jsonb_array_length(p_options) > 0 THEN
    INSERT INTO custom_service_options (
      listing_id,
      option_name,
      option_type,
      option_values,
      is_required
    )
    SELECT
      p_listing_id,
      (opt->>'name')::text,
      (opt->>'type')::text,
      COALESCE((opt->'choices')::jsonb, '[]'::jsonb),
      COALESCE((opt->>'is_required')::boolean, false)
    FROM jsonb_array_elements(p_options) AS opt
    WHERE (opt->>'name') IS NOT NULL AND trim(opt->>'name') != '';

    GET DIAGNOSTICS v_options_inserted = ROW_COUNT;
  END IF;

  -- Step 4: Insert new VAS (if provided)
  IF jsonb_array_length(p_vas) > 0 THEN
    INSERT INTO value_added_services (
      listing_id,
      name,
      description,
      price,
      is_active
    )
    SELECT
      p_listing_id,
      (vas->>'name')::text,
      COALESCE((vas->>'description')::text, ''),
      (vas->>'price')::numeric,
      COALESCE((vas->>'is_active')::boolean, true)
    FROM jsonb_array_elements(p_vas) AS vas
    WHERE (vas->>'name') IS NOT NULL
      AND trim(vas->>'name') != ''
      AND (vas->>'price')::numeric > 0;

    GET DIAGNOSTICS v_vas_inserted = ROW_COUNT;
  END IF;

  -- Update listing timestamp
  UPDATE service_listings
  SET updated_at = now()
  WHERE id = p_listing_id;

  -- Return success with counts
  RETURN jsonb_build_object(
    'success', true,
    'options_inserted', v_options_inserted,
    'vas_inserted', v_vas_inserted
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Any error rolls back entire transaction
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_service_options_atomic TO authenticated;

-- Add comment
COMMENT ON FUNCTION update_service_options_atomic IS 'Atomically update custom service options and VAS for a listing. Uses correct table names: custom_service_options and value_added_services.';
