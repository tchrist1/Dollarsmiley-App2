/*
  # Add listing_type to service_listings

  1. Changes
    - Add `listing_type` column to service_listings table
    - This indicates the type of listing (service, product, hybrid)
    - Default value is 'service'
*/

-- Add listing_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'listing_type'
  ) THEN
    ALTER TABLE service_listings 
    ADD COLUMN listing_type text DEFAULT 'service';
    
    COMMENT ON COLUMN service_listings.listing_type IS 'Type of listing: service or custom';
  END IF;
END $$;
