/*
  # Add Geographic Coordinates to Provider Profiles

  1. Updates
    - Populates `latitude`, `longitude`, and `location` fields for all Provider and Hybrid profiles
    - Assigns realistic US city coordinates for map visualization
    - Covers major metropolitan areas: NYC, LA, Chicago, SF, Houston, Phoenix, Philadelphia, Boston, Dallas, Austin, Las Vegas, DC

  2. Purpose
    - Enables map view functionality to display provider pins
    - Provides realistic geographic distribution for demo data
    - Fixes issue where providers had NULL coordinates
*/

-- Update all Provider and Hybrid profiles with realistic US coordinates
UPDATE profiles
SET 
  latitude = CASE 
    WHEN id = 'd48b3ae5-1556-49c1-a9ec-608d7dcda93f' THEN 39.3194468  -- BraidyBraid (keep existing)
    WHEN full_name LIKE '%Mohammed%' THEN 40.7128
    WHEN full_name LIKE '%King%' THEN 34.0522
    WHEN full_name LIKE '%Costa%' THEN 41.8781
    WHEN full_name LIKE '%Chen%' THEN 37.7749
    WHEN full_name LIKE '%Ortiz%' THEN 29.7604
    WHEN full_name LIKE '%Davis%' THEN 33.4484
    WHEN full_name LIKE '%Williams%' THEN 39.9526
    WHEN full_name LIKE '%Brooks%' THEN 42.3601
    WHEN full_name LIKE '%Thompson%' THEN 32.7767
    WHEN full_name LIKE '%Patel%' THEN 30.2672
    WHEN full_name LIKE '%Anderson%' THEN 36.1699
    ELSE 38.9072
  END,
  longitude = CASE 
    WHEN id = 'd48b3ae5-1556-49c1-a9ec-608d7dcda93f' THEN -76.7409621  -- BraidyBraid (keep existing)
    WHEN full_name LIKE '%Mohammed%' THEN -74.0060
    WHEN full_name LIKE '%King%' THEN -118.2437
    WHEN full_name LIKE '%Costa%' THEN -87.6298
    WHEN full_name LIKE '%Chen%' THEN -122.4194
    WHEN full_name LIKE '%Ortiz%' THEN -95.3698
    WHEN full_name LIKE '%Davis%' THEN -112.0740
    WHEN full_name LIKE '%Williams%' THEN -75.1652
    WHEN full_name LIKE '%Brooks%' THEN -71.0589
    WHEN full_name LIKE '%Thompson%' THEN -96.7970
    WHEN full_name LIKE '%Patel%' THEN -97.7431
    WHEN full_name LIKE '%Anderson%' THEN -115.1398
    ELSE -77.0369
  END,
  location = CASE 
    WHEN id = 'd48b3ae5-1556-49c1-a9ec-608d7dcda93f' THEN 'Gwynn Oak, MD'  -- Keep existing
    WHEN full_name LIKE '%Mohammed%' THEN 'New York, NY'
    WHEN full_name LIKE '%King%' THEN 'Los Angeles, CA'
    WHEN full_name LIKE '%Costa%' THEN 'Chicago, IL'
    WHEN full_name LIKE '%Chen%' THEN 'San Francisco, CA'
    WHEN full_name LIKE '%Ortiz%' THEN 'Houston, TX'
    WHEN full_name LIKE '%Davis%' THEN 'Phoenix, AZ'
    WHEN full_name LIKE '%Williams%' THEN 'Philadelphia, PA'
    WHEN full_name LIKE '%Brooks%' THEN 'Boston, MA'
    WHEN full_name LIKE '%Thompson%' THEN 'Dallas, TX'
    WHEN full_name LIKE '%Patel%' THEN 'Austin, TX'
    WHEN full_name LIKE '%Anderson%' THEN 'Las Vegas, NV'
    ELSE 'Washington, DC'
  END
WHERE user_type IN ('Provider', 'Hybrid')
  AND (latitude IS NULL OR longitude IS NULL OR location IS NULL);
