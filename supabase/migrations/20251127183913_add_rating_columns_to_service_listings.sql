/*
  # Add Rating and Review Columns to Service Listings
  
  1. Changes
    - Add rating_average column (numeric)
    - Add rating_count column (integer)
    - Add computed columns for listing ratings
  
  2. Purpose
    - Enable displaying ratings on listings throughout the app
    - Support filtering and sorting by rating
*/

-- Add rating columns to service_listings if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_listings' AND column_name = 'rating_average'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN rating_average numeric(3,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_listings' AND column_name = 'rating_count'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN rating_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_listings' AND column_name = 'total_reviews'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN total_reviews integer DEFAULT 0;
  END IF;
END $$;

-- Create index on rating for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_service_listings_rating_average ON service_listings(rating_average DESC);
CREATE INDEX IF NOT EXISTS idx_service_listings_rating_count ON service_listings(rating_count DESC);
