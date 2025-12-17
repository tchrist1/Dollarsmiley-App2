/*
  # Add missing columns to service_listings

  1. Changes
    - Add `item_weight_oz` column for custom service shipping weight
    - Add `price` column for listing price
*/

-- Add item_weight_oz column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'item_weight_oz'
  ) THEN
    ALTER TABLE service_listings 
    ADD COLUMN item_weight_oz numeric;
    
    COMMENT ON COLUMN service_listings.item_weight_oz IS 'Weight of custom service item in ounces for shipping calculations';
  END IF;
END $$;

-- Add price column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'price'
  ) THEN
    ALTER TABLE service_listings 
    ADD COLUMN price numeric;
    
    COMMENT ON COLUMN service_listings.price IS 'Price of the listing';
  END IF;
END $$;
