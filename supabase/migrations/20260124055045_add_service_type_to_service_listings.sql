/*
  # Add Service Type Field to Service Listings

  1. Changes
    - Add `service_type` column to `service_listings` table
      - Values: 'In-Person', 'Remote', 'Both'
      - Default: 'In-Person' for existing listings
    - Update existing demo data to have varied service types
  
  2. Security
    - No RLS changes needed (inherits from table)
*/

-- Add service_type column to service_listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'service_type'
  ) THEN
    ALTER TABLE service_listings 
    ADD COLUMN service_type text DEFAULT 'In-Person' 
    CHECK (service_type IN ('In-Person', 'Remote', 'Both'));
  END IF;
END $$;

-- Update existing demo listings with varied service types
UPDATE service_listings
SET service_type = CASE 
  WHEN (EXTRACT(EPOCH FROM created_at)::bigint % 3) = 0 THEN 'In-Person'
  WHEN (EXTRACT(EPOCH FROM created_at)::bigint % 3) = 1 THEN 'Remote'
  ELSE 'Both'
END
WHERE service_type IS NULL OR service_type = 'In-Person';