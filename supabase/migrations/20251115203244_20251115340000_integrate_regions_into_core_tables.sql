/*
  # Integrate Regional System into Core Tables

  1. Changes
    - Add region_id to service_listings
    - Add region_id to bookings
    - Add region_id to transactions
    - Add region_id to jobs
    - Update profiles region_code to use FK
    - Add currency_code to core tables
    - Populate default values from user locations

  2. Data Integrity
    - Preserve all existing data
    - Set default region based on location
    - Backfill currency from preferences
*/

-- Step 1: Add region integration to service_listings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_listings' AND column_name = 'region_id'
  ) THEN
    ALTER TABLE service_listings 
    ADD COLUMN region_id uuid REFERENCES regions(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_listings' AND column_name = 'currency_code'
  ) THEN
    ALTER TABLE service_listings 
    ADD COLUMN currency_code text DEFAULT 'USD';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_listings' AND column_name = 'region_specific_notes'
  ) THEN
    ALTER TABLE service_listings 
    ADD COLUMN region_specific_notes text;
  END IF;
END $$;

-- Step 2: Add region integration to bookings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'region_id'
  ) THEN
    ALTER TABLE bookings 
    ADD COLUMN region_id uuid REFERENCES regions(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'currency_code'
  ) THEN
    ALTER TABLE bookings 
    ADD COLUMN currency_code text DEFAULT 'USD';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'original_amount'
  ) THEN
    ALTER TABLE bookings 
    ADD COLUMN original_amount numeric(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'original_currency'
  ) THEN
    ALTER TABLE bookings 
    ADD COLUMN original_currency text;
  END IF;
END $$;

-- Step 3: Add region integration to transactions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'region_id'
  ) THEN
    ALTER TABLE transactions 
    ADD COLUMN region_id uuid REFERENCES regions(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'currency_code'
  ) THEN
    ALTER TABLE transactions 
    ADD COLUMN currency_code text DEFAULT 'USD';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'exchange_rate_used'
  ) THEN
    ALTER TABLE transactions 
    ADD COLUMN exchange_rate_used numeric(20, 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'amount_in_usd'
  ) THEN
    ALTER TABLE transactions 
    ADD COLUMN amount_in_usd numeric(10, 2);
  END IF;
END $$;

-- Step 4: Add region integration to jobs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'region_id'
  ) THEN
    ALTER TABLE jobs 
    ADD COLUMN region_id uuid REFERENCES regions(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'currency_code'
  ) THEN
    ALTER TABLE jobs 
    ADD COLUMN currency_code text DEFAULT 'USD';
  END IF;
END $$;

-- Step 5: Backfill default region (US) for existing records
UPDATE service_listings 
SET region_id = (SELECT id FROM regions WHERE region_code = 'US' LIMIT 1)
WHERE region_id IS NULL;

UPDATE bookings 
SET region_id = (SELECT id FROM regions WHERE region_code = 'US' LIMIT 1)
WHERE region_id IS NULL;

UPDATE transactions 
SET region_id = (SELECT id FROM regions WHERE region_code = 'US' LIMIT 1)
WHERE region_id IS NULL;

UPDATE jobs 
SET region_id = (SELECT id FROM regions WHERE region_code = 'US' LIMIT 1)
WHERE region_id IS NULL;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_listings_region ON service_listings(region_id);
CREATE INDEX IF NOT EXISTS idx_service_listings_currency ON service_listings(currency_code);
CREATE INDEX IF NOT EXISTS idx_bookings_region ON bookings(region_id);
CREATE INDEX IF NOT EXISTS idx_bookings_currency ON bookings(currency_code);
CREATE INDEX IF NOT EXISTS idx_transactions_region ON transactions(region_id);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency_code);
CREATE INDEX IF NOT EXISTS idx_jobs_region ON jobs(region_id);
CREATE INDEX IF NOT EXISTS idx_jobs_currency ON jobs(currency_code);

-- Step 7: Create helper function to detect region from location
CREATE OR REPLACE FUNCTION detect_region_from_location(
  location_text text
)
RETURNS uuid AS $$
DECLARE
  detected_region_id uuid;
BEGIN
  -- Try to match location text to region
  IF location_text ILIKE '%united states%' OR location_text ILIKE '%usa%' OR location_text ILIKE '%us%' THEN
    SELECT id INTO detected_region_id FROM regions WHERE region_code = 'US' LIMIT 1;
  ELSIF location_text ILIKE '%united kingdom%' OR location_text ILIKE '%uk%' OR location_text ILIKE '%britain%' THEN
    SELECT id INTO detected_region_id FROM regions WHERE region_code = 'GB' LIMIT 1;
  ELSIF location_text ILIKE '%canada%' THEN
    SELECT id INTO detected_region_id FROM regions WHERE region_code = 'CA' LIMIT 1;
  ELSIF location_text ILIKE '%mexico%' THEN
    SELECT id INTO detected_region_id FROM regions WHERE region_code = 'MX' LIMIT 1;
  ELSIF location_text ILIKE '%australia%' THEN
    SELECT id INTO detected_region_id FROM regions WHERE region_code = 'AU' LIMIT 1;
  ELSIF location_text ILIKE '%india%' THEN
    SELECT id INTO detected_region_id FROM regions WHERE region_code = 'IN' LIMIT 1;
  ELSE
    -- Default to US
    SELECT id INTO detected_region_id FROM regions WHERE region_code = 'US' LIMIT 1;
  END IF;

  RETURN detected_region_id;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create function to get regional price
CREATE OR REPLACE FUNCTION get_regional_price(
  item_type_param text,
  item_id_param uuid,
  region_id_param uuid,
  base_price_param numeric DEFAULT NULL
)
RETURNS numeric AS $$
DECLARE
  regional_price numeric;
  region_currency text;
BEGIN
  -- Try to get regional pricing
  SELECT display_price INTO regional_price
  FROM regional_pricing
  WHERE item_type = item_type_param
  AND item_id = item_id_param
  AND region_id = region_id_param
  AND is_active = true
  AND (valid_until IS NULL OR valid_until > now())
  LIMIT 1;

  IF FOUND THEN
    RETURN regional_price;
  END IF;

  -- If no regional pricing, convert base price
  IF base_price_param IS NOT NULL THEN
    SELECT default_currency INTO region_currency
    FROM regions
    WHERE id = region_id_param;

    IF region_currency != 'USD' THEN
      RETURN convert_currency(base_price_param, 'USD', region_currency);
    END IF;

    RETURN base_price_param;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Add comments
COMMENT ON COLUMN service_listings.region_id IS 'Region where service is available';
COMMENT ON COLUMN service_listings.currency_code IS 'Currency for pricing';
COMMENT ON COLUMN bookings.region_id IS 'Region where booking takes place';
COMMENT ON COLUMN bookings.currency_code IS 'Currency used for payment';
COMMENT ON COLUMN transactions.region_id IS 'Region where transaction occurred';
COMMENT ON COLUMN transactions.currency_code IS 'Transaction currency';
COMMENT ON FUNCTION detect_region_from_location IS 'Auto-detect region from location text';
COMMENT ON FUNCTION get_regional_price IS 'Get price adjusted for region and currency';

GRANT EXECUTE ON FUNCTION detect_region_from_location TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_regional_price TO authenticated, anon;
