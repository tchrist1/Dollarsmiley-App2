-- Complete Demo Data Generation Script
-- Generates realistic service listings and jobs for all 70 subcategories

-- Create a single demo provider for all listings (reuse existing admin or create minimal profile)
DO $$
DECLARE
  demo_provider_id uuid;
  demo_customer_id uuid;
BEGIN
  -- Get or create a demo provider
  SELECT id INTO demo_provider_id FROM profiles WHERE email = 'demo.provider@dollarsmiley.app' LIMIT 1;
  
  IF demo_provider_id IS NULL THEN
    -- Use the admin user ID as fallback
    SELECT id INTO demo_provider_id FROM profiles WHERE user_type = 'Admin' LIMIT 1;
  END IF;
  
  -- Get or create a demo customer
  SELECT id INTO demo_customer_id FROM profiles WHERE email = 'demo.customer@dollarsmiley.app' OR user_type = 'Customer' LIMIT 1;
  
  IF demo_customer_id IS NULL THEN
    demo_customer_id := demo_provider_id;
  END IF;
  
  RAISE NOTICE 'Using provider ID: %, customer ID: %', demo_provider_id, demo_customer_id;
  
  -- Store in temp table for use in subsequent inserts
  CREATE TEMP TABLE demo_users (provider_id uuid, customer_id uuid);
  INSERT INTO demo_users VALUES (demo_provider_id, demo_customer_id);
END $$;

-- This script is too large - will break into manageable migrations
