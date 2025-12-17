-- ============================================================================
-- DOLLARSMILEY PREMIUM DEMO DATA GENERATION
-- ============================================================================
-- This script generates comprehensive demo data for all subcategories
-- ============================================================================

-- Create demo customers (20 customers across various cities)
DO $$
DECLARE
  customer_ids uuid[] := ARRAY[]::uuid[];
  new_customer_id uuid;
BEGIN
  -- New York Customer
  INSERT INTO profiles (email, full_name, user_type, phone, location, latitude, longitude, bio)
  VALUES ('customer-ny-1@dollarsmiley-demo.com', 'Sarah Johnson', 'Customer', '555-2001', 'New York, NY', 40.7128, -74.0060, 'Event planner in NYC')
  RETURNING id INTO new_customer_id;
  customer_ids := array_append(customer_ids, new_customer_id);

  -- Los Angeles Customer
  INSERT INTO profiles (email, full_name, user_type, phone, location, latitude, longitude, bio)
  VALUES ('customer-la-1@dollarsmiley-demo.com', 'Michael Chen', 'Customer', '555-2002', 'Los Angeles, CA', 34.0522, -118.2437, 'Corporate event coordinator')
  RETURNING id INTO new_customer_id;
  customer_ids := array_append(customer_ids, new_customer_id);

  -- Chicago Customer
  INSERT INTO profiles (email, full_name, user_type, phone, location, latitude, longitude, bio)
  VALUES ('customer-chi-1@dollarsmiley-demo.com', 'Emily Williams', 'Customer', '555-2003', 'Chicago, IL', 41.8781, -87.6298, 'Wedding organizer')
  RETURNING id INTO new_customer_id;
  customer_ids := array_append(customer_ids, new_customer_id);

  -- Houston Customer
  INSERT INTO profiles (email, full_name, user_type, phone, location, latitude, longitude, bio)
  VALUES ('customer-hou-1@dollarsmiley-demo.com', 'James Rodriguez', 'Customer', '555-2004', 'Houston, TX', 29.7604, -95.3698, 'Party planner')
  RETURNING id INTO new_customer_id;
  customer_ids := array_append(customer_ids, new_customer_id);

  -- Phoenix Customer
  INSERT INTO profiles (email, full_name, user_type, phone, location, latitude, longitude, bio)
  VALUES ('customer-phx-1@dollarsmiley-demo.com', 'Lisa Martinez', 'Customer', '555-2005', 'Phoenix, AZ', 33.4484, -112.0740, 'Event enthusiast')
  RETURNING id INTO new_customer_id;
  customer_ids := array_append(customer_ids, new_customer_id);

  -- Store customer IDs in a temporary table for later use
  CREATE TEMP TABLE IF NOT EXISTS temp_customer_ids (customer_id uuid);
  DELETE FROM temp_customer_ids;
  INSERT INTO temp_customer_ids SELECT unnest(customer_ids);

  RAISE NOTICE 'Created % demo customers', array_length(customer_ids, 1);
END $$;

-- Create function to generate service listings with proper data
CREATE OR REPLACE FUNCTION generate_demo_service_listing(
  p_subcategory_id uuid,
  p_subcategory_name text,
  p_subcategory_slug text,
  p_index int,
  p_city text,
  p_state text,
  p_lat numeric,
  p_lng numeric
) RETURNS uuid AS $$
DECLARE
  v_provider_id uuid;
  v_service_id uuid;
  v_provider_name text;
  v_email text;
  v_price numeric;
  v_rating numeric;
  v_review_count int;
  v_title text;
  v_description text;
  v_image_url text;
  v_photos jsonb;
BEGIN
  -- Generate provider name
  v_provider_name := CASE (p_index % 10)
    WHEN 0 THEN 'Elite ' || p_subcategory_name || ' Services'
    WHEN 1 THEN 'Premier ' || p_subcategory_name || ' Professionals'
    WHEN 2 THEN 'Signature ' || p_subcategory_name || ' Co'
    WHEN 3 THEN 'Luxury ' || p_subcategory_name || ' Experts'
    WHEN 4 THEN 'Pro ' || p_subcategory_name || ' Group'
    WHEN 5 THEN 'Expert ' || p_subcategory_name || ' Team'
    WHEN 6 THEN 'Master ' || p_subcategory_name || ' Solutions'
    WHEN 7 THEN 'Exclusive ' || p_subcategory_name || ' Collective'
    WHEN 8 THEN 'Royal ' || p_subcategory_name || ' Studio'
    ELSE 'Prestige ' || p_subcategory_name || ' LLC'
  END;

  -- Generate email
  v_email := 'provider-' || lower(replace(p_subcategory_slug, '-', '')) || '-' || p_index || '@dollarsmiley-demo.com';

  -- Create provider profile
  INSERT INTO profiles (email, full_name, user_type, phone, location, latitude, longitude, bio)
  VALUES (
    v_email,
    v_provider_name,
    'Provider',
    '555-' || lpad((1000 + floor(random() * 9000))::text, 4, '0'),
    p_city || ', ' || p_state,
    p_lat,
    p_lng,
    'Professional ' || p_subcategory_name || ' provider serving the ' || p_city || ' area. Licensed, insured, and highly rated.'
  )
  RETURNING id INTO v_provider_id;

  -- Generate price based on category
  v_price := CASE
    WHEN p_subcategory_slug LIKE '%wedding%' THEN 2000 + floor(random() * 6000)
    WHEN p_subcategory_slug LIKE '%corporate%' THEN 1500 + floor(random() * 4500)
    WHEN p_subcategory_slug LIKE '%catering%' THEN 800 + floor(random() * 2700)
    WHEN p_subcategory_slug LIKE '%photography%' OR p_subcategory_slug LIKE '%photo%' THEN 500 + floor(random() * 2000)
    WHEN p_subcategory_slug LIKE '%video%' THEN 600 + floor(random() * 2400)
    WHEN p_subcategory_slug LIKE '%dj%' OR p_subcategory_slug LIKE '%band%' THEN 400 + floor(random() * 1100)
    WHEN p_subcategory_slug LIKE '%venue%' THEN 1000 + floor(random() * 4000)
    WHEN p_subcategory_slug LIKE '%decor%' OR p_subcategory_slug LIKE '%floral%' THEN 500 + floor(random() * 2500)
    WHEN p_subcategory_slug LIKE '%makeup%' OR p_subcategory_slug LIKE '%hair%' THEN 100 + floor(random() * 400)
    WHEN p_subcategory_slug LIKE '%handyman%' THEN 80 + floor(random() * 220)
    ELSE 150 + floor(random() * 650)
  END;

  -- Generate rating and review count
  v_rating := 4.5 + (random() * 0.5);
  v_review_count := 20 + floor(random() * 480);

  -- Generate title
  v_title := 'Professional ' || p_subcategory_name || ' by ' || v_provider_name;

  -- Generate description
  v_description := v_provider_name || ' specializes in delivering exceptional ' || p_subcategory_name ||
    ' with over 15 years of experience. We pride ourselves on meticulous attention to detail, ' ||
    'innovative solutions, and creating unforgettable experiences. Fully licensed, insured, and highly ' ||
    'recommended by hundreds of satisfied clients.';

  -- Select appropriate image URL based on category
  v_image_url := CASE
    WHEN p_subcategory_slug LIKE '%planning%' OR p_subcategory_slug LIKE '%coordination%' THEN 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg'
    WHEN p_subcategory_slug LIKE '%venue%' THEN 'https://images.pexels.com/photos/1395964/pexels-photo-1395964.jpeg'
    WHEN p_subcategory_slug LIKE '%catering%' OR p_subcategory_slug LIKE '%food%' THEN 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg'
    WHEN p_subcategory_slug LIKE '%dj%' OR p_subcategory_slug LIKE '%music%' THEN 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg'
    WHEN p_subcategory_slug LIKE '%decor%' OR p_subcategory_slug LIKE '%floral%' THEN 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg'
    WHEN p_subcategory_slug LIKE '%photo%' OR p_subcategory_slug LIKE '%video%' THEN 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg'
    WHEN p_subcategory_slug LIKE '%makeup%' OR p_subcategory_slug LIKE '%hair%' OR p_subcategory_slug LIKE '%braid%' THEN 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg'
    WHEN p_subcategory_slug LIKE '%kid%' OR p_subcategory_slug LIKE '%birthday%' THEN 'https://images.pexels.com/photos/1719669/pexels-photo-1719669.jpeg'
    WHEN p_subcategory_slug LIKE '%av%' OR p_subcategory_slug LIKE '%tech%' THEN 'https://images.pexels.com/photos/1329711/pexels-photo-1329711.jpeg'
    WHEN p_subcategory_slug LIKE '%handyman%' OR p_subcategory_slug LIKE '%furniture%' THEN 'https://images.pexels.com/photos/5691608/pexels-photo-5691608.jpeg'
    ELSE 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg'
  END;

  -- Create photos array
  v_photos := jsonb_build_array(
    jsonb_build_object('url', v_image_url, 'caption', p_subcategory_name || ' - Photo 1'),
    jsonb_build_object('url', v_image_url, 'caption', p_subcategory_name || ' - Photo 2'),
    jsonb_build_object('url', v_image_url, 'caption', p_subcategory_name || ' - Photo 3')
  );

  -- Create service listing
  INSERT INTO service_listings (
    provider_id, category_id, title, description, base_price, pricing_type,
    photos, location, latitude, longitude, status, estimated_duration,
    delivery_method, is_verified, average_rating, total_reviews
  )
  VALUES (
    v_provider_id,
    p_subcategory_id,
    v_title,
    v_description,
    v_price,
    CASE WHEN p_index % 2 = 0 THEN 'Fixed' ELSE 'Hourly' END,
    v_photos,
    p_city || ', ' || p_state,
    p_lat,
    p_lng,
    'Active',
    120 + floor(random() * 240),
    CASE WHEN p_index % 3 = 0 THEN 'In-Person' WHEN p_index % 3 = 1 THEN 'Remote' ELSE 'Both' END,
    random() > 0.3,
    v_rating,
    v_review_count
  )
  RETURNING id INTO v_service_id;

  RETURN v_service_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate job listings
CREATE OR REPLACE FUNCTION generate_demo_job_listing(
  p_subcategory_id uuid,
  p_subcategory_name text,
  p_subcategory_slug text,
  p_customer_id uuid,
  p_index int,
  p_city text,
  p_state text,
  p_lat numeric,
  p_lng numeric
) RETURNS uuid AS $$
DECLARE
  v_job_id uuid;
  v_budget numeric;
  v_title text;
  v_description text;
  v_image_url text;
  v_photos jsonb;
  v_execution_date date;
BEGIN
  -- Generate budget (85% of service price)
  v_budget := CASE
    WHEN p_subcategory_slug LIKE '%wedding%' THEN 1700 + floor(random() * 5100)
    WHEN p_subcategory_slug LIKE '%corporate%' THEN 1275 + floor(random() * 3825)
    WHEN p_subcategory_slug LIKE '%catering%' THEN 680 + floor(random() * 2295)
    WHEN p_subcategory_slug LIKE '%photography%' OR p_subcategory_slug LIKE '%photo%' THEN 425 + floor(random() * 1700)
    WHEN p_subcategory_slug LIKE '%video%' THEN 510 + floor(random() * 2040)
    WHEN p_subcategory_slug LIKE '%dj%' OR p_subcategory_slug LIKE '%band%' THEN 340 + floor(random() * 935)
    WHEN p_subcategory_slug LIKE '%venue%' THEN 850 + floor(random() * 3400)
    WHEN p_subcategory_slug LIKE '%decor%' OR p_subcategory_slug LIKE '%floral%' THEN 425 + floor(random() * 2125)
    WHEN p_subcategory_slug LIKE '%makeup%' OR p_subcategory_slug LIKE '%hair%' THEN 85 + floor(random() * 340)
    WHEN p_subcategory_slug LIKE '%handyman%' THEN 68 + floor(random() * 187)
    ELSE 128 + floor(random() * 553)
  END;

  -- Generate title
  v_title := CASE (p_index % 5)
    WHEN 0 THEN 'Need Professional ' || p_subcategory_name
    WHEN 1 THEN 'Looking for ' || p_subcategory_name || ' Expert'
    WHEN 2 THEN p_subcategory_name || ' Services Required'
    WHEN 3 THEN 'Seeking Experienced ' || p_subcategory_name || ' Provider'
    ELSE 'Hire ' || p_subcategory_name || ' Professional'
  END;

  -- Generate description
  v_description := 'Seeking experienced ' || p_subcategory_name || ' professional for an upcoming project. ' ||
    'Looking for someone with proven track record, excellent reviews, and attention to detail. ' ||
    'Project timeline is flexible. Please respond with your portfolio, rates, and availability.';

  -- Select appropriate image URL
  v_image_url := CASE
    WHEN p_subcategory_slug LIKE '%planning%' OR p_subcategory_slug LIKE '%coordination%' THEN 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg'
    WHEN p_subcategory_slug LIKE '%venue%' THEN 'https://images.pexels.com/photos/1395964/pexels-photo-1395964.jpeg'
    WHEN p_subcategory_slug LIKE '%catering%' OR p_subcategory_slug LIKE '%food%' THEN 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg'
    WHEN p_subcategory_slug LIKE '%dj%' OR p_subcategory_slug LIKE '%music%' THEN 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg'
    WHEN p_subcategory_slug LIKE '%decor%' OR p_subcategory_slug LIKE '%floral%' THEN 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg'
    WHEN p_subcategory_slug LIKE '%photo%' OR p_subcategory_slug LIKE '%video%' THEN 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg'
    WHEN p_subcategory_slug LIKE '%makeup%' OR p_subcategory_slug LIKE '%hair%' OR p_subcategory_slug LIKE '%braid%' THEN 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg'
    WHEN p_subcategory_slug LIKE '%kid%' OR p_subcategory_slug LIKE '%birthday%' THEN 'https://images.pexels.com/photos/1719669/pexels-photo-1719669.jpeg'
    WHEN p_subcategory_slug LIKE '%av%' OR p_subcategory_slug LIKE '%tech%' THEN 'https://images.pexels.com/photos/1329711/pexels-photo-1329711.jpeg'
    WHEN p_subcategory_slug LIKE '%handyman%' OR p_subcategory_slug LIKE '%furniture%' THEN 'https://images.pexels.com/photos/5691608/pexels-photo-5691608.jpeg'
    ELSE 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg'
  END;

  -- Create photos array
  v_photos := jsonb_build_array(
    jsonb_build_object('url', v_image_url, 'caption', p_subcategory_name || ' - Reference')
  );

  -- Generate execution date (7-52 days from now)
  v_execution_date := CURRENT_DATE + (7 + floor(random() * 45))::integer;

  -- Create job listing
  INSERT INTO jobs (
    customer_id, category_id, title, description, budget_min, budget_max,
    location, latitude, longitude, execution_date_start, preferred_time,
    photos, status
  )
  VALUES (
    p_customer_id,
    p_subcategory_id,
    v_title,
    v_description,
    floor(v_budget * 0.8),
    v_budget,
    p_city || ', ' || p_state,
    p_lat,
    p_lng,
    v_execution_date,
    CASE (p_index % 4)
      WHEN 0 THEN 'Morning'
      WHEN 1 THEN 'Afternoon'
      WHEN 2 THEN 'Evening'
      ELSE 'Flexible'
    END,
    v_photos,
    'Open'
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- Generate listings for all subcategories
DO $$
DECLARE
  subcategory_record RECORD;
  city_record RECORD;
  customer_id uuid;
  listings_count int;
  service_count int := 0;
  job_count int := 0;
  i int;
  v_service_id uuid;
  v_job_id uuid;
BEGIN
  -- Define cities
  CREATE TEMP TABLE IF NOT EXISTS temp_cities (
    city text,
    state text,
    lat numeric,
    lng numeric
  );
  DELETE FROM temp_cities;

  INSERT INTO temp_cities VALUES
    ('New York', 'NY', 40.7128, -74.0060),
    ('Los Angeles', 'CA', 34.0522, -118.2437),
    ('Chicago', 'IL', 41.8781, -87.6298),
    ('Houston', 'TX', 29.7604, -95.3698),
    ('Phoenix', 'AZ', 33.4484, -112.0740),
    ('Philadelphia', 'PA', 39.9526, -75.1652),
    ('San Diego', 'CA', 32.7157, -117.1611),
    ('Dallas', 'TX', 32.7767, -96.7970),
    ('Austin', 'TX', 30.2672, -97.7431),
    ('San Francisco', 'CA', 37.7749, -122.4194),
    ('Seattle', 'WA', 47.6062, -122.3321),
    ('Denver', 'CO', 39.7392, -104.9903),
    ('Boston', 'MA', 42.3601, -71.0589),
    ('Miami', 'FL', 25.7617, -80.1918),
    ('Atlanta', 'GA', 33.7490, -84.3880);

  -- Process each subcategory
  FOR subcategory_record IN
    SELECT id, slug, name
    FROM categories
    WHERE parent_id IS NOT NULL
    ORDER BY name
  LOOP
    RAISE NOTICE 'Processing: %', subcategory_record.name;

    -- Determine listings count (more for popular categories)
    listings_count := CASE
      WHEN subcategory_record.slug LIKE '%wedding%' OR
           subcategory_record.slug LIKE '%corporate%' OR
           subcategory_record.slug LIKE '%catering%' THEN 10
      ELSE 7
    END;

    -- Generate service listings
    FOR i IN 1..listings_count LOOP
      -- Pick random city
      SELECT * INTO city_record FROM temp_cities ORDER BY random() LIMIT 1;

      -- Generate service listing
      v_service_id := generate_demo_service_listing(
        subcategory_record.id,
        subcategory_record.name,
        subcategory_record.slug,
        i,
        city_record.city,
        city_record.state,
        city_record.lat,
        city_record.lng
      );

      IF v_service_id IS NOT NULL THEN
        service_count := service_count + 1;
      END IF;
    END LOOP;

    -- Generate job listings
    FOR i IN 1..listings_count LOOP
      -- Pick random city and customer
      SELECT * INTO city_record FROM temp_cities ORDER BY random() LIMIT 1;
      SELECT customer_id INTO customer_id FROM temp_customer_ids ORDER BY random() LIMIT 1;

      -- Generate job listing
      v_job_id := generate_demo_job_listing(
        subcategory_record.id,
        subcategory_record.name,
        subcategory_record.slug,
        customer_id,
        i,
        city_record.city,
        city_record.state,
        city_record.lat,
        city_record.lng
      );

      IF v_job_id IS NOT NULL THEN
        job_count := job_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Demo data generation complete!';
  RAISE NOTICE 'Services created: %', service_count;
  RAISE NOTICE 'Jobs created: %', job_count;
END $$;

-- Cleanup functions
DROP FUNCTION IF EXISTS generate_demo_service_listing;
DROP FUNCTION IF EXISTS generate_demo_job_listing;

-- Drop temp tables
DROP TABLE IF EXISTS temp_customer_ids;
DROP TABLE IF EXISTS temp_cities;

-- Final summary
SELECT
  'Demo Data Summary' as report,
  COUNT(DISTINCT id) FILTER (WHERE email LIKE '%@dollarsmiley-demo.com' AND user_type = 'Provider') as total_providers,
  COUNT(DISTINCT id) FILTER (WHERE email LIKE '%@dollarsmiley-demo.com' AND user_type = 'Customer') as total_customers,
  (SELECT COUNT(*) FROM service_listings WHERE provider_id IN (SELECT id FROM profiles WHERE email LIKE '%@dollarsmiley-demo.com')) as total_services,
  (SELECT COUNT(*) FROM jobs WHERE customer_id IN (SELECT id FROM profiles WHERE email LIKE '%@dollarsmiley-demo.com')) as total_jobs
FROM profiles;
