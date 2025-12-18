/*
  # Add Missing Columns to production_orders

  ## Summary
  Adds columns referenced by frontend that are missing from the table:
  - title - Order title/description
  - shipping_carrier - Carrier name for shipped orders
  - tracking_number - Shipment tracking number
  - shipped_at - Timestamp when order was shipped
  - delivered_at - Timestamp when order was delivered
*/

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS shipping_carrier text;

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS tracking_number text;

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS shipped_at timestamptz;

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Create index for tracking number lookups
CREATE INDEX IF NOT EXISTS idx_production_orders_tracking ON production_orders(tracking_number) WHERE tracking_number IS NOT NULL;