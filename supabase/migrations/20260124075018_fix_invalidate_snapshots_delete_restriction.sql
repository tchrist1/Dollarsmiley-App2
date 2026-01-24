/*
  # Fix invalidate snapshots DELETE restriction
  
  1. Changes
    - Update invalidate_home_feed_snapshots function to use TRUNCATE instead of DELETE
    - TRUNCATE is designed for removing all rows and doesn't require WHERE clause
    
  2. Security
    - Function remains SECURITY DEFINER to allow proper execution
    - Only affects snapshot cache table which is safe to clear
*/

CREATE OR REPLACE FUNCTION invalidate_home_feed_snapshots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Truncate all snapshots to force refresh
  -- TRUNCATE is designed for clearing entire tables and doesn't require WHERE clause
  TRUNCATE TABLE home_feed_snapshots;
  RETURN NEW;
END;
$$;
