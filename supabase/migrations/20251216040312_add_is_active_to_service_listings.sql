/*
  # Add is_active to service_listings

  1. Changes
    - Add `is_active` column to service_listings table
    - This indicates whether the listing is currently active and accepting bookings
    - Default value is true
*/

-- Add is_active column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE service_listings 
    ADD COLUMN is_active boolean DEFAULT true;
    
    COMMENT ON COLUMN service_listings.is_active IS 'Whether the listing is currently active and accepting bookings';
  END IF;
END $$;
