/*
  # Custom Products Pipeline System

  1. New Tables
    - `product_types` - Types of custom products (DTF, engraving, vinyl, etc.)
    - `production_orders` - Custom product orders
    - `design_files` - Uploaded design files
    - `proofs` - Design proofs for approval
    - `proof_versions` - Version history of proofs
    - `proof_comments` - Feedback on proofs
    - `production_materials` - Materials needed
    - `production_timeline_events` - Timeline tracking
    - `consultation_sessions` - Video consultation records

  2. Changes
    - Add custom_product_type to service_listings
    - Add supports_custom_products to profiles

  3. Security
    - Enable RLS on all new tables
    - Customer and provider access policies

  4. Functions
    - Progress tracking
    - Status transitions
    - Deadline calculations
*/

-- Product Types table (catalog of custom product types)
CREATE TABLE IF NOT EXISTS product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  category text NOT NULL, -- dtf_transfer, laser_engraving, vinyl_cutting, embroidery, etc.
  typical_turnaround_days integer,
  requires_consultation boolean DEFAULT true,
  requires_proof_approval boolean DEFAULT true,
  max_revisions integer DEFAULT 3,
  metadata jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add custom product support to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS supports_custom_products boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_product_types text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS max_concurrent_orders integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS custom_product_settings jsonb DEFAULT '{}';

-- Add custom product type to service listings
ALTER TABLE service_listings
ADD COLUMN IF NOT EXISTS is_custom_product boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS product_type_id uuid REFERENCES product_types(id),
ADD COLUMN IF NOT EXISTS requires_consultation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS typical_turnaround_days integer,
ADD COLUMN IF NOT EXISTS max_revisions_included integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS revision_fee_per_additional numeric(10, 2);

-- Production Orders table
CREATE TABLE IF NOT EXISTS production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES service_listings(id) ON DELETE SET NULL,
  product_type_id uuid REFERENCES product_types(id) NOT NULL,

  -- Order details
  title text NOT NULL,
  description text NOT NULL,
  quantity integer DEFAULT 1,
  specifications jsonb NOT NULL, -- size, material, colors, etc.
  special_instructions text,

  -- Status tracking
  status text NOT NULL DEFAULT 'consultation_pending',
  -- Statuses: consultation_pending, consultation_scheduled, consultation_completed,
  --           design_in_progress, proof_submitted, proof_approved, proof_rejected,
  --           in_production, quality_check, completed, cancelled

  -- Dates and deadlines
  consultation_scheduled_at timestamptz,
  consultation_completed_at timestamptz,
  design_started_at timestamptz,
  first_proof_submitted_at timestamptz,
  approved_at timestamptz,
  production_started_at timestamptz,
  estimated_completion_date timestamptz,
  actual_completion_date timestamptz,
  deadline_date timestamptz,

  -- Revisions
  revision_count integer DEFAULT 0,
  max_revisions_allowed integer DEFAULT 2,
  additional_revisions_charged integer DEFAULT 0,

  -- Costs
  base_price numeric(10, 2) NOT NULL,
  revision_fees numeric(10, 2) DEFAULT 0,
  rush_fee numeric(10, 2) DEFAULT 0,
  total_price numeric(10, 2) NOT NULL,

  -- Delivery
  delivery_method text, -- pickup, shipping, provider_delivery
  delivery_address jsonb,
  tracking_info jsonb,

  -- Flags
  is_rush_order boolean DEFAULT false,
  requires_approval boolean DEFAULT true,
  customer_approved boolean DEFAULT false,
  provider_accepted boolean DEFAULT false,

  -- Notes and metadata
  provider_notes text,
  internal_notes text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Design Files table
CREATE TABLE IF NOT EXISTS design_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid REFERENCES production_orders(id) ON DELETE CASCADE NOT NULL,
  uploaded_by uuid REFERENCES profiles(id) NOT NULL,
  file_type text NOT NULL, -- customer_reference, design_template, final_design, production_file

  -- File info
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size_bytes bigint,
  mime_type text,

  -- File metadata
  width integer,
  height integer,
  resolution_dpi integer,
  color_mode text, -- CMYK, RGB, Grayscale
  file_format text, -- AI, PSD, PDF, SVG, PNG, etc.

  -- Status
  is_editable boolean DEFAULT false,
  is_print_ready boolean DEFAULT false,

  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Proofs table (design proofs for approval)
CREATE TABLE IF NOT EXISTS proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid REFERENCES production_orders(id) ON DELETE CASCADE NOT NULL,
  version_number integer NOT NULL,

  -- Proof details
  title text NOT NULL,
  description text,
  proof_images text[] NOT NULL, -- Array of image URLs
  design_file_ids uuid[], -- References to design_files

  -- Status
  status text NOT NULL DEFAULT 'pending_review',
  -- Statuses: pending_review, approved, rejected, revision_requested

  -- Provider info
  provider_notes text,
  estimated_production_time text, -- "3-5 business days"

  -- Customer feedback
  customer_feedback text,
  customer_rating integer, -- 1-5 rating of proof quality
  change_requests jsonb, -- Structured change requests

  -- Timestamps
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,

  -- Flags
  is_final boolean DEFAULT false,
  requires_customer_action boolean DEFAULT true,

  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Proof versions (history)
CREATE TABLE IF NOT EXISTS proof_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id uuid REFERENCES proofs(id) ON DELETE CASCADE NOT NULL,
  production_order_id uuid REFERENCES production_orders(id) ON DELETE CASCADE NOT NULL,
  version_number integer NOT NULL,

  -- Version details
  changes_made text NOT NULL,
  proof_images text[] NOT NULL,
  design_file_ids uuid[],

  -- Who made changes
  modified_by uuid REFERENCES profiles(id) NOT NULL,
  modification_reason text,

  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- Proof comments (feedback thread)
CREATE TABLE IF NOT EXISTS proof_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id uuid REFERENCES proofs(id) ON DELETE CASCADE NOT NULL,
  production_order_id uuid REFERENCES production_orders(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  comment_text text NOT NULL,
  comment_type text DEFAULT 'general', -- general, change_request, approval, question

  -- Specific feedback
  reference_image_url text, -- Point to specific area
  reference_coordinates jsonb, -- x, y coordinates for annotation

  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),

  created_at timestamptz DEFAULT now()
);

-- Production Materials table
CREATE TABLE IF NOT EXISTS production_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid REFERENCES production_orders(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES profiles(id) NOT NULL,

  -- Material details
  material_name text NOT NULL,
  material_type text, -- vinyl, ink, thread, substrate, etc.
  quantity numeric(10, 2) NOT NULL,
  unit text NOT NULL, -- yards, sheets, oz, etc.

  -- Inventory tracking
  in_stock boolean DEFAULT true,
  needs_ordering boolean DEFAULT false,
  estimated_arrival_date timestamptz,

  -- Cost
  cost_per_unit numeric(10, 2),
  total_cost numeric(10, 2),

  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Production Timeline Events table
CREATE TABLE IF NOT EXISTS production_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid REFERENCES production_orders(id) ON DELETE CASCADE NOT NULL,

  -- Event details
  event_type text NOT NULL,
  -- Types: order_created, consultation_scheduled, consultation_completed,
  --        design_started, proof_submitted, proof_approved, proof_rejected,
  --        revision_requested, production_started, quality_check_passed,
  --        quality_check_failed, ready_for_pickup, shipped, delivered, completed

  event_title text NOT NULL,
  event_description text,

  -- Who triggered event
  triggered_by uuid REFERENCES profiles(id),

  -- Event metadata
  previous_status text,
  new_status text,
  metadata jsonb DEFAULT '{}',

  -- Timestamps
  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Consultation Sessions table
CREATE TABLE IF NOT EXISTS consultation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid REFERENCES production_orders(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Session details
  session_type text DEFAULT 'video', -- video, phone, in_person, chat
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 30,

  -- Status
  status text DEFAULT 'scheduled',
  -- Statuses: scheduled, in_progress, completed, cancelled, no_show

  -- Session info
  meeting_url text, -- Video call link
  meeting_id text,
  meeting_password text,

  -- Notes and outcomes
  provider_notes text,
  customer_notes text,
  consultation_summary text,
  key_decisions jsonb, -- Structured decisions made

  -- Timestamps
  started_at timestamptz,
  ended_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,

  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_production_orders_customer ON production_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_provider ON production_orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_orders_created ON production_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_orders_completion ON production_orders(estimated_completion_date);

CREATE INDEX IF NOT EXISTS idx_design_files_order ON design_files(production_order_id);
CREATE INDEX IF NOT EXISTS idx_design_files_uploaded_by ON design_files(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_proofs_order ON proofs(production_order_id);
CREATE INDEX IF NOT EXISTS idx_proofs_status ON proofs(status);
CREATE INDEX IF NOT EXISTS idx_proofs_version ON proofs(production_order_id, version_number);

CREATE INDEX IF NOT EXISTS idx_proof_versions_proof ON proof_versions(proof_id);
CREATE INDEX IF NOT EXISTS idx_proof_comments_proof ON proof_comments(proof_id);

CREATE INDEX IF NOT EXISTS idx_production_materials_order ON production_materials(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_timeline_order ON production_timeline_events(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_timeline_occurred ON production_timeline_events(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultation_sessions_order ON consultation_sessions(production_order_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_scheduled ON consultation_sessions(scheduled_at);

-- Enable RLS
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_types
CREATE POLICY "Anyone can view active product types"
  ON product_types FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- RLS Policies for production_orders
CREATE POLICY "Customers can view own orders"
  ON production_orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Providers can view their orders"
  ON production_orders FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Customers can create orders"
  ON production_orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update own orders"
  ON production_orders FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Providers can update their orders"
  ON production_orders FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- RLS Policies for design_files
CREATE POLICY "Order participants can view design files"
  ON design_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM production_orders po
      WHERE po.id = design_files.production_order_id
      AND (po.customer_id = auth.uid() OR po.provider_id = auth.uid())
    )
  );

CREATE POLICY "Order participants can upload design files"
  ON design_files FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM production_orders po
      WHERE po.id = design_files.production_order_id
      AND (po.customer_id = auth.uid() OR po.provider_id = auth.uid())
    )
  );

-- RLS Policies for proofs
CREATE POLICY "Order participants can view proofs"
  ON proofs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM production_orders po
      WHERE po.id = proofs.production_order_id
      AND (po.customer_id = auth.uid() OR po.provider_id = auth.uid())
    )
  );

CREATE POLICY "Providers can create proofs"
  ON proofs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM production_orders po
      WHERE po.id = proofs.production_order_id
      AND po.provider_id = auth.uid()
    )
  );

CREATE POLICY "Order participants can update proofs"
  ON proofs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM production_orders po
      WHERE po.id = proofs.production_order_id
      AND (po.customer_id = auth.uid() OR po.provider_id = auth.uid())
    )
  );

-- RLS Policies for proof_comments
CREATE POLICY "Order participants can view proof comments"
  ON proof_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM production_orders po
      WHERE po.id = proof_comments.production_order_id
      AND (po.customer_id = auth.uid() OR po.provider_id = auth.uid())
    )
  );

CREATE POLICY "Order participants can create proof comments"
  ON proof_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM production_orders po
      WHERE po.id = proof_comments.production_order_id
      AND (po.customer_id = auth.uid() OR po.provider_id = auth.uid())
    )
  );

-- RLS Policies for production_timeline_events
CREATE POLICY "Order participants can view timeline events"
  ON production_timeline_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM production_orders po
      WHERE po.id = production_timeline_events.production_order_id
      AND (po.customer_id = auth.uid() OR po.provider_id = auth.uid())
    )
  );

-- RLS Policies for consultation_sessions
CREATE POLICY "Session participants can view consultations"
  ON consultation_sessions FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR provider_id = auth.uid());

CREATE POLICY "Session participants can update consultations"
  ON consultation_sessions FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR provider_id = auth.uid())
  WITH CHECK (customer_id = auth.uid() OR provider_id = auth.uid());

-- Function: Generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  new_number text;
  prefix text := 'PO';
  year text := to_char(now(), 'YY');
  sequence_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 6) AS integer)), 0) + 1
  INTO sequence_num
  FROM production_orders
  WHERE order_number LIKE prefix || year || '%';

  new_number := prefix || year || LPAD(sequence_num::text, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function: Update production order status
CREATE OR REPLACE FUNCTION update_production_order_status(
  order_id uuid,
  new_status text,
  triggered_by_user uuid DEFAULT NULL,
  event_description text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  old_status text;
  order_title text;
BEGIN
  -- Get current status
  SELECT status, title INTO old_status, order_title
  FROM production_orders
  WHERE id = order_id;

  -- Update order status
  UPDATE production_orders
  SET
    status = new_status,
    updated_at = now()
  WHERE id = order_id;

  -- Create timeline event
  INSERT INTO production_timeline_events (
    production_order_id,
    event_type,
    event_title,
    event_description,
    previous_status,
    new_status,
    triggered_by,
    occurred_at
  ) VALUES (
    order_id,
    'status_changed',
    'Order status updated to ' || new_status,
    event_description,
    old_status,
    new_status,
    triggered_by_user,
    now()
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate order progress percentage
CREATE OR REPLACE FUNCTION calculate_order_progress(order_id uuid)
RETURNS integer AS $$
DECLARE
  current_status text;
  progress integer;
BEGIN
  SELECT status INTO current_status
  FROM production_orders
  WHERE id = order_id;

  progress := CASE current_status
    WHEN 'consultation_pending' THEN 5
    WHEN 'consultation_scheduled' THEN 10
    WHEN 'consultation_completed' THEN 20
    WHEN 'design_in_progress' THEN 30
    WHEN 'proof_submitted' THEN 50
    WHEN 'proof_approved' THEN 65
    WHEN 'in_production' THEN 80
    WHEN 'quality_check' THEN 90
    WHEN 'completed' THEN 100
    WHEN 'cancelled' THEN 0
    ELSE 0
  END;

  RETURN progress;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if order is overdue
CREATE OR REPLACE FUNCTION is_order_overdue(order_id uuid)
RETURNS boolean AS $$
DECLARE
  deadline timestamptz;
  current_status text;
BEGIN
  SELECT deadline_date, status INTO deadline, current_status
  FROM production_orders
  WHERE id = order_id;

  IF deadline IS NULL OR current_status = 'completed' OR current_status = 'cancelled' THEN
    RETURN false;
  END IF;

  RETURN deadline < now();
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-generate order number
CREATE OR REPLACE FUNCTION set_production_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_production_order_number
  BEFORE INSERT ON production_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_production_order_number();

-- Trigger: Update production_orders updated_at
CREATE OR REPLACE FUNCTION update_production_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_production_orders_updated_at
  BEFORE UPDATE ON production_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_production_orders_updated_at();

-- Seed product types
INSERT INTO product_types (name, slug, description, category, typical_turnaround_days, requires_consultation, requires_proof_approval, max_revisions) VALUES
  ('DTF Transfer', 'dtf-transfer', 'Direct-to-Film heat transfer printing for custom apparel', 'dtf_transfer', 5, true, true, 3),
  ('Laser Engraving', 'laser-engraving', 'Precision laser engraving on wood, metal, glass, and acrylic', 'laser_engraving', 3, false, true, 2),
  ('Vinyl Cutting', 'vinyl-cutting', 'Custom vinyl decals and stickers', 'vinyl_cutting', 2, false, true, 2),
  ('Embroidery', 'embroidery', 'Custom embroidery on apparel and accessories', 'embroidery', 7, true, true, 2),
  ('Screen Printing', 'screen-printing', 'High-quality screen printing for bulk orders', 'screen_printing', 7, true, true, 1),
  ('Sublimation', 'sublimation', 'Dye sublimation printing on polyester and coated items', 'sublimation', 5, false, true, 2),
  ('3D Printing', '3d-printing', 'Custom 3D printed objects and prototypes', '3d_printing', 5, true, true, 3),
  ('Custom Onesies', 'custom-onesies', 'Personalized baby onesies with custom designs', 'custom_apparel', 5, false, true, 2)
ON CONFLICT (slug) DO NOTHING;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_order_number TO authenticated;
GRANT EXECUTE ON FUNCTION update_production_order_status TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_order_progress TO authenticated;
GRANT EXECUTE ON FUNCTION is_order_overdue TO authenticated;

-- Add helpful comments
COMMENT ON TABLE production_orders IS 'Custom product orders with full lifecycle tracking';
COMMENT ON TABLE proofs IS 'Design proofs submitted for customer approval';
COMMENT ON TABLE design_files IS 'Design files uploaded for production orders';
COMMENT ON TABLE production_timeline_events IS 'Timeline of events for production orders';
COMMENT ON TABLE consultation_sessions IS 'Video consultation sessions for custom products';
