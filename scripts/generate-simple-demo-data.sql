-- ============================================================================
-- SIMPLE DEMO DATA GENERATION
-- ============================================================================
-- Creates service listings and jobs using existing users
-- Note: This script uses the correct schema columns (no delivery_method, etc.)
-- ============================================================================

DO $$
DECLARE
  provider_id uuid := '00e6b068-20e2-4e46-97f2-cc4e5fb644e1'; -- Chris Tanoh (Provider)
  customer_id uuid := 'ff975350-8721-4e31-8b63-496f2e3854d7'; -- Barbara Herty (Customer)
  hybrid_id uuid := 'e346b839-c2a4-40c3-b911-6416ec1374d7'; -- Dollarsmiley USA (Both)

  category_record RECORD;
  service_count INT := 0;
  job_count INT := 0;
  i INT;
BEGIN
  RAISE NOTICE 'Starting demo data generation...';

  -- Loop through subcategories and create listings
  FOR category_record IN
    SELECT id, name, slug
    FROM categories
    WHERE parent_id IS NOT NULL
    LIMIT 20 -- Create 20 service listings
  LOOP
    -- Create service listing for provider
    INSERT INTO service_listings (
      provider_id,
      category_id,
      title,
      description,
      base_price,
      pricing_type,
      location,
      latitude,
      longitude,
      status,
      estimated_duration,
      photos
    ) VALUES (
      provider_id,
      category_record.id,
      'Professional ' || category_record.name || ' Services',
      'Experienced provider offering high-quality ' || category_record.name || '. Over 10 years of experience serving satisfied clients. Licensed, insured, and professional.',
      CASE
        WHEN category_record.slug LIKE '%wedding%' THEN 3500
        WHEN category_record.slug LIKE '%corporate%' THEN 2500
        WHEN category_record.slug LIKE '%catering%' THEN 1500
        WHEN category_record.slug LIKE '%photo%' THEN 800
        WHEN category_record.slug LIKE '%dj%' THEN 600
        ELSE 400
      END,
      'Fixed',
      'Los Angeles, CA',
      34.0522,
      -118.2437,
      'Active',
      180,
      jsonb_build_array(
        jsonb_build_object('url', 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg', 'caption', category_record.name)
      )
    );

    service_count := service_count + 1;

    -- Create job posting for customer
    INSERT INTO jobs (
      customer_id,
      category_id,
      title,
      description,
      budget_min,
      budget_max,
      location,
      latitude,
      longitude,
      execution_date_start,
      preferred_time,
      status,
      photos
    ) VALUES (
      customer_id,
      category_record.id,
      'Looking for ' || category_record.name || ' Professional',
      'Seeking experienced ' || category_record.name || ' provider for upcoming project. Looking for quality work and professional service.',
      CASE
        WHEN category_record.slug LIKE '%wedding%' THEN 3000
        WHEN category_record.slug LIKE '%corporate%' THEN 2000
        WHEN category_record.slug LIKE '%catering%' THEN 1200
        WHEN category_record.slug LIKE '%photo%' THEN 600
        WHEN category_record.slug LIKE '%dj%' THEN 500
        ELSE 300
      END,
      CASE
        WHEN category_record.slug LIKE '%wedding%' THEN 4000
        WHEN category_record.slug LIKE '%corporate%' THEN 3000
        WHEN category_record.slug LIKE '%catering%' THEN 1800
        WHEN category_record.slug LIKE '%photo%' THEN 1000
        WHEN category_record.slug LIKE '%dj%' THEN 800
        ELSE 500
      END,
      'New York, NY',
      40.7128,
      -74.0060,
      CURRENT_DATE + interval '14 days',
      'Flexible',
      'Open',
      jsonb_build_array(
        jsonb_build_object('url', 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg', 'caption', 'Reference')
      )
    );

    job_count := job_count + 1;
  END LOOP;

  -- Create additional service listings for hybrid user
  FOR category_record IN
    SELECT id, name, slug
    FROM categories
    WHERE parent_id IS NOT NULL
    LIMIT 10 OFFSET 20
  LOOP
    INSERT INTO service_listings (
      provider_id,
      category_id,
      title,
      description,
      base_price,
      pricing_type,
      location,
      latitude,
      longitude,
      status,
      estimated_duration,
      photos
    ) VALUES (
      hybrid_id,
      category_record.id,
      'Expert ' || category_record.name || ' by Dollarsmiley',
      'Premium ' || category_record.name || ' services. Top-rated provider with excellent reviews and professional results.',
      CASE
        WHEN category_record.slug LIKE '%wedding%' THEN 4000
        WHEN category_record.slug LIKE '%corporate%' THEN 3000
        WHEN category_record.slug LIKE '%catering%' THEN 1800
        WHEN category_record.slug LIKE '%photo%' THEN 1000
        WHEN category_record.slug LIKE '%dj%' THEN 800
        ELSE 500
      END,
      'Hourly',
      'Chicago, IL',
      41.8781,
      -87.6298,
      'Active',
      240,
      jsonb_build_array(
        jsonb_build_object('url', 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg', 'caption', category_record.name)
      )
    );

    service_count := service_count + 1;
  END LOOP;

  RAISE NOTICE 'Demo data generation complete!';
  RAISE NOTICE 'Service listings created: %', service_count;
  RAISE NOTICE 'Job postings created: %', job_count;

END $$;

-- Verify data
SELECT
  'Service Listings' as type,
  COUNT(*) as count,
  MIN(base_price) as min_price,
  MAX(base_price) as max_price
FROM service_listings
UNION ALL
SELECT
  'Job Postings' as type,
  COUNT(*) as count,
  MIN(budget_min) as min_price,
  MAX(budget_max) as max_price
FROM jobs;
