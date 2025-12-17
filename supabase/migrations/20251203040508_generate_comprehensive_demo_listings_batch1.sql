/*
  # Generate Comprehensive Demo Listings - Batch 1
  
  Creates realistic service listings for Event Planning, Venues, and Catering categories
  Each listing includes:
  - Unique images from Pexels matching the service type
  - Realistic pricing (fixed or hourly)
  - High ratings (4.3-5.0)
  - Review counts (10-1200)
  - US locations
  - Professional descriptions
*/

DO $$
DECLARE
  admin_id uuid;
  cat_id uuid;
  subcat RECORD;
  listing_id uuid;
  base_price NUMERIC;
  rating NUMERIC;
  reviews INT;
  cities text[] := ARRAY['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'Austin, TX', 'Miami, FL', 'Atlanta, GA', 'Boston, MA', 'Seattle, WA', 'Denver, CO'];
  city_coords jsonb := '{
    "New York, NY": {"lat": 40.7128, "lon": -74.0060, "state": "NY", "city": "New York"},
    "Los Angeles, CA": {"lat": 34.0522, "lon": -118.2437, "state": "CA", "city": "Los Angeles"},
    "Chicago, IL": {"lat": 41.8781, "lon": -87.6298, "state": "IL", "city": "Chicago"},
    "Houston, TX": {"lat": 29.7604, "lon": -95.3698, "state": "TX", "city": "Houston"},
    "Phoenix, AZ": {"lat": 33.4484, "lon": -112.0740, "state": "AZ", "city": "Phoenix"},
    "Philadelphia, PA": {"lat": 39.9526, "lon": -75.1652, "state": "PA", "city": "Philadelphia"},
    "San Antonio, TX": {"lat": 29.4241, "lon": -98.4936, "state": "TX", "city": "San Antonio"},
    "San Diego, CA": {"lat": 32.7157, "lon": -117.1611, "state": "CA", "city": "San Diego"},
    "Dallas, TX": {"lat": 32.7767, "lon": -96.7970, "state": "TX", "city": "Dallas"},
    "Austin, TX": {"lat": 30.2672, "lon": -97.7431, "state": "TX", "city": "Austin"},
    "Miami, FL": {"lat": 25.7617, "lon": -80.1918, "state": "FL", "city": "Miami"},
    "Atlanta, GA": {"lat": 33.7490, "lon": -84.3880, "state": "GA", "city": "Atlanta"},
    "Boston, MA": {"lat": 42.3601, "lon": -71.0589, "state": "MA", "city": "Boston"},
    "Seattle, WA": {"lat": 47.6062, "lon": -122.3321, "state": "WA", "city": "Seattle"},
    "Denver, CO": {"lat": 39.7392, "lon": -104.9903, "state": "CO", "city": "Denver"}
  }'::jsonb;
  location text;
  loc_data jsonb;
  idx INT := 0;
BEGIN
  -- Get admin user as provider
  SELECT id INTO admin_id FROM profiles WHERE user_type = 'Admin' LIMIT 1;
  
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found';
  END IF;
  
  -- Event Planning & Coordination subcategories
  SELECT id INTO cat_id FROM categories WHERE name = 'Event Planning & Coordination' AND parent_id IS NULL;
  
  FOR subcat IN 
    SELECT id, name, image_url FROM categories 
    WHERE parent_id = cat_id
  LOOP
    FOR i IN 1..3 LOOP
      idx := idx + 1;
      location := cities[(idx % array_length(cities, 1)) + 1];
      loc_data := city_coords->location;
      rating := 4.3 + (random() * 0.7);
      reviews := 10 + (random() * 1190)::INT;
      
      CASE subcat.name
        WHEN 'Full-Service Event Planning' THEN
          base_price := 2500 + (random() * 7500)::NUMERIC;
          listing_id := gen_random_uuid();
          INSERT INTO service_listings (
            id, provider_id, category_id, title, description, base_price, pricing_type,
            photos, location, latitude, longitude, status, rating_average, rating_count,
            total_reviews, city, state, country, is_featured
          ) VALUES (
            listing_id, admin_id, subcat.id,
            'Premium Event Planning Services - ' || (loc_data->>'city'),
            'Transform your vision into reality with our comprehensive event planning services. We handle every detail from concept to execution, ensuring a seamless and memorable experience. Our team specializes in corporate events, galas, conferences, and special celebrations. With over 15 years of experience, we bring creativity, professionalism, and attention to detail to every project.',
            base_price, 'Fixed',
            jsonb_build_array(
              subcat.image_url,
              'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg?auto=compress&cs=tinysrgb&w=800'
            ),
            location, (loc_data->>'lat')::NUMERIC, (loc_data->>'lon')::NUMERIC,
            'Active', rating, reviews, reviews,
            loc_data->>'city', loc_data->>'state', 'US',
            (idx % 10 = 0)
          );
          
        WHEN 'Wedding Planning' THEN
          base_price := 3000 + (random() * 12000)::NUMERIC;
          listing_id := gen_random_uuid();
          INSERT INTO service_listings (
            id, provider_id, category_id, title, description, base_price, pricing_type,
            photos, location, latitude, longitude, status, rating_average, rating_count,
            total_reviews, city, state, country, is_featured
          ) VALUES (
            listing_id, admin_id, subcat.id,
            'Luxury Wedding Planning & Coordination - ' || (loc_data->>'city'),
            'Create the wedding of your dreams with our expert planning services. We specialize in both intimate ceremonies and grand celebrations, handling everything from venue selection to vendor coordination. Our personalized approach ensures every detail reflects your unique love story. Full planning, partial planning, and day-of coordination packages available.',
            base_price, 'Fixed',
            jsonb_build_array(
              subcat.image_url,
              'https://images.pexels.com/photos/2788488/pexels-photo-2788488.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/2072176/pexels-photo-2072176.jpeg?auto=compress&cs=tinysrgb&w=800'
            ),
            location, (loc_data->>'lat')::NUMERIC, (loc_data->>'lon')::NUMERIC,
            'Active', rating, reviews, reviews,
            loc_data->>'city', loc_data->>'state', 'US',
            (idx % 8 = 0)
          );
          
        WHEN 'Corporate Event Management' THEN
          base_price := 5000 + (random() * 20000)::NUMERIC;
          listing_id := gen_random_uuid();
          INSERT INTO service_listings (
            id, provider_id, category_id, title, description, base_price, pricing_type,
            photos, location, latitude, longitude, status, rating_average, rating_count,
            total_reviews, city, state, country, is_featured
          ) VALUES (
            listing_id, admin_id, subcat.id,
            'Corporate Event Management & Production - ' || (loc_data->>'city'),
            'Elevate your corporate events with our professional management services. From conferences and product launches to team building events and corporate galas, we deliver exceptional experiences that align with your brand. We handle logistics, vendor management, AV coordination, and on-site execution with precision and professionalism.',
            base_price, 'Fixed',
            jsonb_build_array(
              subcat.image_url,
              'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/3184317/pexels-photo-3184317.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/2306277/pexels-photo-2306277.jpeg?auto=compress&cs=tinysrgb&w=800'
            ),
            location, (loc_data->>'lat')::NUMERIC, (loc_data->>'lon')::NUMERIC,
            'Active', rating, reviews, reviews,
            loc_data->>'city', loc_data->>'state', 'US',
            (idx % 12 = 0)
          );
          
        WHEN 'Social & Community Events' THEN
          base_price := 1500 + (random() * 5000)::NUMERIC;
          listing_id := gen_random_uuid();
          INSERT INTO service_listings (
            id, provider_id, category_id, title, description, base_price, pricing_type,
            photos, location, latitude, longitude, status, rating_average, rating_count,
            total_reviews, city, state, country
          ) VALUES (
            listing_id, admin_id, subcat.id,
            'Community & Social Event Planning - ' || (loc_data->>'city'),
            'Bring your community together with memorable events. We specialize in festivals, fundraisers, block parties, cultural celebrations, and nonprofit events. Our team understands the unique needs of community gatherings and works within your budget to create engaging, inclusive experiences that celebrate your community''s spirit.',
            base_price, 'Fixed',
            jsonb_build_array(
              subcat.image_url,
              'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/3018845/pexels-photo-3018845.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/1729798/pexels-photo-1729798.jpeg?auto=compress&cs=tinysrgb&w=800'
            ),
            location, (loc_data->>'lat')::NUMERIC, (loc_data->>'lon')::NUMERIC,
            'Active', rating, reviews, reviews,
            loc_data->>'city', loc_data->>'state', 'US'
          );
          
        WHEN 'Day-of Coordination' THEN
          base_price := 800 + (random() * 2200)::NUMERIC;
          listing_id := gen_random_uuid();
          INSERT INTO service_listings (
            id, provider_id, category_id, title, description, base_price, pricing_type,
            photos, location, latitude, longitude, status, rating_average, rating_count,
            total_reviews, city, state, country
          ) VALUES (
            listing_id, admin_id, subcat.id,
            'Professional Day-of Event Coordination - ' || (loc_data->>'city'),
            'Relax and enjoy your special day while we handle all the details. Our day-of coordination ensures seamless execution of your event timeline, vendor management, setup supervision, and problem-solving. Perfect for clients who have planned their event but need professional oversight on the day. We arrive early and stay until the end.',
            base_price, 'Fixed',
            jsonb_build_array(
              subcat.image_url,
              'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg?auto=compress&cs=tinysrgb&w=800'
            ),
            location, (loc_data->>'lat')::NUMERIC, (loc_data->>'lon')::NUMERIC,
            'Active', rating, reviews, reviews,
            loc_data->>'city', loc_data->>'state', 'US'
          );
      END CASE;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Created Event Planning & Coordination listings';
END $$;
