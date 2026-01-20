/*
  # Add More Demo Jobs

  1. Purpose
    - Populate marketplace with 40+ diverse jobs
    - Cover all major categories
    - Mix of fixed_price and quote_based

  2. Changes
    - Add jobs across remaining categories
    - Ensure good geographic distribution
    - Vary pricing and timelines
*/

DO $$
DECLARE
  v_customer_id UUID;
  v_category_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM profiles WHERE user_type = 'Customer' LIMIT 1;

  -- Painting Jobs
  SELECT id INTO v_category_id FROM categories WHERE name = 'Painting' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Interior House Painting', 'Paint 3 bedrooms and living room', 'quote_based', NULL, 1200, 2000, 'Los Angeles, CA', '400 Paint St', 'Los Angeles', 'CA', '90020', 'USA', 'Open', 'https://images.pexels.com/photos/1669754/pexels-photo-1669754.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0522, -118.2437, CURRENT_DATE + 10, CURRENT_DATE + 12),
    (v_customer_id, v_category_id, 'Exterior House Painting', 'Full exterior repaint of 2-story home', 'fixed_price', 4500.00, NULL, NULL, 'Santa Barbara, CA', '500 Coastal Dr', 'Santa Barbara', 'CA', '93101', 'USA', 'Open', 'https://images.pexels.com/photos/1669799/pexels-photo-1669799.jpeg?auto=compress&cs=tinysrgb&w=800', 34.4208, -119.6982, CURRENT_DATE + 20, CURRENT_DATE + 25)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Carpentry Jobs
  SELECT id INTO v_category_id FROM categories WHERE name = 'Carpentry' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Custom Bookshelf Installation', 'Build and install floor-to-ceiling bookshelves', 'fixed_price', 1800.00, NULL, NULL, 'Irvine, CA', '600 Library Ln', 'Irvine', 'CA', '92602', 'USA', 'Open', 'https://images.pexels.com/photos/667838/pexels-photo-667838.jpeg?auto=compress&cs=tinysrgb&w=800', 33.6846, -117.8265, CURRENT_DATE + 15, CURRENT_DATE + 17),
    (v_customer_id, v_category_id, 'Deck Repair and Staining', 'Repair and stain outdoor deck', 'quote_based', NULL, 800, 1500, 'San Diego, CA', '700 Deck Ave', 'San Diego', 'CA', '92103', 'USA', 'Open', 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800', 32.7157, -117.1611, CURRENT_DATE + 8, CURRENT_DATE + 10)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Electrical Jobs
  SELECT id INTO v_category_id FROM categories WHERE name = 'Electrical' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Install Ceiling Fan', 'Install new ceiling fan in bedroom', 'fixed_price', 250.00, NULL, NULL, 'Anaheim, CA', '800 Electric Ave', 'Anaheim', 'CA', '92805', 'USA', 'Open', 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&w=800', 33.8366, -117.9143, CURRENT_DATE + 5, CURRENT_DATE + 5),
    (v_customer_id, v_category_id, 'Electrical Panel Upgrade', 'Upgrade 100A to 200A panel', 'quote_based', NULL, 1500, 2500, 'Long Beach, CA', '900 Power St', 'Long Beach', 'CA', '90803', 'USA', 'Open', 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=800', 33.7701, -118.1937, CURRENT_DATE + 12, CURRENT_DATE + 13)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Landscaping Jobs
  SELECT id INTO v_category_id FROM categories WHERE name = 'Landscaping' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Backyard Landscaping Design', 'Complete backyard makeover with plants and pavers', 'quote_based', NULL, 3000, 6000, 'Newport Beach, CA', '1000 Garden Way', 'Newport Beach', 'CA', '92660', 'USA', 'Open', 'https://images.pexels.com/photos/1453499/pexels-photo-1453499.jpeg?auto=compress&cs=tinysrgb&w=800', 33.6189, -117.9289, CURRENT_DATE + 30, CURRENT_DATE + 45),
    (v_customer_id, v_category_id, 'Monthly Lawn Maintenance', 'Regular mowing, edging, and trimming', 'fixed_price', 150.00, NULL, NULL, 'Thousand Oaks, CA', '1100 Lawn Dr', 'Thousand Oaks', 'CA', '91360', 'USA', 'Open', 'https://images.pexels.com/photos/589/garden-grass-meadow-green.jpg?auto=compress&cs=tinysrgb&w=800', 34.1706, -118.8376, CURRENT_DATE + 7, CURRENT_DATE + 7)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Moving Services Jobs
  SELECT id INTO v_category_id FROM categories WHERE name = 'Moving Services' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Local Move - 2 Bedroom Apartment', 'Move within same city, need 2 movers', 'quote_based', NULL, 400, 800, 'Santa Monica, CA', '1200 Moving Blvd', 'Santa Monica', 'CA', '90404', 'USA', 'Open', 'https://images.pexels.com/photos/4246120/pexels-photo-4246120.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0195, -118.4912, CURRENT_DATE + 14, CURRENT_DATE + 14),
    (v_customer_id, v_category_id, 'Long Distance Move to San Francisco', 'Move 3-bedroom house to SF', 'fixed_price', 3500.00, NULL, NULL, 'Los Angeles, CA', '1300 Transit Way', 'Los Angeles', 'CA', '90025', 'USA', 'Open', 'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0522, -118.2437, CURRENT_DATE + 40, CURRENT_DATE + 42)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Catering Jobs
  SELECT id INTO v_category_id FROM categories WHERE name = 'Catering' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Wedding Catering for 150 Guests', 'Full service catering with servers', 'quote_based', NULL, 4000, 8000, 'Malibu, CA', '1400 Beach Rd', 'Malibu', 'CA', '90265', 'USA', 'Open', 'https://images.pexels.com/photos/1395964/pexels-photo-1395964.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0259, -118.7798, CURRENT_DATE + 60, CURRENT_DATE + 60),
    (v_customer_id, v_category_id, 'Corporate Lunch Catering', 'Lunch for 50 people, office delivery', 'fixed_price', 1200.00, NULL, NULL, 'Downtown LA, CA', '1500 Business St', 'Downtown LA', 'CA', '90014', 'USA', 'Open', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0407, -118.2468, CURRENT_DATE + 21, CURRENT_DATE + 21)
    ON CONFLICT DO NOTHING;
  END IF;

  -- DJ Services Jobs
  SELECT id INTO v_category_id FROM categories WHERE name = 'DJ Services' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Wedding DJ - 5 Hours', 'Professional DJ for wedding reception', 'fixed_price', 1200.00, NULL, NULL, 'Santa Barbara, CA', '1600 Music Ln', 'Santa Barbara', 'CA', '93102', 'USA', 'Open', 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800', 34.4208, -119.6982, CURRENT_DATE + 45, CURRENT_DATE + 45),
    (v_customer_id, v_category_id, 'Birthday Party DJ', 'DJ for 21st birthday party', 'quote_based', NULL, 400, 800, 'Pasadena, CA', '1700 Party Ave', 'Pasadena', 'CA', '91106', 'USA', 'Open', 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800', 34.1478, -118.1445, CURRENT_DATE + 25, CURRENT_DATE + 25)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Auto Repair Jobs
  SELECT id INTO v_category_id FROM categories WHERE name = 'Auto Repair' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Brake Pad Replacement', 'Replace front and rear brake pads', 'fixed_price', 450.00, NULL, NULL, 'Glendale, CA', '1800 Auto Dr', 'Glendale', 'CA', '91204', 'USA', 'Open', 'https://images.pexels.com/photos/3806288/pexels-photo-3806288.jpeg?auto=compress&cs=tinysrgb&w=800', 34.1425, -118.2551, CURRENT_DATE + 3, CURRENT_DATE + 3),
    (v_customer_id, v_category_id, 'Full Car Detailing', 'Interior and exterior detail', 'quote_based', NULL, 150, 300, 'Burbank, CA', '1900 Shine Blvd', 'Burbank', 'CA', '91503', 'USA', 'Open', 'https://images.pexels.com/photos/3354648/pexels-photo-3354648.jpeg?auto=compress&cs=tinysrgb&w=800', 34.1808, -118.3090, CURRENT_DATE + 5, CURRENT_DATE + 5)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Music Lessons Jobs
  SELECT id INTO v_category_id FROM categories WHERE name = 'Music Lessons' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Piano Lessons for Beginner', '8 weekly lessons for adult beginner', 'fixed_price', 480.00, NULL, NULL, 'Westwood, CA', '2000 Music Row', 'Westwood', 'CA', '90025', 'USA', 'Open', 'https://images.pexels.com/photos/164743/pexels-photo-164743.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0633, -118.4455, CURRENT_DATE + 14, CURRENT_DATE + 70),
    (v_customer_id, v_category_id, 'Guitar Lessons - Intermediate', 'Improve guitar skills, 10 sessions', 'quote_based', NULL, 400, 700, 'Venice, CA', '2100 Guitar St', 'Venice', 'CA', '90292', 'USA', 'Open', 'https://images.pexels.com/photos/1407322/pexels-photo-1407322.jpeg?auto=compress&cs=tinysrgb&w=800', 33.9850, -118.4695, CURRENT_DATE + 21, CURRENT_DATE + 91)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Handyman Jobs
  SELECT id INTO v_category_id FROM categories WHERE name = 'Handyman' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'General Home Repairs', 'Fix door handles, patch drywall, minor repairs', 'quote_based', NULL, 200, 500, 'Torrance, CA', '2200 Fix It Ln', 'Torrance', 'CA', '90501', 'USA', 'Open', 'https://images.pexels.com/photos/4792486/pexels-photo-4792486.jpeg?auto=compress&cs=tinysrgb&w=800', 33.8358, -118.3406, CURRENT_DATE + 6, CURRENT_DATE + 7),
    (v_customer_id, v_category_id, 'Install Shelving Units', 'Install 3 wall-mounted shelving units', 'fixed_price', 180.00, NULL, NULL, 'Culver City, CA', '2300 Shelf Ave', 'Culver City', 'CA', '90231', 'USA', 'Open', 'https://images.pexels.com/photos/5691621/pexels-photo-5691621.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0211, -118.3965, CURRENT_DATE + 4, CURRENT_DATE + 4)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Yoga Instruction Jobs
  SELECT id INTO v_category_id FROM categories WHERE name = 'Yoga Instruction' LIMIT 1;
  IF v_category_id IS NOT NULL THEN
    INSERT INTO jobs (customer_id, category_id, title, description, pricing_type, fixed_price, budget_min, budget_max, location, street_address, city, state, zip_code, country, status, featured_image_url, latitude, longitude, execution_date_start, execution_date_end)
    VALUES
    (v_customer_id, v_category_id, 'Private Yoga Sessions', '10 private yoga sessions at home', 'fixed_price', 800.00, NULL, NULL, 'Santa Monica, CA', '2400 Zen Way', 'Santa Monica', 'CA', '90403', 'USA', 'Open', 'https://images.pexels.com/photos/3822906/pexels-photo-3822906.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0195, -118.4912, CURRENT_DATE + 14, CURRENT_DATE + 56),
    (v_customer_id, v_category_id, 'Corporate Yoga Classes', 'Weekly yoga class for office team', 'quote_based', NULL, 600, 1000, 'Downtown LA, CA', '2500 Wellness St', 'Downtown LA', 'CA', '90015', 'USA', 'Open', 'https://images.pexels.com/photos/3822906/pexels-photo-3822906.jpeg?auto=compress&cs=tinysrgb&w=800', 34.0407, -118.2468, CURRENT_DATE + 21, CURRENT_DATE + 21)
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
