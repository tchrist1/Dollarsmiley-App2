/*
  # Demo Listings Management System

  ## Summary
  Creates infrastructure for generating, managing, and automatically deactivating demo/seed listings
  once the platform reaches sufficient real user content.

  ## New Tables

  ### 1. demo_listings_metadata
  - `id` (uuid) - Metadata record ID
  - `listing_id` (uuid) - Reference to actual listing (service/job/custom)
  - `listing_type` (text) - Service, Job, CustomService
  - `category_id` (uuid) - Category assignment
  - `subcategory_id` (uuid) - Sub-category assignment
  - `provider_name` (text) - Demo provider/business name
  - `image_url` (text) - Demo image URL
  - `is_active` (boolean) - Active/inactive status
  - `deactivated_at` (timestamptz) - When deactivated
  - `deactivation_reason` (text) - Why deactivated
  - `created_at` (timestamptz) - Creation timestamp

  ### 2. demo_listing_thresholds
  - `id` (uuid) - Threshold record ID
  - `subcategory_id` (uuid) - Sub-category reference
  - `listing_type` (text) - Service, Job, CustomService
  - `threshold_count` (integer) - Trigger count (default 150)
  - `current_real_count` (integer) - Current real listings
  - `demo_deactivated` (boolean) - Deactivation status
  - `last_checked_at` (timestamptz) - Last threshold check
  - `updated_at` (timestamptz) - Last update

  ### 3. demo_listing_log
  - `id` (uuid) - Log entry ID
  - `event_type` (text) - Created, Deactivated, ThresholdReached
  - `listing_type` (text) - Service, Job, CustomService
  - `subcategory_id` (uuid) - Sub-category
  - `listing_count` (integer) - Count at time of event
  - `details` (jsonb) - Additional context
  - `created_at` (timestamptz) - Event timestamp

  ## Security
  - Enable RLS on all demo tables
  - Only admins can manage demo listings
  - Public can view active demo listings mixed with real ones
*/

-- Create demo listings metadata table
CREATE TABLE IF NOT EXISTS demo_listings_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('Service', 'Job', 'CustomService')),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  subcategory_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  image_url text,
  is_active boolean DEFAULT true,
  deactivated_at timestamptz,
  deactivation_reason text,
  created_at timestamptz DEFAULT now()
);

-- Create demo listing thresholds table
CREATE TABLE IF NOT EXISTS demo_listing_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  listing_type text NOT NULL CHECK (listing_type IN ('Service', 'Job', 'CustomService')),
  threshold_count integer DEFAULT 150,
  current_real_count integer DEFAULT 0,
  demo_deactivated boolean DEFAULT false,
  last_checked_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(subcategory_id, listing_type)
);

-- Create demo listing log table
CREATE TABLE IF NOT EXISTS demo_listing_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('Created', 'Deactivated', 'ThresholdReached', 'BulkDeactivation')),
  listing_type text NOT NULL CHECK (listing_type IN ('Service', 'Job', 'CustomService')),
  subcategory_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  listing_count integer,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add is_demo flag to existing tables
ALTER TABLE service_listings ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_demo_metadata_listing ON demo_listings_metadata(listing_id, listing_type);
CREATE INDEX IF NOT EXISTS idx_demo_metadata_subcategory ON demo_listings_metadata(subcategory_id, listing_type);
CREATE INDEX IF NOT EXISTS idx_demo_metadata_active ON demo_listings_metadata(is_active);
CREATE INDEX IF NOT EXISTS idx_demo_thresholds_subcategory ON demo_listing_thresholds(subcategory_id, listing_type);
CREATE INDEX IF NOT EXISTS idx_service_listings_demo ON service_listings(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_jobs_demo ON jobs(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_demo_log_created ON demo_listing_log(created_at DESC);

-- Enable RLS
ALTER TABLE demo_listings_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_listing_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_listing_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for demo_listings_metadata
CREATE POLICY "Public can view active demo listings metadata"
  ON demo_listings_metadata FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage demo listings metadata"
  ON demo_listings_metadata FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'Admin'
    )
  );

-- RLS Policies for demo_listing_thresholds
CREATE POLICY "Public can view demo thresholds"
  ON demo_listing_thresholds FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage demo thresholds"
  ON demo_listing_thresholds FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'Admin'
    )
  );

-- RLS Policies for demo_listing_log
CREATE POLICY "Admins can view demo logs"
  ON demo_listing_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'Admin'
    )
  );

-- Function to check and update demo listing thresholds
CREATE OR REPLACE FUNCTION check_demo_listing_thresholds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  threshold_record RECORD;
  real_count integer;
BEGIN
  -- Check each threshold
  FOR threshold_record IN 
    SELECT * FROM demo_listing_thresholds 
    WHERE demo_deactivated = false
  LOOP
    -- Count real listings for this subcategory
    IF threshold_record.listing_type = 'Service' THEN
      SELECT COUNT(*) INTO real_count
      FROM service_listings
      WHERE category_id = threshold_record.subcategory_id
      AND is_demo = false
      AND status = 'Active';
    ELSIF threshold_record.listing_type = 'Job' THEN
      SELECT COUNT(*) INTO real_count
      FROM jobs
      WHERE category_id = threshold_record.subcategory_id
      AND is_demo = false
      AND status = 'Open';
    END IF;

    -- Update current count
    UPDATE demo_listing_thresholds
    SET current_real_count = real_count,
        last_checked_at = now(),
        updated_at = now()
    WHERE id = threshold_record.id;

    -- Check if threshold reached
    IF real_count >= threshold_record.threshold_count THEN
      -- Log threshold reached event
      INSERT INTO demo_listing_log (event_type, listing_type, subcategory_id, listing_count, details)
      VALUES (
        'ThresholdReached',
        threshold_record.listing_type,
        threshold_record.subcategory_id,
        real_count,
        jsonb_build_object('threshold', threshold_record.threshold_count)
      );

      -- Mark threshold as demo_deactivated
      UPDATE demo_listing_thresholds
      SET demo_deactivated = true,
          updated_at = now()
      WHERE id = threshold_record.id;

      -- Deactivate all demo listings for this subcategory and type
      UPDATE demo_listings_metadata
      SET is_active = false,
          deactivated_at = now(),
          deactivation_reason = format('Auto-deactivated: %s real listings reached threshold of %s',
                                       real_count, threshold_record.threshold_count)
      WHERE subcategory_id = threshold_record.subcategory_id
      AND listing_type = threshold_record.listing_type
      AND is_active = true;

      -- Also update the actual listings
      IF threshold_record.listing_type = 'Service' THEN
        UPDATE service_listings
        SET status = 'Archived'
        WHERE category_id = threshold_record.subcategory_id
        AND is_demo = true
        AND status = 'Active';
      ELSIF threshold_record.listing_type = 'Job' THEN
        UPDATE jobs
        SET status = 'Expired'
        WHERE category_id = threshold_record.subcategory_id
        AND is_demo = true
        AND status = 'Open';
      END IF;

      -- Log bulk deactivation
      INSERT INTO demo_listing_log (event_type, listing_type, subcategory_id, listing_count, details)
      VALUES (
        'BulkDeactivation',
        threshold_record.listing_type,
        threshold_record.subcategory_id,
        real_count,
        jsonb_build_object(
          'reason', 'threshold_reached',
          'threshold', threshold_record.threshold_count
        )
      );
    END IF;
  END LOOP;
END;
$$;

-- Function to initialize thresholds for all subcategories
CREATE OR REPLACE FUNCTION initialize_demo_thresholds()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert thresholds for all subcategories for each listing type
  INSERT INTO demo_listing_thresholds (subcategory_id, listing_type, threshold_count)
  SELECT id, 'Service', 150
  FROM categories
  WHERE parent_id IS NOT NULL
  ON CONFLICT (subcategory_id, listing_type) DO NOTHING;

  INSERT INTO demo_listing_thresholds (subcategory_id, listing_type, threshold_count)
  SELECT id, 'Job', 150
  FROM categories
  WHERE parent_id IS NOT NULL
  ON CONFLICT (subcategory_id, listing_type) DO NOTHING;

  INSERT INTO demo_listing_thresholds (subcategory_id, listing_type, threshold_count)
  SELECT id, 'CustomService', 150
  FROM categories
  WHERE parent_id IS NOT NULL
  ON CONFLICT (subcategory_id, listing_type) DO NOTHING;
END;
$$;

-- Initialize thresholds for all existing subcategories
SELECT initialize_demo_thresholds();

-- Create trigger to auto-check thresholds when new listings are created
CREATE OR REPLACE FUNCTION trigger_check_demo_thresholds()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only check if this is a real (non-demo) listing
  IF NEW.is_demo = false THEN
    PERFORM check_demo_listing_thresholds();
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers to service_listings and jobs
DROP TRIGGER IF EXISTS check_demo_threshold_on_service_insert ON service_listings;
CREATE TRIGGER check_demo_threshold_on_service_insert
  AFTER INSERT ON service_listings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_demo_thresholds();

DROP TRIGGER IF EXISTS check_demo_threshold_on_job_insert ON jobs;
CREATE TRIGGER check_demo_threshold_on_job_insert
  AFTER INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_demo_thresholds();
