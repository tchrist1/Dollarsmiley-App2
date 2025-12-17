/*
  # Integrate Regional System into Delivery & Production

  1. Changes
    - Add origin_region_id and destination_region_id to shipments
    - Add region_id to production_orders
    - Add currency fields to shipments
    - Create cross-region shipping rules

  2. Security
    - Maintain existing RLS policies
*/

-- Add regional fields to shipments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shipments' AND column_name = 'origin_region_id'
  ) THEN
    ALTER TABLE shipments 
    ADD COLUMN origin_region_id uuid REFERENCES regions(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shipments' AND column_name = 'destination_region_id'
  ) THEN
    ALTER TABLE shipments 
    ADD COLUMN destination_region_id uuid REFERENCES regions(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shipments' AND column_name = 'currency_code'
  ) THEN
    ALTER TABLE shipments 
    ADD COLUMN currency_code text DEFAULT 'USD';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shipments' AND column_name = 'is_cross_region'
  ) THEN
    ALTER TABLE shipments 
    ADD COLUMN is_cross_region boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shipments' AND column_name = 'customs_required'
  ) THEN
    ALTER TABLE shipments 
    ADD COLUMN customs_required boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shipments' AND column_name = 'customs_cleared_at'
  ) THEN
    ALTER TABLE shipments 
    ADD COLUMN customs_cleared_at timestamptz;
  END IF;
END $$;

-- Add regional fields to production_orders
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_orders' AND column_name = 'region_id'
  ) THEN
    ALTER TABLE production_orders 
    ADD COLUMN region_id uuid REFERENCES regions(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_orders' AND column_name = 'currency_code'
  ) THEN
    ALTER TABLE production_orders 
    ADD COLUMN currency_code text DEFAULT 'USD';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_orders' AND column_name = 'production_country'
  ) THEN
    ALTER TABLE production_orders 
    ADD COLUMN production_country text;
  END IF;
END $$;

-- Backfill default regions
UPDATE shipments 
SET origin_region_id = (SELECT id FROM regions WHERE region_code = 'US' LIMIT 1),
    destination_region_id = (SELECT id FROM regions WHERE region_code = 'US' LIMIT 1)
WHERE origin_region_id IS NULL;

UPDATE production_orders 
SET region_id = (SELECT id FROM regions WHERE region_code = 'US' LIMIT 1)
WHERE region_id IS NULL;

-- Create cross-region shipping rules table
CREATE TABLE IF NOT EXISTS cross_region_shipping_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  from_region_id uuid REFERENCES regions(id) ON DELETE CASCADE NOT NULL,
  to_region_id uuid REFERENCES regions(id) ON DELETE CASCADE NOT NULL,

  is_allowed boolean DEFAULT true,
  requires_customs boolean DEFAULT true,
  estimated_transit_days integer,

  base_shipping_cost numeric(10, 2),
  cost_per_kg numeric(10, 2),
  currency_code text DEFAULT 'USD',

  restrictions text[],
  required_documents text[],

  is_active boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(from_region_id, to_region_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shipments_origin_region ON shipments(origin_region_id);
CREATE INDEX IF NOT EXISTS idx_shipments_dest_region ON shipments(destination_region_id);
CREATE INDEX IF NOT EXISTS idx_shipments_cross_region ON shipments(is_cross_region) WHERE is_cross_region = true;
CREATE INDEX IF NOT EXISTS idx_production_orders_region ON production_orders(region_id);
CREATE INDEX IF NOT EXISTS idx_cross_region_rules_from ON cross_region_shipping_rules(from_region_id);
CREATE INDEX IF NOT EXISTS idx_cross_region_rules_to ON cross_region_shipping_rules(to_region_id);

-- Enable RLS
ALTER TABLE cross_region_shipping_rules ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Anyone can view shipping rules"
  ON cross_region_shipping_rules FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Function to calculate cross-region shipping cost
CREATE OR REPLACE FUNCTION calculate_cross_region_shipping(
  from_region_id_param uuid,
  to_region_id_param uuid,
  weight_kg_param numeric
)
RETURNS numeric AS $$
DECLARE
  base_cost numeric;
  cost_per_kg numeric;
  total_cost numeric;
  rule_currency text;
  target_currency text;
BEGIN
  -- Get shipping rule
  SELECT 
    base_shipping_cost,
    csrr.cost_per_kg,
    currency_code
  INTO base_cost, cost_per_kg, rule_currency
  FROM cross_region_shipping_rules csrr
  WHERE from_region_id = from_region_id_param
  AND to_region_id = to_region_id_param
  AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    -- Default calculation
    base_cost := 50.00;
    cost_per_kg := 5.00;
    rule_currency := 'USD';
  END IF;

  total_cost := base_cost + (cost_per_kg * weight_kg_param);

  -- Convert to destination currency if needed
  SELECT default_currency INTO target_currency
  FROM regions
  WHERE id = to_region_id_param;

  IF target_currency IS NOT NULL AND target_currency != rule_currency THEN
    total_cost := convert_currency(total_cost, rule_currency, target_currency);
  END IF;

  RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to check if cross-region shipping is allowed
CREATE OR REPLACE FUNCTION is_cross_region_shipping_allowed(
  from_region_id_param uuid,
  to_region_id_param uuid
)
RETURNS boolean AS $$
DECLARE
  is_allowed boolean;
BEGIN
  SELECT csrr.is_allowed INTO is_allowed
  FROM cross_region_shipping_rules csrr
  WHERE from_region_id = from_region_id_param
  AND to_region_id = to_region_id_param
  AND is_active = true
  LIMIT 1;

  -- If no rule exists, allow by default
  RETURN COALESCE(is_allowed, true);
END;
$$ LANGUAGE plpgsql;

-- Seed some cross-region shipping rules
INSERT INTO cross_region_shipping_rules (
  from_region_id, to_region_id, is_allowed, requires_customs, 
  estimated_transit_days, base_shipping_cost, cost_per_kg, currency_code
)
SELECT 
  r1.id, r2.id, true, 
  CASE WHEN r1.id = r2.id THEN false ELSE true END,
  CASE WHEN r1.id = r2.id THEN 3 ELSE 10 END,
  CASE WHEN r1.id = r2.id THEN 10.00 ELSE 50.00 END,
  CASE WHEN r1.id = r2.id THEN 2.00 ELSE 8.00 END,
  r1.default_currency
FROM regions r1
CROSS JOIN regions r2
WHERE r1.is_active = true AND r2.is_active = true
ON CONFLICT (from_region_id, to_region_id) DO NOTHING;

GRANT EXECUTE ON FUNCTION calculate_cross_region_shipping TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_cross_region_shipping_allowed TO authenticated, anon;

COMMENT ON TABLE cross_region_shipping_rules IS 'Rules for shipping between regions';
COMMENT ON FUNCTION calculate_cross_region_shipping IS 'Calculate shipping cost between regions';
COMMENT ON FUNCTION is_cross_region_shipping_allowed IS 'Check if shipping between regions is allowed';
