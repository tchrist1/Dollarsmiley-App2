/*
  # Fix Demo Listings Case Sensitivity

  1. Changes
    - Standardize listing_type values to use proper case ('Service' instead of 'service')
    - This restores visibility of 69+ demo listings on the Home screen
  
  2. Details
    - Updates all lowercase 'service' values to 'Service' for consistency
    - Ensures cursor pagination queries match listings correctly
    - No schema changes, only data normalization
*/

-- Fix case sensitivity issue - standardize to 'Service' (capitalized)
UPDATE service_listings
SET listing_type = 'Service'
WHERE listing_type = 'service';

-- Verify the fix
DO $$
DECLARE
  service_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO service_count
  FROM service_listings
  WHERE listing_type = 'Service' AND is_active = true;
  
  RAISE NOTICE 'Total active Service listings after fix: %', service_count;
END $$;
