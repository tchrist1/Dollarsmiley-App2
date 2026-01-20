/*
  # Add Comprehensive Demo Jobs

  1. Purpose
    - Add 30+ jobs using actual database categories
    - Ensure marketplace is fully populated

  2. Changes
    - Use existing category names from database
    - Mix of fixed_price and quote_based jobs
*/

DO $$
DECLARE
  v_customer_id UUID;
  v_category_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM profiles WHERE user_type = 'Customer' LIMIT 1;

  -- DJs & Live Bands
  SELECT id INTO v_category_id FROM categories WHERE name = 'DJs & Live Bands' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Wedding DJ - 5 Hours', 'Professional DJ for wedding reception', 'fixed_price', 1200.00, NULL, NULL, 'Santa Barbara, CA', '100 Music Ln', 'Santa Barbara', 'CA', '93102', 'USA', 'Open', 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800', 34.4208, -119.6982, CURRENT_DATE + 45, CURRENT_DATE + 45),
    (v_customer_id, v_category_id, 'Birthday Party DJ', 'DJ for 21st birthday party', 'quote_based', NULL, 400, 800, 'Pasadena, CA', '200 Party Ave', 'Pasadena', 'CA', '91106', 'USA', 'Open', 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800', 34.1478, -118.1445, CURRENT_DATE + 25, CURRENT_DATE + 25)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Event Photography
  SELECT id INTO v_category_id FROM categories WHERE name = 'Event Photography' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Conference Photography', '2-day corporate conference coverage', 'fixed_price', 2500.00, NULL, NULL, 'San Diego, CA', '300 Conference Dr', 'San Diego', 'CA', '92101', 'USA', 'Open', 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=800', 32.7157, -117.1611, CURRENT_DATE + 45, CURRENT_DATE + 46),
    (v_customer_id, v_category_id, 'Family Party Photos', 'Birthday party photography', 'quote_based', NULL, 300, 600, 'Irvine, CA', '400 Family Way', 'Irvine', 'CA', '92602', 'USA', 'Open', 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800', 33.6846, -117.8265, CURRENT_DATE + 30, CURRENT_DATE + 30)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Catering & Food Services
  SELECT id INTO v_category_id FROM categories WHERE name = 'Catering & Food Services' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Wedding Catering for 150', 'Full service catering with servers', 'quote_based', NULL, 4000, 8000, 'Malibu, CA', '500 Beach Rd', 'Malibu', 'CA', '90265', 'USA', 'Open', 'https://images.pexels.com/photos/1395964/pexels-photo-1395964.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0259, -118.7798, CURRENT_DATE + 60, CURRENT_DATE + 60),
    (v_customer_id, v_category_id, 'Corporate Lunch', 'Lunch for 50 people', 'fixed_price', 1200.00, NULL, NULL, 'Downtown LA, CA', '600 Business St', 'Downtown LA', 'CA', '90014', 'USA', 'Open', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0407, -118.2468, CURRENT_DATE + 21, CURRENT_DATE + 21)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Home Cleaning
  SELECT id INTO v_category_id FROM categories WHERE name = 'Home Cleaning' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Deep Clean 4-Bedroom House', 'Post-construction deep clean', 'quote_based', NULL, 400, 700, 'Newport Beach, CA', '700 Clean Ave', 'Newport Beach', 'CA', '92660', 'USA', 'Open', 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=800', 33.6189, -117.9289, CURRENT_DATE + 8, CURRENT_DATE + 8),
    (v_customer_id, v_category_id, 'Bi-Weekly House Cleaning', 'Regular cleaning service', 'fixed_price', 120.00, NULL, NULL, 'Thousand Oaks, CA', '800 Tidy Ln', 'Thousand Oaks', 'CA', '91360', 'USA', 'Open', 'https://images.pexels.com/photos/4107120/pexels-photo-4107120.jpeg?auto=compress&cs=tinysrgb&w=800', 34.1706, -118.8376, CURRENT_DATE + 14, CURRENT_DATE + 14)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Handyman & Home Support Services
  SELECT id INTO v_category_id FROM categories WHERE name = 'Handyman & Home Support Services' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'General Home Repairs', 'Fix doors, patch walls, minor repairs', 'quote_based', NULL, 200, 500, 'Torrance, CA', '900 Fix It Ln', 'Torrance', 'CA', '90501', 'USA', 'Open', 'https://images.pexels.com/photos/4792486/pexels-photo-4792486.jpeg?auto=compress&cs=tinysrgb&w=800', 33.8358, -118.3406, CURRENT_DATE + 6, CURRENT_DATE + 7),
    (v_customer_id, v_category_id, 'Install Shelving Units', 'Install 3 wall shelves', 'fixed_price', 180.00, NULL, NULL, 'Culver City, CA', '1000 Shelf Ave', 'Culver City', 'CA', '90231', 'USA', 'Open', 'https://images.pexels.com/photos/5691621/pexels-photo-5691621.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0211, -118.3965, CURRENT_DATE + 4, CURRENT_DATE + 4)
    ON CONFLICT DO NOTHING;
  END IF;

  -- TV Mounting & Unmounting Services
  SELECT id INTO v_category_id FROM categories WHERE name = 'TV Mounting & Unmounting Services' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Mount 65" TV on Wall', 'Professional TV mounting service', 'fixed_price', 150.00, NULL, NULL, 'Anaheim, CA', '1100 Mount St', 'Anaheim', 'CA', '92805', 'USA', 'Open', 'https://images.pexels.com/photos/1201996/pexels-photo-1201996.jpeg?auto=compress&cs=tinysrgb&w=800', 33.8366, -117.9143, CURRENT_DATE + 5, CURRENT_DATE + 5),
    (v_customer_id, v_category_id, 'Mount 85" TV Above Fireplace', 'Large TV mounting with cable concealment', 'quote_based', NULL, 200, 400, 'Beverly Hills, CA', '1200 TV Lane', 'Beverly Hills', 'CA', '90210', 'USA', 'Open', 'https://images.pexels.com/photos/1201996/pexels-photo-1201996.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0736, -118.4004, CURRENT_DATE + 7, CURRENT_DATE + 7)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Moving Help & Event Setup
  SELECT id INTO v_category_id FROM categories WHERE name = 'Moving Help & Event Setup' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Local Move - 2 Bedroom', 'Move within same city', 'quote_based', NULL, 400, 800, 'Santa Monica, CA', '1300 Moving Blvd', 'Santa Monica', 'CA', '90404', 'USA', 'Open', 'https://images.pexels.com/photos/4246120/pexels-photo-4246120.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0195, -118.4912, CURRENT_DATE + 14, CURRENT_DATE + 14),
    (v_customer_id, v_category_id, 'Event Setup Crew', 'Setup tables and chairs for 100 people', 'fixed_price', 600.00, NULL, NULL, 'Long Beach, CA', '1400 Event Way', 'Long Beach', 'CA', '90803', 'USA', 'Open', 'https://images.pexels.com/photos/976866/pexels-photo-976866.jpeg?auto=compress&cs=tinysrgb&w=800', 33.7701, -118.1937, CURRENT_DATE + 20, CURRENT_DATE + 20)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Makeup & Hair Artists
  SELECT id INTO v_category_id FROM categories WHERE name = 'Makeup & Hair Artists' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Bridal Makeup & Hair', 'Wedding day hair and makeup', 'fixed_price', 450.00, NULL, NULL, 'Malibu, CA', '1500 Beauty Blvd', 'Malibu', 'CA', '90265', 'USA', 'Open', 'https://images.pexels.com/photos/3065171/pexels-photo-3065171.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0259, -118.7798, CURRENT_DATE + 50, CURRENT_DATE + 50),
    (v_customer_id, v_category_id, 'Photoshoot Glam Team', 'Hair and makeup for 4-hour shoot', 'quote_based', NULL, 300, 600, 'West Hollywood, CA', '1600 Glam St', 'West Hollywood', 'CA', '90069', 'USA', 'Open', 'https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0900, -118.3617, CURRENT_DATE + 15, CURRENT_DATE + 15)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Furniture Assembly & Installation
  SELECT id INTO v_category_id FROM categories WHERE name = 'Furniture Assembly & Installation' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Assemble IKEA Furniture', 'Assemble 5 pieces of furniture', 'fixed_price', 280.00, NULL, NULL, 'Glendale, CA', '1700 Assembly Ave', 'Glendale', 'CA', '91204', 'USA', 'Open', 'https://images.pexels.com/photos/667838/pexels-photo-667838.jpeg?auto=compress&cs=tinysrgb&w=800', 34.1425, -118.2551, CURRENT_DATE + 6, CURRENT_DATE + 6),
    (v_customer_id, v_category_id, 'Office Furniture Setup', 'Assemble desks and chairs for office', 'quote_based', NULL, 400, 800, 'Burbank, CA', '1800 Office Rd', 'Burbank', 'CA', '91503', 'USA', 'Open', 'https://images.pexels.com/photos/1957477/pexels-photo-1957477.jpeg?auto=compress&cs=tinysrgb&w=800', 34.1808, -118.3090, CURRENT_DATE + 10, CURRENT_DATE + 10)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Barber & Grooming Services  
  SELECT id INTO v_category_id FROM categories WHERE name = 'Barber & Grooming Services' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Mobile Barber Service', 'Haircuts for groomsmen at venue', 'fixed_price', 200.00, NULL, NULL, 'Santa Barbara, CA', '1900 Groom Way', 'Santa Barbara', 'CA', '93103', 'USA', 'Open', 'https://images.pexels.com/photos/1319461/pexels-photo-1319461.jpeg?auto=compress&cs=tinysrgb&w=800', 34.4208, -119.6982, CURRENT_DATE + 35, CURRENT_DATE + 35)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Wedding Planning
  SELECT id INTO v_category_id FROM categories WHERE name = 'Wedding Planning' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Full Wedding Planning', 'Complete wedding planning service for 200 guests', 'quote_based', NULL, 5000, 12000, 'Laguna Beach, CA', '2000 Wedding Ln', 'Laguna Beach', 'CA', '92651', 'USA', 'Open', 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=800', 33.5427, -117.7854, CURRENT_DATE + 180, CURRENT_DATE + 180),
    (v_customer_id, v_category_id, 'Day-of Wedding Coordination', 'Coordinator for wedding day', 'fixed_price', 1500.00, NULL, NULL, 'San Clemente, CA', '2100 Ceremony Dr', 'San Clemente', 'CA', '92672', 'USA', 'Open', 'https://images.pexels.com/photos/1024984/pexels-photo-1024984.jpeg?auto=compress&cs=tinysrgb&w=800', 33.4269, -117.6120, CURRENT_DATE + 90, CURRENT_DATE + 90)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Birthday Party Planners
  SELECT id INTO v_category_id FROM categories WHERE name = 'Birthday Party Planners' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, '50th Birthday Party', 'Plan and coordinate 50th birthday celebration', 'quote_based', NULL, 800, 1500, 'Pasadena, CA', '2200 Party Ln', 'Pasadena', 'CA', '91105', 'USA', 'Open', 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg?auto=compress&cs=tinysrgb&w=800', 34.1478, -118.1445, CURRENT_DATE + 60, CURRENT_DATE + 60),
    (v_customer_id, v_category_id, 'Kids Birthday Party', 'Plan birthday party for 20 kids', 'fixed_price', 600.00, NULL, NULL, 'Irvine, CA', '2300 Fun St', 'Irvine', 'CA', '92603', 'USA', 'Open', 'https://images.pexels.com/photos/1857157/pexels-photo-1857157.jpeg?auto=compress&cs=tinysrgb&w=800', 33.6846, -117.8265, CURRENT_DATE + 45, CURRENT_DATE + 45)
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
