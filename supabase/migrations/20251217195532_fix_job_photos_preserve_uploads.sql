/*
  # Fix Job Photos to Preserve User Uploads

  1. Problem
    - Previous migration overwrote ALL job photos with Pexels stock images
    - User-uploaded photos from providers were lost
    - Need to only use stock photos for jobs that don't have valid user uploads

  2. Solution
    - Only set Pexels URLs for jobs with NULL, empty, or local file paths
    - Preserve existing valid HTTP/HTTPS URLs (user uploads)
    - Check if photos contain valid remote URLs before replacing

  3. Changes
    - Update only jobs with invalid/missing photos
    - Preserve all valid HTTP/HTTPS image URLs
*/

-- Update jobs to use Pexels URLs ONLY if they have no valid photos
-- This preserves user-uploaded images while fixing broken local file paths
UPDATE jobs
SET photos = CASE
  -- For wedding/event jobs without valid photos
  WHEN (LOWER(title) LIKE '%wedding%' OR LOWER(title) LIKE '%event%') THEN
    '["https://images.pexels.com/photos/2788488/pexels-photo-2788488.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb

  -- For hair/braiding jobs without valid photos
  WHEN (LOWER(title) LIKE '%braid%' OR LOWER(title) LIKE '%hair%') THEN
    '["https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/3992870/pexels-photo-3992870.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/3065171/pexels-photo-3065171.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb

  -- For cleaning jobs without valid photos
  WHEN (LOWER(title) LIKE '%clean%') THEN
    '["https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/4239119/pexels-photo-4239119.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb

  -- For photography jobs without valid photos
  WHEN (LOWER(title) LIKE '%photo%') THEN
    '["https://images.pexels.com/photos/4348404/pexels-photo-4348404.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1983046/pexels-photo-1983046.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb

  -- For catering/food jobs without valid photos
  WHEN (LOWER(title) LIKE '%cater%' OR LOWER(title) LIKE '%food%') THEN
    '["https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1126728/pexels-photo-1126728.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb

  -- For DJ/music jobs without valid photos
  WHEN (LOWER(title) LIKE '%dj%' OR LOWER(title) LIKE '%music%') THEN
    '["https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1763067/pexels-photo-1763067.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb

  -- Default for all other jobs without valid photos
  ELSE
    '["https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/3184460/pexels-photo-3184460.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb
END
WHERE
  -- Only update jobs that have invalid/missing photos
  (
    photos IS NULL
    OR photos::text = '[]'
    OR photos::text = '""'
    OR photos::text LIKE '%file:///%'
    OR photos::text LIKE '%ImagePicker%'
    OR photos::text LIKE '%/tmp/%'
    OR photos::text LIKE '%cache%'
    OR jsonb_array_length(photos) = 0
  )
  -- Explicitly do NOT update jobs that have valid HTTP/HTTPS URLs
  AND NOT (
    photos::text LIKE '%https://%'
    OR photos::text LIKE '%http://%'
  );

-- Add a comment to track this fix
COMMENT ON TABLE jobs IS 'Job posts table - photos column preserves user uploads, only uses stock photos for invalid/missing images';