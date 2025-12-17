/*
  # Fix Job Post Photos with Proper Image URLs
  
  1. Problem
    - Job posts have photos stored as local file paths (ImagePicker cache)
    - These paths are not accessible for display in the app
    - Service listings correctly use Pexels URLs
  
  2. Solution
    - Update all job posts to use proper Pexels URLs
    - Ensure photos column is JSONB array format
    - Use category-appropriate stock photos from Pexels
    
  3. Changes
    - Convert photos column to proper JSONB if needed
    - Replace local file paths with Pexels URLs
    - Ensure all Open jobs have visible featured images
*/

-- First, ensure the photos column is JSONB (it should be, but let's be sure)
DO $$ 
BEGIN
  -- The column should already be JSONB, this is just a safety check
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' 
    AND column_name = 'photos' 
    AND data_type != 'jsonb'
  ) THEN
    ALTER TABLE jobs ALTER COLUMN photos TYPE jsonb USING photos::jsonb;
  END IF;
END $$;

-- Update job posts with proper Pexels URLs
-- Using a variety of event/service-related images

UPDATE jobs
SET photos = CASE 
  -- For wedding/event jobs
  WHEN LOWER(title) LIKE '%wedding%' OR LOWER(title) LIKE '%event%' THEN
    '["https://images.pexels.com/photos/2788488/pexels-photo-2788488.jpeg?auto=compress&cs=tinysrgb&w=800", 
      "https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb
  
  -- For hair/braiding jobs
  WHEN LOWER(title) LIKE '%braid%' OR LOWER(title) LIKE '%hair%' THEN
    '["https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/3992870/pexels-photo-3992870.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/3065171/pexels-photo-3065171.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb
  
  -- For cleaning jobs
  WHEN LOWER(title) LIKE '%clean%' THEN
    '["https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/4239119/pexels-photo-4239119.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb
  
  -- For photography jobs
  WHEN LOWER(title) LIKE '%photo%' THEN
    '["https://images.pexels.com/photos/4348404/pexels-photo-4348404.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1983046/pexels-photo-1983046.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb
  
  -- For catering/food jobs
  WHEN LOWER(title) LIKE '%cater%' OR LOWER(title) LIKE '%food%' THEN
    '["https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1126728/pexels-photo-1126728.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb
  
  -- For DJ/music jobs
  WHEN LOWER(title) LIKE '%dj%' OR LOWER(title) LIKE '%music%' THEN
    '["https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1763067/pexels-photo-1763067.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb
  
  -- Default for all other jobs
  ELSE
    '["https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/3184460/pexels-photo-3184460.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb
END
WHERE photos IS NULL 
   OR photos::text LIKE '%file:///%'
   OR photos::text LIKE '%ImagePicker%'
   OR photos::text = '[]'
   OR photos::text = '""';

-- Ensure at least one photo for any job that still doesn't have any
UPDATE jobs
SET photos = '["https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb
WHERE photos IS NULL 
   OR jsonb_array_length(photos) = 0;
