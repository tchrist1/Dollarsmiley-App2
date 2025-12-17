/*
  # Phase 2: Custom Products Pipeline System

  1. New Tables
    - `production_orders` - Track custom product orders
      - `id` (uuid, primary key)
      - `booking_id` (uuid, references bookings)
      - `customer_id` (uuid, references profiles)
      - `provider_id` (uuid, references profiles)
      - `product_type` (text) - DTF, Engraving, Vinyl, etc.
      - `requirements` (jsonb) - Customer requirements
      - `materials` (jsonb) - Materials needed
      - `status` (text) - Order workflow status
      - `estimated_completion_date` (timestamptz)
      - `actual_completion_date` (timestamptz)
      - `production_notes` (text)
      - `cost_breakdown` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `proofs` - Design proofs and revisions
      - `id` (uuid, primary key)
      - `production_order_id` (uuid, references production_orders)
      - `version_number` (integer)
      - `proof_images` (text[]) - Proof image URLs
      - `design_files` (text[]) - Editable design files
      - `provider_notes` (text)
      - `customer_feedback` (text)
      - `change_requests` (jsonb)
      - `status` (text) - Approval status
      - `approved_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `production_timeline_events` - Track production progress
      - `id` (uuid, primary key)
      - `production_order_id` (uuid, references production_orders)
      - `event_type` (text) - Event type
      - `description` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Customers can view their own orders
    - Providers can view orders they're fulfilling
    - Both parties can update based on role
*/

-- Production Orders Table
CREATE TABLE IF NOT EXISTS production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_type text NOT NULL,
  requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  materials jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'consultation' CHECK (status IN (
    'consultation',
    'proofing',
    'approved',
    'in_production',
    'quality_check',
    'completed',
    'cancelled'
  )),
  estimated_completion_date timestamptz,
  actual_completion_date timestamptz,
  production_notes text,
  cost_breakdown jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_production_orders_booking ON production_orders(booking_id);
CREATE INDEX idx_production_orders_customer ON production_orders(customer_id);
CREATE INDEX idx_production_orders_provider ON production_orders(provider_id);
CREATE INDEX idx_production_orders_status ON production_orders(status);
CREATE INDEX idx_production_orders_created ON production_orders(created_at DESC);

ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own production orders"
  ON production_orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Providers can view assigned production orders"
  ON production_orders FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Customers can create production orders"
  ON production_orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update own production orders"
  ON production_orders FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Providers can update assigned production orders"
  ON production_orders FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Proofs Table
CREATE TABLE IF NOT EXISTS proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  proof_images text[] DEFAULT ARRAY[]::text[],
  design_files text[] DEFAULT ARRAY[]::text[],
  provider_notes text,
  customer_feedback text,
  change_requests jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'revision_requested'
  )),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_proofs_production_order ON proofs(production_order_id);
CREATE INDEX idx_proofs_status ON proofs(status);
CREATE INDEX idx_proofs_version ON proofs(production_order_id, version_number DESC);

ALTER TABLE proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view proofs for their production orders"
  ON proofs FOR SELECT
  TO authenticated
  USING (
    production_order_id IN (
      SELECT id FROM production_orders 
      WHERE customer_id = auth.uid() OR provider_id = auth.uid()
    )
  );

CREATE POLICY "Providers can create proofs"
  ON proofs FOR INSERT
  TO authenticated
  WITH CHECK (
    production_order_id IN (
      SELECT id FROM production_orders WHERE provider_id = auth.uid()
    )
  );

CREATE POLICY "Users can update proofs for their orders"
  ON proofs FOR UPDATE
  TO authenticated
  USING (
    production_order_id IN (
      SELECT id FROM production_orders 
      WHERE customer_id = auth.uid() OR provider_id = auth.uid()
    )
  )
  WITH CHECK (
    production_order_id IN (
      SELECT id FROM production_orders 
      WHERE customer_id = auth.uid() OR provider_id = auth.uid()
    )
  );

-- Production Timeline Events Table
CREATE TABLE IF NOT EXISTS production_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_production_timeline_order ON production_timeline_events(production_order_id);
CREATE INDEX idx_production_timeline_created ON production_timeline_events(created_at DESC);

ALTER TABLE production_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view timeline for their production orders"
  ON production_timeline_events FOR SELECT
  TO authenticated
  USING (
    production_order_id IN (
      SELECT id FROM production_orders 
      WHERE customer_id = auth.uid() OR provider_id = auth.uid()
    )
  );

CREATE POLICY "System can create timeline events"
  ON production_timeline_events FOR INSERT
  TO authenticated
  WITH CHECK (
    production_order_id IN (
      SELECT id FROM production_orders 
      WHERE customer_id = auth.uid() OR provider_id = auth.uid()
    )
  );

-- Function to get production order with full details
CREATE OR REPLACE FUNCTION get_production_order_details(order_id uuid)
RETURNS TABLE(
  order_data jsonb,
  latest_proof jsonb,
  timeline jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    row_to_json(po.*)::jsonb as order_data,
    (
      SELECT row_to_json(p.*)::jsonb 
      FROM proofs p 
      WHERE p.production_order_id = order_id 
      ORDER BY p.version_number DESC 
      LIMIT 1
    ) as latest_proof,
    (
      SELECT jsonb_agg(row_to_json(pte.*) ORDER BY pte.created_at DESC)
      FROM production_timeline_events pte
      WHERE pte.production_order_id = order_id
    ) as timeline
  FROM production_orders po
  WHERE po.id = order_id;
END;
$$;

-- Function to create timeline event
CREATE OR REPLACE FUNCTION create_production_timeline_event(
  order_id uuid,
  event_type_param text,
  description_param text DEFAULT NULL,
  metadata_param jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO production_timeline_events (
    production_order_id,
    event_type,
    description,
    metadata
  ) VALUES (
    order_id,
    event_type_param,
    description_param,
    metadata_param
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Trigger to create timeline event on status change
CREATE OR REPLACE FUNCTION production_order_status_change_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM create_production_timeline_event(
      NEW.id,
      'status_change',
      'Status changed from ' || OLD.status || ' to ' || NEW.status,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER production_order_status_change
  AFTER UPDATE ON production_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION production_order_status_change_trigger();