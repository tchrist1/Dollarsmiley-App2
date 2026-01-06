/*
  # Atomic Service Options Update Function

  1. Purpose
    - Wrap DELETE + INSERT operations in a transaction
    - Prevent data loss if INSERT fails after DELETE
    - Maintain destructive overwrite behavior (as designed)

  2. Security
    - Function runs with SECURITY DEFINER (elevated privileges)
    - RLS policies still enforced through function logic
    - Only listing owner can update options

  3. Changes
    - CREATE FUNCTION update_service_options_atomic()
    - Accepts listing_id, options JSON, vas JSON
    - Returns success/error status
*/

-- Create atomic update function for service options and VAS
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

  -- Step 1: Delete all existing options
  DELETE FROM service_options WHERE listing_id = p_listing_id;

  -- Step 2: Delete all existing VAS
  DELETE FROM value_added_services WHERE listing_id = p_listing_id;

  -- Step 3: Insert new options (if provided)
  IF jsonb_array_length(p_options) > 0 THEN
    INSERT INTO service_options (
      listing_id,
      name,
      type,
      choices,
      price_modifier,
      is_required
    )
    SELECT
      p_listing_id,
      (opt->>'name')::text,
      (opt->>'type')::text,
      (opt->'choices')::jsonb,
      COALESCE((opt->>'price_modifier')::numeric, 0),
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
COMMENT ON FUNCTION update_service_options_atomic IS 'Atomically update service options and VAS for a listing. Wraps DELETE+INSERT in transaction to prevent data loss.';
