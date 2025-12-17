/*
  # Generate Comprehensive Demo Listings - Batch 2
  
  Creates listings for Venue & Space Rentals and Catering & Food Services
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
  idx INT := 15; -- Continue from previous batch
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE user_type = 'Admin' LIMIT 1;
  
  -- Venue & Space Rentals
  SELECT id INTO cat_id FROM categories WHERE name = 'Venue & Space Rentals' AND parent_id IS NULL;
  
  FOR subcat IN 
    SELECT id, name, image_url FROM categories 
    WHERE parent_id = cat_id
  LOOP
    FOR i IN 1..3 LOOP
      idx := idx + 1;
      location := cities[(idx % array_length(cities, 1)) + 1];
      loc_data := city_coords->location;
      rating := 4.5 + (random() * 0.5);
      reviews := 20 + (random() * 980)::INT;
      base_price := 1500 + (random() * 8500)::NUMERIC;
      
      INSERT INTO service_listings (
        id, provider_id, category_id, title, description, base_price, pricing_type,
        photos, location, latitude, longitude, status, rating_average, rating_count,
        total_reviews, city, state, country, is_featured
      ) VALUES (
        gen_random_uuid(), admin_id, subcat.id,
        subcat.name || ' - ' || (loc_data->>'city'),
        'Beautiful ' || lower(subcat.name) || ' perfect for weddings, corporate events, and special celebrations. Our venue features elegant design, modern amenities, and professional service. Flexible packages available to accommodate groups of all sizes. Includes tables, chairs, and basic setup.',
        base_price, 'Fixed',
        jsonb_build_array(
          subcat.image_url,
          'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=800',
          'https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=800',
          'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg?auto=compress&cs=tinysrgb&w=800'
        ),
        location, (loc_data->>'lat')::NUMERIC, (loc_data->>'lon')::NUMERIC,
        'Active', rating, reviews, reviews,
        loc_data->>'city', loc_data->>'state', 'US',
        (idx % 15 = 0)
      );
    END LOOP;
  END LOOP;
  
  -- Catering & Food Services
  SELECT id INTO cat_id FROM categories WHERE name = 'Catering & Food Services' AND parent_id IS NULL;
  
  FOR subcat IN 
    SELECT id, name, image_url FROM categories 
    WHERE parent_id = cat_id
  LOOP
    FOR i IN 1..3 LOOP
      idx := idx + 1;
      location := cities[(idx % array_length(cities, 1)) + 1];
      loc_data := city_coords->location;
      rating := 4.4 + (random() * 0.6);
      reviews := 15 + (random() * 785)::INT;
      
      CASE 
        WHEN subcat.name LIKE '%Bartending%' THEN base_price := 45 + (random() * 55)::NUMERIC;
        WHEN subcat.name LIKE '%Chef%' THEN base_price := 75 + (random() * 125)::NUMERIC;
        ELSE base_price := 25 + (random() * 75)::NUMERIC;
      END CASE;
      
      INSERT INTO service_listings (
        id, provider_id, category_id, title, description, base_price, pricing_type,
        photos, location, latitude, longitude, status, rating_average, rating_count,
        total_reviews, city, state, country, is_featured
      ) VALUES (
        gen_random_uuid(), admin_id, subcat.id,
        'Professional ' || subcat.name || ' - ' || (loc_data->>'city'),
        'Elevate your event with our exceptional ' || lower(subcat.name) || ' services. We use premium ingredients, maintain the highest food safety standards, and deliver outstanding presentation. Custom menus available to suit any dietary needs or preferences. Perfect for weddings, corporate events, and private parties.',
        base_price,
        CASE WHEN subcat.name LIKE '%Chef%' OR subcat.name LIKE '%Bartending%' THEN 'Hourly' ELSE 'Fixed' END,
        jsonb_build_array(
          subcat.image_url,
          'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
          'https://images.pexels.com/photos/2788792/pexels-photo-2788792.jpeg?auto=compress&cs=tinysrgb&w=800',
          'https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg?auto=compress&cs=tinysrgb&w=800',
          'https://images.pexels.com/photos/1721932/pexels-photo-1721932.jpeg?auto=compress&cs=tinysrgb&w=800'
        ),
        location, (loc_data->>'lat')::NUMERIC, (loc_data->>'lon')::NUMERIC,
        'Active', rating, reviews, reviews,
        loc_data->>'city', loc_data->>'state', 'US',
        (idx % 12 = 0)
      );
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Created Venue and Catering listings';
END $$;
