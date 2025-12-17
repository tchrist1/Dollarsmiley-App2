/*
  # Add Realistic Booking Counts to Providers

  1. Updates
    - Add realistic total_bookings counts (5-540) to all demo providers
    - Ensures Admin User has substantial booking count

  2. Notes
    - Booking counts reflect provider experience levels
    - Varied distribution from new to established providers
*/

-- Update Admin User profile with realistic booking count
UPDATE profiles
SET total_bookings = 287
WHERE email = 'admin@dollarsmiley.com';

-- Add realistic booking counts to all providers based on their ratings
UPDATE profiles
SET total_bookings = CASE
  WHEN rating_average >= 4.8 THEN floor(random() * 391 + 150)::int  -- High performers: 150-540
  WHEN rating_average >= 4.5 THEN floor(random() * 100 + 50)::int    -- Good performers: 50-149
  WHEN rating_average >= 4.0 THEN floor(random() * 40 + 20)::int     -- Average: 20-59
  ELSE floor(random() * 15 + 5)::int                                  -- New/Lower: 5-19
END
WHERE user_type IN ('Provider', 'Hybrid')
AND (total_bookings IS NULL OR total_bookings = 0)
AND rating_average IS NOT NULL;

-- For providers without ratings yet, give them starter counts
UPDATE profiles
SET total_bookings = floor(random() * 25 + 5)::int
WHERE user_type IN ('Provider', 'Hybrid')
AND (total_bookings IS NULL OR total_bookings = 0)
AND rating_average IS NULL;
