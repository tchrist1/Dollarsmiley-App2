/*
  # Restore Comprehensive Demo Data

  1. Purpose
    - Add diverse demo jobs across all categories
    - Use correct pricing_type values: 'quote_based' or 'fixed_price'

  2. Changes
    - Add 20+ new demo jobs with proper pricing types
*/

DO $$
DECLARE
  v_customer_id UUID;
  v_category_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM profiles WHERE user_type = 'Customer' LIMIT 1;
  
  IF v_customer_id IS NULL THEN
    INSERT INTO profiles (id, full_name, email, user_type, city, state, country)
    VALUES (gen_random_uuid(), 'Demo Customer', 'customer@demo.com', 'Customer', 'Los Angeles', 'CA', 'USA')
    RETURNING id INTO v_customer_id;
  END IF;

  -- Photography Jobs
  SELECT id INTO v_category_id FROM categories WHERE name = 'Photography' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Wedding Photography Needed', 'Looking for experienced wedding photographer for outdoor ceremony', 'fixed_price', 1500.00, NULL, NULL, 'Santa Monica, CA', '123 Beach Ave', 'Santa Monica', 'CA', '90401', 'USA', 'Open', 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0195, -118.4912, CURRENT_DATE + 30, CURRENT_DATE + 30),
    (v_customer_id, v_category_id, 'Product Photography for E-commerce', 'Need professional product photos for online store (50 items)', 'quote_based', NULL, 800, 1500, 'Los Angeles, CA', '456 Main St', 'Los Angeles', 'CA', '90012', 'USA', 'Open', 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0522, -118.2437, CURRENT_DATE + 14, CURRENT_DATE + 21)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Videography Jobs
  SELECT id INTO v_category_id FROM categories WHERE name = 'Videography' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Corporate Event Video', 'Need videographer for 2-day corporate conference', 'fixed_price', 2500.00, NULL, NULL, 'San Diego, CA', '789 Harbor Dr', 'San Diego', 'CA', '92101', 'USA', 'Open', 'https://images.pexels.com/photos/66134/pexels-photo-66134.jpeg?auto=compress&cs=tinysrgb&w=800', 32.7157, -117.1611, CURRENT_DATE + 45, CURRENT_DATE + 46),
    (v_customer_id, v_category_id, 'Real Estate Video Tour', 'Professional video tour of luxury property', 'quote_based', NULL, 500, 1000, 'Beverly Hills, CA', '321 Rodeo Dr', 'Beverly Hills', 'CA', '90210', 'USA', 'Booked', 'https://images.pexels.com/photos/1115804/pexels-photo-1115804.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0736, -118.4004, CURRENT_DATE + 7, CURRENT_DATE + 7)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Graphic Design
  SELECT id INTO v_category_id FROM categories WHERE name = 'Graphic Design' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Logo Design for Startup', 'Modern, minimalist logo for tech startup', 'fixed_price', 800.00, NULL, NULL, 'San Francisco, CA', '555 Market St', 'San Francisco', 'CA', '94102', 'USA', 'Open', 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=800', 37.7749, -122.4194, CURRENT_DATE + 21, CURRENT_DATE + 28),
    (v_customer_id, v_category_id, 'Marketing Materials Design', 'Brochures, flyers, and business cards', 'quote_based', NULL, 400, 800, 'Oakland, CA', '777 Broadway', 'Oakland', 'CA', '94607', 'USA', 'Open', 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=800', 37.8044, -122.2712, CURRENT_DATE + 14, CURRENT_DATE + 21)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Web Development
  SELECT id INTO v_category_id FROM categories WHERE name = 'Web Development' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'E-commerce Website Development', 'Build custom Shopify store with 100+ products', 'fixed_price', 5000.00, NULL, NULL, 'Los Angeles, CA', '888 Tech Blvd', 'Los Angeles', 'CA', '90015', 'USA', 'Open', 'https://images.pexels.com/photos/270404/pexels-photo-270404.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0522, -118.2437, CURRENT_DATE + 60, CURRENT_DATE + 90),
    (v_customer_id, v_category_id, 'WordPress Site Redesign', 'Modernize existing WordPress site', 'quote_based', NULL, 2000, 4000, 'Pasadena, CA', '999 Colorado Blvd', 'Pasadena', 'CA', '91101', 'USA', 'Open', 'https://images.pexels.com/photos/326503/pexels-photo-326503.jpeg?auto=compress&cs=tinysrgb&w=800', 34.1478, -118.1445, CURRENT_DATE + 30, CURRENT_DATE + 45)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Home Cleaning
  SELECT id INTO v_category_id FROM categories WHERE name = 'Home Cleaning' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Deep Clean 3-Bedroom House', 'Move-out deep cleaning needed', 'fixed_price', 350.00, NULL, NULL, 'Long Beach, CA', '111 Ocean Blvd', 'Long Beach', 'CA', '90802', 'USA', 'Open', 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=800', 33.7701, -118.1937, CURRENT_DATE + 3, CURRENT_DATE + 3),
    (v_customer_id, v_category_id, 'Weekly Cleaning Service', 'Regular weekly cleaning for apartment', 'quote_based', NULL, 100, 200, 'Santa Monica, CA', '222 Pico Blvd', 'Santa Monica', 'CA', '90405', 'USA', 'Booked', 'https://images.pexels.com/photos/4107120/pexels-photo-4107120.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0195, -118.4912, CURRENT_DATE + 7, CURRENT_DATE + 7)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Plumbing
  SELECT id INTO v_category_id FROM categories WHERE name = 'Plumbing' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Kitchen Sink Installation', 'Install new undermount kitchen sink', 'quote_based', NULL, 200, 400, 'Glendale, CA', '333 Brand Blvd', 'Glendale', 'CA', '91203', 'USA', 'Open', 'https://images.pexels.com/photos/1427581/pexels-photo-1427581.jpeg?auto=compress&cs=tinysrgb&w=800', 34.1425, -118.2551, CURRENT_DATE + 5, CURRENT_DATE + 7),
    (v_customer_id, v_category_id, 'Water Heater Replacement', 'Replace 40-gallon water heater', 'fixed_price', 1200.00, NULL, NULL, 'Burbank, CA', '444 Olive Ave', 'Burbank', 'CA', '91502', 'USA', 'Open', 'https://images.pexels.com/photos/5691608/pexels-photo-5691608.jpeg?auto=compress&cs=tinysrgb&w=800', 34.1808, -118.3090, CURRENT_DATE + 2, CURRENT_DATE + 2)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Personal Training
  SELECT id INTO v_category_id FROM categories WHERE name = 'Personal Training' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, '8-Week Fitness Program', 'Personalized training and meal plan', 'fixed_price', 1600.00, NULL, NULL, 'Venice, CA', '555 Muscle Beach', 'Venice', 'CA', '90291', 'USA', 'Open', 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=800', 33.9850, -118.4695, CURRENT_DATE + 14, CURRENT_DATE + 70),
    (v_customer_id, v_category_id, 'Marathon Training Coach', 'Prepare for first marathon in 16 weeks', 'quote_based', NULL, 1200, 2000, 'Santa Monica, CA', '666 Bike Path', 'Santa Monica', 'CA', '90402', 'USA', 'Open', 'https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0195, -118.4912, CURRENT_DATE + 7, CURRENT_DATE + 119)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Tutoring
  SELECT id INTO v_category_id FROM categories WHERE name = 'Tutoring' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'SAT Prep Tutoring', '10 sessions for SAT preparation', 'fixed_price', 800.00, NULL, NULL, 'Westwood, CA', '777 Wilshire Blvd', 'Westwood', 'CA', '90024', 'USA', 'Open', 'https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0633, -118.4455, CURRENT_DATE + 30, CURRENT_DATE + 60),
    (v_customer_id, v_category_id, 'Spanish Language Lessons', 'Conversational Spanish for beginners', 'quote_based', NULL, 300, 600, 'Los Angeles, CA', '888 Learning Ln', 'Los Angeles', 'CA', '90017', 'USA', 'Open', 'https://images.pexels.com/photos/5212320/pexels-photo-5212320.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0522, -118.2437, CURRENT_DATE + 14, CURRENT_DATE + 44)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Pet Care
  SELECT id INTO v_category_id FROM categories WHERE name = 'Pet Care' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Dog Walking - 2 Weeks', 'Daily 30-min walks for golden retriever', 'fixed_price', 280.00, NULL, NULL, 'Culver City, CA', '999 Park Ave', 'Culver City', 'CA', '90230', 'USA', 'Booked', 'https://images.pexels.com/photos/2253275/pexels-photo-2253275.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0211, -118.3965, CURRENT_DATE + 3, CURRENT_DATE + 17),
    (v_customer_id, v_category_id, 'Pet Sitting During Vacation', 'Care for 2 cats for 10 days', 'quote_based', NULL, 200, 400, 'Marina del Rey, CA', '101 Marina Way', 'Marina del Rey', 'CA', '90292', 'USA', 'Open', 'https://images.pexels.com/photos/1741205/pexels-photo-1741205.jpeg?auto=compress&cs=tinysrgb&w=800', 33.9802, -118.4517, CURRENT_DATE + 45, CURRENT_DATE + 55)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Event Planning
  SELECT id INTO v_category_id FROM categories WHERE name = 'Event Planning' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Corporate Holiday Party', 'Plan and coordinate company party for 100 people', 'fixed_price', 3500.00, NULL, NULL, 'Downtown LA, CA', '202 Event Plaza', 'Downtown LA', 'CA', '90013', 'USA', 'Open', 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0407, -118.2468, CURRENT_DATE + 90, CURRENT_DATE + 90),
    (v_customer_id, v_category_id, 'Birthday Party Planning', '50th birthday celebration at home', 'quote_based', NULL, 800, 1500, 'Pasadena, CA', '303 Party Ln', 'Pasadena', 'CA', '91105', 'USA', 'Open', 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg?auto=compress&cs=tinysrgb&w=800', 34.1478, -118.1445, CURRENT_DATE + 60, CURRENT_DATE + 60)
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
