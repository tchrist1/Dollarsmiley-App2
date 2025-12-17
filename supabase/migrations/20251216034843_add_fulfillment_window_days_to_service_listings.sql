/*
  # Add fulfillment_window_days to service_listings

  1. Changes
    - Add `fulfillment_window_days` column to service_listings table
    - This represents the number of days within which the provider can fulfill the service
    - Default value is 7 days
*/

-- Add fulfillment_window_days column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'fulfillment_window_days'
  ) THEN
    ALTER TABLE service_listings 
    ADD COLUMN fulfillment_window_days integer DEFAULT 7 CHECK (fulfillment_window_days > 0);
    
    COMMENT ON COLUMN service_listings.fulfillment_window_days IS 'Number of days within which the provider can fulfill the service';
  END IF;
END $$;
