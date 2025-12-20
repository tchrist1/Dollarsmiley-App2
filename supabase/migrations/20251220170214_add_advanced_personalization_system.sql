/*
  # Advanced Personalization System for Custom Services
  
  ## Summary
  Adds Etsy-style Advanced Personalization capabilities to Custom Services while preserving
  all existing functionality. This is an additive, optional extension that layers on top
  of the current Custom Options system.
  
  ## Design Principles
  - Additive and backward compatible - existing Custom Services work unchanged
  - Live Preview enabled by default for personalization-enabled listings
  - Existing proofing workflow remains the authoritative approval gate
  - All personalization data frozen at add-to-cart time
  - Complete audit trail for compliance and support
  
  ## New Tables
  
  ### 1. personalization_configs
  Provider-level configuration enabling Advanced Personalization for a listing.
  Links to custom_service_options to extend existing options with personalization.
  
  ### 2. personalization_fonts
  Font library available for text personalization.
  
  ### 3. personalization_color_palettes
  Reusable color palettes for providers.
  
  ### 4. personalization_templates
  Design templates/presets with placement zones and constraints.
  
  ### 5. personalization_placements
  Layout and placement options within templates.
  
  ### 6. personalization_image_presets
  Provider-supplied images customers can choose from.
  
  ### 7. personalization_submissions
  Customer-submitted personalization data for each order.
  
  ### 8. personalization_snapshots
  Immutable snapshot of personalization at cart/order time.
  
  ### 9. personalization_reusable_setups
  Saved personalization setups for repeat orders.
  
  ## Integration Points
  - Extends custom_service_options with personalization capabilities
  - Integrates with cart_items for snapshot creation
  - Links to production_orders and proofs for workflow integration
  - Preserves all existing pricing, escrow, and refund logic
*/

-- ============================================================================
-- PART 1: FONT LIBRARY
-- ============================================================================

CREATE TABLE IF NOT EXISTS personalization_fonts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  family text NOT NULL,
  category text DEFAULT 'sans-serif' CHECK (category IN ('serif', 'sans-serif', 'display', 'handwriting', 'monospace')),
  preview_url text,
  font_file_url text,
  is_system_font boolean DEFAULT true,
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personalization_fonts_active ON personalization_fonts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_personalization_fonts_provider ON personalization_fonts(provider_id) WHERE provider_id IS NOT NULL;

ALTER TABLE personalization_fonts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active system fonts"
  ON personalization_fonts FOR SELECT
  USING (is_system_font = true AND is_active = true);

CREATE POLICY "Providers can view their custom fonts"
  ON personalization_fonts FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can manage their fonts"
  ON personalization_fonts FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Seed common system fonts
INSERT INTO personalization_fonts (name, family, category, is_system_font, sort_order) VALUES
  ('Arial', 'Arial, sans-serif', 'sans-serif', true, 1),
  ('Helvetica', 'Helvetica, sans-serif', 'sans-serif', true, 2),
  ('Times New Roman', '"Times New Roman", serif', 'serif', true, 3),
  ('Georgia', 'Georgia, serif', 'serif', true, 4),
  ('Courier New', '"Courier New", monospace', 'monospace', true, 5),
  ('Verdana', 'Verdana, sans-serif', 'sans-serif', true, 6),
  ('Impact', 'Impact, sans-serif', 'display', true, 7),
  ('Comic Sans MS', '"Comic Sans MS", cursive', 'handwriting', true, 8),
  ('Trebuchet MS', '"Trebuchet MS", sans-serif', 'sans-serif', true, 9),
  ('Palatino', 'Palatino, serif', 'serif', true, 10)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 2: COLOR PALETTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS personalization_color_palettes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN personalization_color_palettes.colors IS 'Array of {hex, name, category} objects';

CREATE INDEX IF NOT EXISTS idx_color_palettes_provider ON personalization_color_palettes(provider_id);

ALTER TABLE personalization_color_palettes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage their color palettes"
  ON personalization_color_palettes FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- ============================================================================
-- PART 3: PERSONALIZATION CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS personalization_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES service_listings(id) ON DELETE CASCADE NOT NULL,
  custom_option_id uuid REFERENCES custom_service_options(id) ON DELETE CASCADE,
  
  is_enabled boolean DEFAULT true,
  is_required boolean DEFAULT false,
  
  personalization_type text NOT NULL CHECK (personalization_type IN (
    'text',
    'image_upload',
    'image_selection',
    'font_selection',
    'color_selection',
    'placement_selection',
    'template_selection',
    'combined'
  )),
  
  config_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  text_config jsonb DEFAULT '{
    "enabled": false,
    "max_length": 50,
    "min_length": 0,
    "allowed_characters": "alphanumeric",
    "multiline": false,
    "max_lines": 1,
    "placeholder": "Enter your text",
    "validation_regex": null
  }'::jsonb,
  
  image_upload_config jsonb DEFAULT '{
    "enabled": false,
    "max_file_size_mb": 10,
    "allowed_formats": ["jpg", "jpeg", "png", "svg"],
    "min_resolution": {"width": 300, "height": 300},
    "max_uploads": 1,
    "require_high_res": false
  }'::jsonb,
  
  font_config jsonb DEFAULT '{
    "enabled": false,
    "allowed_font_ids": [],
    "allow_all_system_fonts": true,
    "default_font_id": null,
    "allow_size_selection": true,
    "min_size": 12,
    "max_size": 72,
    "default_size": 24
  }'::jsonb,
  
  color_config jsonb DEFAULT '{
    "enabled": false,
    "palette_id": null,
    "allow_custom_colors": false,
    "default_color": "#000000"
  }'::jsonb,
  
  live_preview_mode text DEFAULT 'enabled' CHECK (live_preview_mode IN (
    'enabled',
    'constrained',
    'downgraded',
    'disabled'
  )),
  
  price_impact jsonb DEFAULT '{
    "type": "none",
    "fixed_amount": 0,
    "percentage": 0,
    "per_character": 0,
    "per_image": 0
  }'::jsonb,
  
  lock_after_stage text DEFAULT 'order_received' CHECK (lock_after_stage IN (
    'add_to_cart',
    'checkout',
    'order_received',
    'proof_approved'
  )),
  
  display_order integer DEFAULT 0,
  help_text text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN personalization_configs.custom_option_id IS 'Optional link to extend an existing custom_service_option with personalization';
COMMENT ON COLUMN personalization_configs.live_preview_mode IS 'enabled=full preview, constrained=provider limits, downgraded=simplified, disabled=no preview';
COMMENT ON COLUMN personalization_configs.lock_after_stage IS 'When personalization becomes immutable';

CREATE INDEX IF NOT EXISTS idx_personalization_configs_listing ON personalization_configs(listing_id);
CREATE INDEX IF NOT EXISTS idx_personalization_configs_option ON personalization_configs(custom_option_id) WHERE custom_option_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_personalization_configs_enabled ON personalization_configs(listing_id, is_enabled) WHERE is_enabled = true;

ALTER TABLE personalization_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view personalization configs for active listings"
  ON personalization_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.id = personalization_configs.listing_id
      AND sl.is_active = true
    )
  );

CREATE POLICY "Providers can manage their listing personalization"
  ON personalization_configs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.id = personalization_configs.listing_id
      AND sl.provider_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.id = personalization_configs.listing_id
      AND sl.provider_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 4: DESIGN TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS personalization_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES service_listings(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  name text NOT NULL,
  description text,
  thumbnail_url text,
  preview_image_url text,
  
  canvas_config jsonb NOT NULL DEFAULT '{
    "width": 1000,
    "height": 1000,
    "background_color": "#ffffff",
    "background_image_url": null
  }'::jsonb,
  
  placement_zones jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  constraints jsonb DEFAULT '{
    "allow_zone_resize": false,
    "allow_zone_move": false,
    "enforce_safe_area": true,
    "safe_area_margin": 50
  }'::jsonb,
  
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN personalization_templates.placement_zones IS 'Array of {id, type, x, y, width, height, constraints} defining editable areas';

CREATE INDEX IF NOT EXISTS idx_personalization_templates_listing ON personalization_templates(listing_id);
CREATE INDEX IF NOT EXISTS idx_personalization_templates_provider ON personalization_templates(provider_id);

ALTER TABLE personalization_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates for active listings"
  ON personalization_templates FOR SELECT
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.id = personalization_templates.listing_id
      AND sl.is_active = true
    )
  );

CREATE POLICY "Providers can manage their templates"
  ON personalization_templates FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- ============================================================================
-- PART 5: IMAGE PRESETS (Provider-supplied images)
-- ============================================================================

CREATE TABLE IF NOT EXISTS personalization_image_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES service_listings(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  config_id uuid REFERENCES personalization_configs(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  description text,
  image_url text NOT NULL,
  thumbnail_url text,
  
  category text,
  tags text[] DEFAULT ARRAY[]::text[],
  
  price_modifier numeric DEFAULT 0 CHECK (price_modifier >= 0),
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_image_presets_listing ON personalization_image_presets(listing_id);
CREATE INDEX IF NOT EXISTS idx_image_presets_config ON personalization_image_presets(config_id) WHERE config_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_image_presets_category ON personalization_image_presets(listing_id, category);

ALTER TABLE personalization_image_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active image presets"
  ON personalization_image_presets FOR SELECT
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.id = personalization_image_presets.listing_id
      AND sl.is_active = true
    )
  );

CREATE POLICY "Providers can manage their image presets"
  ON personalization_image_presets FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- ============================================================================
-- PART 6: PERSONALIZATION SUBMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS personalization_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES service_listings(id) ON DELETE CASCADE NOT NULL,
  config_id uuid REFERENCES personalization_configs(id) ON DELETE SET NULL,
  
  cart_item_id uuid REFERENCES cart_items(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  production_order_id uuid REFERENCES production_orders(id) ON DELETE SET NULL,
  
  submission_type text NOT NULL CHECK (submission_type IN (
    'text',
    'image_upload',
    'image_selection',
    'font_selection',
    'color_selection',
    'placement_selection',
    'template_selection'
  )),
  
  text_value text,
  
  image_data jsonb DEFAULT '{}'::jsonb,
  
  font_data jsonb DEFAULT '{}'::jsonb,
  
  color_data jsonb DEFAULT '{}'::jsonb,
  
  placement_data jsonb DEFAULT '{}'::jsonb,
  
  template_data jsonb DEFAULT '{}'::jsonb,
  
  preview_render_url text,
  
  calculated_price_impact numeric DEFAULT 0,
  
  validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'needs_review')),
  validation_errors jsonb DEFAULT '[]'::jsonb,
  
  is_locked boolean DEFAULT false,
  locked_at timestamptz,
  locked_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN personalization_submissions.image_data IS '{uploaded_url, preset_id, original_filename, file_size, dimensions}';
COMMENT ON COLUMN personalization_submissions.font_data IS '{font_id, font_family, font_size, font_weight, font_style}';
COMMENT ON COLUMN personalization_submissions.color_data IS '{hex, rgba, palette_color_id}';
COMMENT ON COLUMN personalization_submissions.placement_data IS '{zone_id, x, y, width, height, rotation, scale}';
COMMENT ON COLUMN personalization_submissions.template_data IS '{template_id, customizations}';

CREATE INDEX IF NOT EXISTS idx_personalization_submissions_customer ON personalization_submissions(customer_id);
CREATE INDEX IF NOT EXISTS idx_personalization_submissions_listing ON personalization_submissions(listing_id);
CREATE INDEX IF NOT EXISTS idx_personalization_submissions_cart ON personalization_submissions(cart_item_id) WHERE cart_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_personalization_submissions_booking ON personalization_submissions(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_personalization_submissions_order ON personalization_submissions(production_order_id) WHERE production_order_id IS NOT NULL;

ALTER TABLE personalization_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own submissions"
  ON personalization_submissions FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Providers can view submissions for their listings"
  ON personalization_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.id = personalization_submissions.listing_id
      AND sl.provider_id = auth.uid()
    )
  );

CREATE POLICY "Customers can create submissions"
  ON personalization_submissions FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update unlocked submissions"
  ON personalization_submissions FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() AND is_locked = false)
  WITH CHECK (customer_id = auth.uid());

-- ============================================================================
-- PART 7: PERSONALIZATION SNAPSHOTS (Immutable at order time)
-- ============================================================================

CREATE TABLE IF NOT EXISTS personalization_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  cart_item_id uuid REFERENCES cart_items(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  production_order_id uuid REFERENCES production_orders(id) ON DELETE SET NULL,
  
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES service_listings(id) ON DELETE SET NULL NOT NULL,
  provider_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  
  snapshot_data jsonb NOT NULL,
  
  config_snapshot jsonb NOT NULL,
  
  uploaded_images jsonb DEFAULT '[]'::jsonb,
  
  preview_renders jsonb DEFAULT '[]'::jsonb,
  
  total_price_impact numeric DEFAULT 0,
  
  snapshot_version integer DEFAULT 1,
  
  created_at timestamptz DEFAULT now(),
  finalized_at timestamptz,
  
  CONSTRAINT snapshot_has_reference CHECK (
    cart_item_id IS NOT NULL OR booking_id IS NOT NULL OR production_order_id IS NOT NULL
  )
);

COMMENT ON COLUMN personalization_snapshots.snapshot_data IS 'Complete frozen copy of all personalization submissions';
COMMENT ON COLUMN personalization_snapshots.config_snapshot IS 'Frozen copy of provider config at snapshot time';
COMMENT ON COLUMN personalization_snapshots.uploaded_images IS 'Array of {url, permanent_url, hash} for uploaded images';
COMMENT ON COLUMN personalization_snapshots.preview_renders IS 'Array of {render_url, created_at} for preview images';

CREATE INDEX IF NOT EXISTS idx_personalization_snapshots_cart ON personalization_snapshots(cart_item_id) WHERE cart_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_personalization_snapshots_booking ON personalization_snapshots(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_personalization_snapshots_order ON personalization_snapshots(production_order_id) WHERE production_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_personalization_snapshots_customer ON personalization_snapshots(customer_id);

ALTER TABLE personalization_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their snapshots"
  ON personalization_snapshots FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Providers can view snapshots for their orders"
  ON personalization_snapshots FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "System can create snapshots"
  ON personalization_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

-- ============================================================================
-- PART 8: REUSABLE PERSONALIZATION SETUPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS personalization_reusable_setups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES service_listings(id) ON DELETE SET NULL,
  
  name text NOT NULL,
  description text,
  
  setup_data jsonb NOT NULL,
  
  source_snapshot_id uuid REFERENCES personalization_snapshots(id) ON DELETE SET NULL,
  source_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  
  use_count integer DEFAULT 0,
  last_used_at timestamptz,
  
  is_favorite boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reusable_setups_customer ON personalization_reusable_setups(customer_id);
CREATE INDEX IF NOT EXISTS idx_reusable_setups_listing ON personalization_reusable_setups(listing_id) WHERE listing_id IS NOT NULL;

ALTER TABLE personalization_reusable_setups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can manage their reusable setups"
  ON personalization_reusable_setups FOR ALL
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- ============================================================================
-- PART 9: EXTEND CART_ITEMS FOR PERSONALIZATION
-- ============================================================================

ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS personalization_snapshot_id uuid REFERENCES personalization_snapshots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS has_personalization boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_cart_items_personalization ON cart_items(personalization_snapshot_id) WHERE personalization_snapshot_id IS NOT NULL;

-- ============================================================================
-- PART 10: EXTEND ORDER_ITEMS FOR PERSONALIZATION
-- ============================================================================

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS personalization_snapshot_id uuid REFERENCES personalization_snapshots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS personalization_price_impact numeric DEFAULT 0;

-- ============================================================================
-- PART 11: EXTEND PRODUCTION_ORDERS FOR PERSONALIZATION
-- ============================================================================

ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS has_advanced_personalization boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS personalization_snapshot_id uuid REFERENCES personalization_snapshots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS personalization_locked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_production_orders_personalization ON production_orders(personalization_snapshot_id) WHERE personalization_snapshot_id IS NOT NULL;

-- ============================================================================
-- PART 12: HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_listing_personalization_config(p_listing_id uuid)
RETURNS TABLE (
  config_id uuid,
  personalization_type text,
  is_required boolean,
  live_preview_mode text,
  text_config jsonb,
  image_upload_config jsonb,
  font_config jsonb,
  color_config jsonb,
  price_impact jsonb,
  help_text text,
  display_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    pc.id as config_id,
    pc.personalization_type,
    pc.is_required,
    pc.live_preview_mode,
    pc.text_config,
    pc.image_upload_config,
    pc.font_config,
    pc.color_config,
    pc.price_impact,
    pc.help_text,
    pc.display_order
  FROM personalization_configs pc
  WHERE pc.listing_id = p_listing_id
    AND pc.is_enabled = true
  ORDER BY pc.display_order ASC;
$$;

CREATE OR REPLACE FUNCTION create_personalization_snapshot(
  p_cart_item_id uuid,
  p_customer_id uuid,
  p_listing_id uuid,
  p_provider_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_id uuid;
  v_snapshot_data jsonb;
  v_config_snapshot jsonb;
  v_uploaded_images jsonb;
  v_total_price_impact numeric := 0;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'submission_id', ps.id,
      'config_id', ps.config_id,
      'submission_type', ps.submission_type,
      'text_value', ps.text_value,
      'image_data', ps.image_data,
      'font_data', ps.font_data,
      'color_data', ps.color_data,
      'placement_data', ps.placement_data,
      'template_data', ps.template_data,
      'preview_render_url', ps.preview_render_url,
      'calculated_price_impact', ps.calculated_price_impact
    )
  ),
  COALESCE(SUM(ps.calculated_price_impact), 0)
  INTO v_snapshot_data, v_total_price_impact
  FROM personalization_submissions ps
  WHERE ps.cart_item_id = p_cart_item_id
    AND ps.customer_id = p_customer_id;

  SELECT jsonb_agg(
    jsonb_build_object(
      'config_id', pc.id,
      'personalization_type', pc.personalization_type,
      'is_required', pc.is_required,
      'text_config', pc.text_config,
      'image_upload_config', pc.image_upload_config,
      'font_config', pc.font_config,
      'color_config', pc.color_config,
      'price_impact', pc.price_impact,
      'lock_after_stage', pc.lock_after_stage
    )
  )
  INTO v_config_snapshot
  FROM personalization_configs pc
  WHERE pc.listing_id = p_listing_id AND pc.is_enabled = true;

  SELECT jsonb_agg(ps.image_data)
  INTO v_uploaded_images
  FROM personalization_submissions ps
  WHERE ps.cart_item_id = p_cart_item_id
    AND ps.customer_id = p_customer_id
    AND ps.submission_type = 'image_upload'
    AND ps.image_data IS NOT NULL;

  INSERT INTO personalization_snapshots (
    cart_item_id,
    customer_id,
    listing_id,
    provider_id,
    snapshot_data,
    config_snapshot,
    uploaded_images,
    total_price_impact,
    created_at
  ) VALUES (
    p_cart_item_id,
    p_customer_id,
    p_listing_id,
    p_provider_id,
    COALESCE(v_snapshot_data, '[]'::jsonb),
    COALESCE(v_config_snapshot, '[]'::jsonb),
    COALESCE(v_uploaded_images, '[]'::jsonb),
    v_total_price_impact,
    now()
  )
  RETURNING id INTO v_snapshot_id;

  UPDATE personalization_submissions
  SET is_locked = true,
      locked_at = now(),
      locked_reason = 'snapshot_created'
  WHERE cart_item_id = p_cart_item_id
    AND customer_id = p_customer_id;

  UPDATE cart_items
  SET personalization_snapshot_id = v_snapshot_id,
      has_personalization = true
  WHERE id = p_cart_item_id;

  RETURN v_snapshot_id;
END;
$$;

CREATE OR REPLACE FUNCTION transfer_personalization_to_order(
  p_cart_item_id uuid,
  p_booking_id uuid,
  p_production_order_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_id uuid;
BEGIN
  SELECT personalization_snapshot_id INTO v_snapshot_id
  FROM cart_items
  WHERE id = p_cart_item_id;

  IF v_snapshot_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE personalization_snapshots
  SET booking_id = p_booking_id,
      production_order_id = p_production_order_id,
      finalized_at = now()
  WHERE id = v_snapshot_id;

  UPDATE personalization_submissions
  SET booking_id = p_booking_id,
      production_order_id = p_production_order_id
  WHERE cart_item_id = p_cart_item_id;

  IF p_production_order_id IS NOT NULL THEN
    UPDATE production_orders
    SET has_advanced_personalization = true,
        personalization_snapshot_id = v_snapshot_id
    WHERE id = p_production_order_id;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION lock_personalization_for_order(
  p_production_order_id uuid,
  p_lock_reason text DEFAULT 'order_received'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE personalization_submissions
  SET is_locked = true,
      locked_at = now(),
      locked_reason = p_lock_reason
  WHERE production_order_id = p_production_order_id
    AND is_locked = false;

  UPDATE production_orders
  SET personalization_locked_at = now()
  WHERE id = p_production_order_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_personalization_price_impact(
  p_config_id uuid,
  p_text_value text DEFAULT NULL,
  p_image_count integer DEFAULT 0
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_config personalization_configs%ROWTYPE;
  v_price_impact numeric := 0;
  v_impact_type text;
  v_fixed_amount numeric;
  v_percentage numeric;
  v_per_character numeric;
  v_per_image numeric;
BEGIN
  SELECT * INTO v_config FROM personalization_configs WHERE id = p_config_id;
  
  IF v_config.id IS NULL THEN
    RETURN 0;
  END IF;

  v_impact_type := v_config.price_impact->>'type';
  v_fixed_amount := COALESCE((v_config.price_impact->>'fixed_amount')::numeric, 0);
  v_percentage := COALESCE((v_config.price_impact->>'percentage')::numeric, 0);
  v_per_character := COALESCE((v_config.price_impact->>'per_character')::numeric, 0);
  v_per_image := COALESCE((v_config.price_impact->>'per_image')::numeric, 0);

  IF v_impact_type = 'fixed' THEN
    v_price_impact := v_fixed_amount;
  ELSIF v_impact_type = 'per_character' AND p_text_value IS NOT NULL THEN
    v_price_impact := LENGTH(p_text_value) * v_per_character;
  ELSIF v_impact_type = 'per_image' THEN
    v_price_impact := p_image_count * v_per_image;
  END IF;

  RETURN v_price_impact;
END;
$$;

CREATE OR REPLACE FUNCTION get_personalization_for_proof(p_production_order_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'snapshot', ps.snapshot_data,
    'config', ps.config_snapshot,
    'uploaded_images', ps.uploaded_images,
    'preview_renders', ps.preview_renders,
    'total_price_impact', ps.total_price_impact,
    'created_at', ps.created_at,
    'finalized_at', ps.finalized_at
  )
  FROM personalization_snapshots ps
  WHERE ps.production_order_id = p_production_order_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION save_reusable_personalization_setup(
  p_customer_id uuid,
  p_listing_id uuid,
  p_name text,
  p_source_snapshot_id uuid DEFAULT NULL,
  p_source_booking_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_setup_id uuid;
  v_setup_data jsonb;
BEGIN
  IF p_source_snapshot_id IS NOT NULL THEN
    SELECT snapshot_data INTO v_setup_data
    FROM personalization_snapshots
    WHERE id = p_source_snapshot_id AND customer_id = p_customer_id;
  ELSIF p_source_booking_id IS NOT NULL THEN
    SELECT ps.snapshot_data INTO v_setup_data
    FROM personalization_snapshots ps
    WHERE ps.booking_id = p_source_booking_id AND ps.customer_id = p_customer_id
    LIMIT 1;
  ELSE
    RAISE EXCEPTION 'Must provide either source_snapshot_id or source_booking_id';
  END IF;

  IF v_setup_data IS NULL THEN
    RAISE EXCEPTION 'Source personalization not found';
  END IF;

  INSERT INTO personalization_reusable_setups (
    customer_id,
    listing_id,
    name,
    setup_data,
    source_snapshot_id,
    source_booking_id
  ) VALUES (
    p_customer_id,
    p_listing_id,
    p_name,
    v_setup_data,
    p_source_snapshot_id,
    p_source_booking_id
  )
  RETURNING id INTO v_setup_id;

  RETURN v_setup_id;
END;
$$;

-- ============================================================================
-- PART 13: TRIGGER TO AUTO-LOCK PERSONALIZATION
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_lock_personalization_on_order_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'order_received' AND OLD.status != 'order_received' THEN
    IF NEW.has_advanced_personalization = true THEN
      PERFORM lock_personalization_for_order(NEW.id, 'order_received');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_lock_personalization ON production_orders;

CREATE TRIGGER trigger_auto_lock_personalization
  AFTER UPDATE OF status ON production_orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_lock_personalization_on_order_received();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Advanced Personalization System installed successfully';
  RAISE NOTICE '  - Font library with system fonts';
  RAISE NOTICE '  - Color palettes for providers';
  RAISE NOTICE '  - Personalization configuration per listing';
  RAISE NOTICE '  - Design templates with placement zones';
  RAISE NOTICE '  - Image presets for provider-supplied options';
  RAISE NOTICE '  - Customer submission tracking';
  RAISE NOTICE '  - Immutable snapshots at cart time';
  RAISE NOTICE '  - Reusable setup storage';
  RAISE NOTICE '  - Integration with cart, orders, and proofing';
END $$;
