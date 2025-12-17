/*
  # Add Duration and Address Fields

  1. Changes to jobs table
    - Add `estimated_duration_hours` (numeric) - Estimated hours for job completion

  2. Changes to profiles table
    - Add address fields for complete location information:
      - `street_address` (text)
      - `city` (text)
      - `state` (text)
      - `zip_code` (text)
      - `country` (text, default 'US')

  3. Changes to service_listings table
    - Add address fields matching profiles

  4. Changes to jobs table
    - Add address fields matching profiles

  5. Security
    - No RLS changes needed, existing policies apply to new columns
*/

-- Add estimated duration to jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'estimated_duration_hours'
  ) THEN
    ALTER TABLE jobs ADD COLUMN estimated_duration_hours numeric(4, 1) CHECK (estimated_duration_hours > 0);
  END IF;
END $$;

-- Add address fields to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'street_address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN street_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'city'
  ) THEN
    ALTER TABLE profiles ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'state'
  ) THEN
    ALTER TABLE profiles ADD COLUMN state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'zip_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN zip_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'country'
  ) THEN
    ALTER TABLE profiles ADD COLUMN country text DEFAULT 'US';
  END IF;
END $$;

-- Add address fields to service_listings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'street_address'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN street_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'city'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'state'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'zip_code'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN zip_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'country'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN country text DEFAULT 'US';
  END IF;
END $$;

-- Add address fields to jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'street_address'
  ) THEN
    ALTER TABLE jobs ADD COLUMN street_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'city'
  ) THEN
    ALTER TABLE jobs ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'state'
  ) THEN
    ALTER TABLE jobs ADD COLUMN state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'zip_code'
  ) THEN
    ALTER TABLE jobs ADD COLUMN zip_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'country'
  ) THEN
    ALTER TABLE jobs ADD COLUMN country text DEFAULT 'US';
  END IF;
END $$;

-- Create index on city/state for faster location-based searches
CREATE INDEX IF NOT EXISTS idx_profiles_city_state ON profiles(city, state) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_listings_city_state ON service_listings(city, state) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_city_state ON jobs(city, state) WHERE city IS NOT NULL;
