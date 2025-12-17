/*
  # Provider Inventory Management System

  1. New Tables
    - `inventory_items` - Track materials and supplies
      - `id` (uuid, primary key)
      - `provider_id` (uuid, references profiles)
      - `name` (text)
      - `description` (text)
      - `category` (text)
      - `sku` (text)
      - `quantity` (numeric)
      - `unit` (text)
      - `reorder_point` (numeric)
      - `unit_cost` (numeric)
      - `supplier_name` (text)
      - `supplier_contact` (text)
      - `location` (text)
      - `status` (text)
      - `last_restock_date` (date)
      - `created_at` (timestamptz)
    
    - `inventory_transactions` - Track usage and restocks
      - `id` (uuid, primary key)
      - `inventory_item_id` (uuid, references inventory_items)
      - `transaction_type` (text)
      - `quantity` (numeric)
      - `unit_cost` (numeric)
      - `reference_type` (text)
      - `reference_id` (uuid)
      - `notes` (text)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
    
    - `inventory_alerts` - Low stock alerts
      - `id` (uuid, primary key)
      - `inventory_item_id` (uuid, references inventory_items)
      - `alert_type` (text)
      - `threshold` (numeric)
      - `is_active` (boolean)
      - `last_triggered_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Providers can manage their own inventory
*/

-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  sku text,
  quantity numeric DEFAULT 0 CHECK (quantity >= 0),
  unit text DEFAULT 'units',
  reorder_point numeric DEFAULT 0,
  unit_cost numeric DEFAULT 0 CHECK (unit_cost >= 0),
  supplier_name text,
  supplier_contact text,
  location text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  last_restock_date date,
  image_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_inventory_provider ON inventory_items(provider_id);
CREATE INDEX idx_inventory_category ON inventory_items(category);
CREATE INDEX idx_inventory_sku ON inventory_items(sku);
CREATE INDEX idx_inventory_status ON inventory_items(status);
CREATE INDEX idx_inventory_quantity ON inventory_items(quantity);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view own inventory"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can manage own inventory"
  ON inventory_items FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Inventory Transactions Table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('restock', 'usage', 'adjustment', 'return', 'waste')),
  quantity numeric NOT NULL,
  unit_cost numeric DEFAULT 0,
  total_cost numeric GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  reference_type text CHECK (reference_type IN ('booking', 'production_order', 'manual', 'purchase_order')),
  reference_id uuid,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_inventory_trans_item ON inventory_transactions(inventory_item_id);
CREATE INDEX idx_inventory_trans_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_trans_created ON inventory_transactions(created_at DESC);
CREATE INDEX idx_inventory_trans_reference ON inventory_transactions(reference_id, reference_type);

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view own transactions"
  ON inventory_transactions FOR SELECT
  TO authenticated
  USING (
    inventory_item_id IN (
      SELECT id FROM inventory_items WHERE provider_id = auth.uid()
    )
  );

CREATE POLICY "Providers can create transactions"
  ON inventory_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    inventory_item_id IN (
      SELECT id FROM inventory_items WHERE provider_id = auth.uid()
    )
  );

-- Inventory Alerts Table
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'expiring_soon')),
  threshold numeric,
  is_active boolean DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_inventory_alerts_item ON inventory_alerts(inventory_item_id);
CREATE INDEX idx_inventory_alerts_active ON inventory_alerts(is_active);

ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own alerts"
  ON inventory_alerts FOR ALL
  TO authenticated
  USING (
    inventory_item_id IN (
      SELECT id FROM inventory_items WHERE provider_id = auth.uid()
    )
  )
  WITH CHECK (
    inventory_item_id IN (
      SELECT id FROM inventory_items WHERE provider_id = auth.uid()
    )
  );

-- Function to update inventory quantity
CREATE OR REPLACE FUNCTION update_inventory_quantity(
  item_id_param uuid,
  transaction_type_param text,
  quantity_param numeric,
  unit_cost_param numeric DEFAULT 0,
  reference_type_param text DEFAULT NULL,
  reference_id_param uuid DEFAULT NULL,
  notes_param text DEFAULT NULL,
  user_id_param uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_quantity numeric;
  new_quantity numeric;
BEGIN
  SELECT quantity INTO current_quantity
  FROM inventory_items
  WHERE id = item_id_param;
  
  IF transaction_type_param IN ('restock', 'return', 'adjustment') THEN
    new_quantity := current_quantity + quantity_param;
  ELSIF transaction_type_param IN ('usage', 'waste') THEN
    new_quantity := current_quantity - quantity_param;
    IF new_quantity < 0 THEN
      RAISE EXCEPTION 'Insufficient inventory';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;
  
  UPDATE inventory_items
  SET 
    quantity = new_quantity,
    updated_at = now(),
    last_restock_date = CASE 
      WHEN transaction_type_param = 'restock' THEN CURRENT_DATE 
      ELSE last_restock_date 
    END
  WHERE id = item_id_param;
  
  INSERT INTO inventory_transactions (
    inventory_item_id,
    transaction_type,
    quantity,
    unit_cost,
    reference_type,
    reference_id,
    notes,
    created_by
  ) VALUES (
    item_id_param,
    transaction_type_param,
    quantity_param,
    unit_cost_param,
    reference_type_param,
    reference_id_param,
    notes_param,
    user_id_param
  );
END;
$$;

-- Function to get low stock items
CREATE OR REPLACE FUNCTION get_low_stock_items(provider_id_param uuid)
RETURNS TABLE(
  item_id uuid,
  item_name text,
  current_quantity numeric,
  reorder_point numeric,
  unit text,
  category text,
  supplier_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    name,
    quantity,
    inventory_items.reorder_point,
    inventory_items.unit,
    inventory_items.category,
    inventory_items.supplier_name
  FROM inventory_items
  WHERE provider_id = provider_id_param
    AND status = 'active'
    AND quantity <= inventory_items.reorder_point
  ORDER BY (quantity / NULLIF(inventory_items.reorder_point, 0));
END;
$$;

-- Function to get inventory value
CREATE OR REPLACE FUNCTION get_inventory_value(provider_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  total_value numeric;
BEGIN
  SELECT SUM(quantity * unit_cost) INTO total_value
  FROM inventory_items
  WHERE provider_id = provider_id_param
    AND status = 'active';
  
  RETURN COALESCE(total_value, 0);
END;
$$;

-- Function to get inventory usage stats
CREATE OR REPLACE FUNCTION get_inventory_usage_stats(
  provider_id_param uuid,
  days_param integer DEFAULT 30
)
RETURNS TABLE(
  item_id uuid,
  item_name text,
  total_used numeric,
  total_restocked numeric,
  avg_daily_usage numeric,
  days_until_reorder numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH usage_data AS (
    SELECT 
      ii.id,
      ii.name,
      ii.quantity,
      ii.reorder_point,
      COALESCE(SUM(it.quantity) FILTER (WHERE it.transaction_type = 'usage'), 0) as used,
      COALESCE(SUM(it.quantity) FILTER (WHERE it.transaction_type = 'restock'), 0) as restocked
    FROM inventory_items ii
    LEFT JOIN inventory_transactions it ON it.inventory_item_id = ii.id
      AND it.created_at >= now() - (days_param || ' days')::interval
    WHERE ii.provider_id = provider_id_param
      AND ii.status = 'active'
    GROUP BY ii.id, ii.name, ii.quantity, ii.reorder_point
  )
  SELECT 
    id,
    name,
    used,
    restocked,
    used / NULLIF(days_param, 0) as avg_daily,
    CASE 
      WHEN (used / NULLIF(days_param, 0)) > 0 
      THEN (quantity - reorder_point) / (used / NULLIF(days_param, 0))
      ELSE NULL
    END as days_until
  FROM usage_data;
END;
$$;

-- Trigger to check for low stock and create alerts
CREATE OR REPLACE FUNCTION check_inventory_alerts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.quantity <= NEW.reorder_point THEN
    INSERT INTO inventory_alerts (
      inventory_item_id,
      alert_type,
      threshold,
      last_triggered_at
    ) VALUES (
      NEW.id,
      CASE WHEN NEW.quantity = 0 THEN 'out_of_stock' ELSE 'low_stock' END,
      NEW.reorder_point,
      now()
    )
    ON CONFLICT (inventory_item_id, alert_type) 
    DO UPDATE SET
      last_triggered_at = now(),
      is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_inventory_alerts
  AFTER UPDATE OF quantity ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION check_inventory_alerts();