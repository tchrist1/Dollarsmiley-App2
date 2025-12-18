/*
  # Fix Fulfillment Options Table Schema
  
  ## Summary
  Restores missing columns to the fulfillment_options table that are required by the business logic.
  The table was simplified in a previous migration, removing critical pricing and shipping configuration columns.
  
  ## Changes Made
  
  1. **Added Missing Columns to fulfillment_options**:
     - `shipping_mode` (text) - 'Platform' or 'External' for shipping fulfillment
     - `base_cost` (numeric) - Base fulfillment cost
     - `cost_per_mile` (numeric) - Distance-based pricing for DropOff
     - `cost_per_pound` (numeric) - Weight-based pricing
     - `estimated_days_min` (integer) - Minimum delivery/fulfillment days
     - `estimated_days_max` (integer) - Maximum delivery/fulfillment days
     - `carrier_preference` (text[]) - Preferred carriers for shipping (USPS, UPS, FedEx, DHL)
     - `updated_at` (timestamptz) - Last update timestamp
  
  2. **Updated Fulfillment Type Constraint**:
     - Removed 'PickupDropOff' from valid options
     - Valid types: 'Pickup', 'DropOff', 'Shipping'
     - 'Pickup' = Customer picks up from provider location
     - 'DropOff' = Provider delivers to customer location
     - 'Shipping' = Third-party carrier delivery
  
  ## Business Logic Compatibility
  - Supports `calculatePickupDropoffCost()` function in lib/shipping.ts
  - Enables distance-based pricing for DropOff fulfillment
  - Supports shipping rate calculation and carrier selection
  
  ## Data Safety
  - Uses ALTER TABLE ADD COLUMN IF NOT EXISTS to prevent errors
  - Sets sensible defaults for all new columns
  - Does not modify or delete existing data
*/

-- Add missing columns to fulfillment_options table
ALTER TABLE fulfillment_options 
  ADD COLUMN IF NOT EXISTS shipping_mode text CHECK (shipping_mode IN ('Platform', 'External'));

ALTER TABLE fulfillment_options 
  ADD COLUMN IF NOT EXISTS base_cost numeric DEFAULT 0 CHECK (base_cost >= 0);

ALTER TABLE fulfillment_options 
  ADD COLUMN IF NOT EXISTS cost_per_mile numeric DEFAULT 0 CHECK (cost_per_mile >= 0);

ALTER TABLE fulfillment_options 
  ADD COLUMN IF NOT EXISTS cost_per_pound numeric DEFAULT 0 CHECK (cost_per_pound >= 0);

ALTER TABLE fulfillment_options 
  ADD COLUMN IF NOT EXISTS estimated_days_min integer DEFAULT 1 CHECK (estimated_days_min > 0);

ALTER TABLE fulfillment_options 
  ADD COLUMN IF NOT EXISTS estimated_days_max integer DEFAULT 7 CHECK (estimated_days_max >= estimated_days_min);

ALTER TABLE fulfillment_options 
  ADD COLUMN IF NOT EXISTS carrier_preference text[] DEFAULT ARRAY[]::text[];

ALTER TABLE fulfillment_options 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add comments for documentation
COMMENT ON COLUMN fulfillment_options.shipping_mode IS 'Platform (using shipping API) or External (provider handles shipping)';
COMMENT ON COLUMN fulfillment_options.base_cost IS 'Base cost for this fulfillment method';
COMMENT ON COLUMN fulfillment_options.cost_per_mile IS 'Additional cost per mile for DropOff deliveries';
COMMENT ON COLUMN fulfillment_options.cost_per_pound IS 'Additional cost per pound for weight-based pricing';
COMMENT ON COLUMN fulfillment_options.estimated_days_min IS 'Minimum fulfillment/delivery days';
COMMENT ON COLUMN fulfillment_options.estimated_days_max IS 'Maximum fulfillment/delivery days';
COMMENT ON COLUMN fulfillment_options.carrier_preference IS 'Preferred carriers for Shipping type: USPS, UPS, FedEx, DHL';

-- Update the constraint to match current business logic (without PickupDropOff)
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'fulfillment_options' 
    AND constraint_name LIKE '%fulfillment_type%'
  ) THEN
    ALTER TABLE fulfillment_options DROP CONSTRAINT IF EXISTS fulfillment_options_fulfillment_type_check;
  END IF;
  
  -- Add the correct constraint
  ALTER TABLE fulfillment_options 
    ADD CONSTRAINT fulfillment_options_fulfillment_type_check 
    CHECK (fulfillment_type IN ('Pickup', 'DropOff', 'Shipping'));
END $$;

-- Create index for better query performance on fulfillment type
CREATE INDEX IF NOT EXISTS idx_fulfillment_options_type 
  ON fulfillment_options(fulfillment_type) WHERE is_active = true;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fulfillment_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fulfillment_options_updated_at ON fulfillment_options;
CREATE TRIGGER trigger_update_fulfillment_options_updated_at
  BEFORE UPDATE ON fulfillment_options
  FOR EACH ROW
  EXECUTE FUNCTION update_fulfillment_options_updated_at();
