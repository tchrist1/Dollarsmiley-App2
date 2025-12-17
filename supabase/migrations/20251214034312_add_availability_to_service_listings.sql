/*
  # Add availability column to service_listings

  1. Changes
    - Add `availability` column to store available days/times as JSONB
    - This column stores when the service provider is available

  2. Notes
    - Uses JSONB for flexible availability data structure
    - Defaults to null (availability to be set separately)
*/

-- Add availability column to service_listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'availability'
  ) THEN
    ALTER TABLE service_listings 
    ADD COLUMN availability jsonb DEFAULT NULL;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN service_listings.availability IS 'Provider availability schedule stored as JSON (days, times, etc.)';
