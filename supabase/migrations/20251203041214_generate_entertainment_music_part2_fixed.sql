/*
  # Generate Entertainment & Music Demo Listings - Part 2
  
  Creates realistic demo listings for:
  - Magicians & Comedians (3 listings)
  - Kids' Entertainment (3 listings)
  - Photo Booth & 360 Booth Rentals (3 listings)
*/

DO $$
DECLARE
  demo_provider_id uuid;
  cat_id uuid;
  subcat_id uuid;
BEGIN
  SELECT id INTO demo_provider_id FROM profiles WHERE user_type = 'Admin' LIMIT 1;
  SELECT id INTO cat_id FROM categories WHERE name = 'Entertainment & Music' AND parent_id IS NULL LIMIT 1;
  
  -- Magicians & Comedians
  SELECT id INTO subcat_id FROM categories WHERE name = 'Magicians & Comedians' AND parent_id = cat_id LIMIT 1;
  
  INSERT INTO service_listings (provider_id, category_id, title, description, pricing_type, base_price, city, state, latitude, longitude, photos, rating_average, total_reviews, status)
  VALUES
    (demo_provider_id, subcat_id, 'Professional Close-Up & Stage Magician',
     'Award-winning magician specializing in close-up magic, stage illusions, and corporate entertainment. I perform mind-blowing sleight of hand and mentalism.',
     'Fixed', 1200.00, 'Austin', 'TX', 30.2672, -97.7431,
     '["https://images.pexels.com/photos/4226256/pexels-photo-4226256.jpeg", "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg"]'::jsonb,
     4.8, 312, 'Active'),
    
    (demo_provider_id, subcat_id, 'Stand-Up Comedian - Clean Corporate Entertainment',
     'Professional stand-up comedian with 10+ years experience. I specialize in clean, intelligent humor perfect for all audiences.',
     'Fixed', 1500.00, 'San Jose', 'CA', 37.3382, -121.8863,
     '["https://images.pexels.com/photos/1587927/pexels-photo-1587927.jpeg", "https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg"]'::jsonb,
     4.9, 267, 'Active'),
    
    (demo_provider_id, subcat_id, 'Illusionist & Mentalist - Mind-Reading Entertainment',
     'Cutting-edge mentalist and illusionist combining psychology, magic, and showmanship. Featured on national television.',
     'Fixed', 2200.00, 'Charlotte', 'NC', 35.2271, -80.8431,
     '["https://images.pexels.com/photos/4226256/pexels-photo-4226256.jpeg", "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg"]'::jsonb,
     4.8, 198, 'Active');
  
  -- Kids' Entertainment
  SELECT id INTO subcat_id FROM categories WHERE name = E'Kids\' Entertainment' AND parent_id = cat_id LIMIT 1;
  
  INSERT INTO service_listings (provider_id, category_id, title, description, pricing_type, base_price, city, state, latitude, longitude, photos, rating_average, total_reviews, status)
  VALUES
    (demo_provider_id, subcat_id, 'Kids Party Entertainment - Games, Magic & Face Painting',
     'Professional children entertainer bringing non-stop fun to birthday parties! Services include interactive games, balloon twisting, face painting, and magic tricks.',
     'Fixed', 350.00, 'Jacksonville', 'FL', 30.3322, -81.6557,
     '["https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg", "https://images.pexels.com/photos/1684149/pexels-photo-1684149.jpeg"]'::jsonb,
     4.9, 445, 'Active'),
    
    (demo_provider_id, subcat_id, 'Puppet Show & Storytelling for Kids',
     'Engaging puppet show and interactive storytelling perfect for young children. Programs include classic fairy tales and educational themes.',
     'Fixed', 300.00, 'Columbus', 'OH', 39.9612, -82.9988,
     '["https://images.pexels.com/photos/8613089/pexels-photo-8613089.jpeg", "https://images.pexels.com/photos/1684149/pexels-photo-1684149.jpeg"]'::jsonb,
     4.7, 234, 'Active'),
    
    (demo_provider_id, subcat_id, 'Science Show & Educational Entertainment for Kids',
     'Interactive science show bringing WOW moments to children events! I perform exciting experiments with slime, bubbles, and rockets.',
     'Fixed', 450.00, 'Fort Worth', 'TX', 32.7555, -97.3308,
     '["https://images.pexels.com/photos/8613089/pexels-photo-8613089.jpeg", "https://images.pexels.com/photos/2781814/pexels-photo-2781814.jpeg"]'::jsonb,
     4.8, 289, 'Active');
  
  -- Photo Booth & 360 Booth Rentals
  SELECT id INTO subcat_id FROM categories WHERE name = 'Photo Booth & 360 Booth Rentals' AND parent_id = cat_id LIMIT 1;
  
  INSERT INTO service_listings (provider_id, category_id, title, description, pricing_type, base_price, city, state, latitude, longitude, photos, rating_average, total_reviews, status)
  VALUES
    (demo_provider_id, subcat_id, '360 Photo Booth - Modern Spin Cam Experience',
     'State-of-the-art 360-degree video booth creating viral-worthy content! Our platform captures slow-motion video from every angle with LED ring lights.',
     'Fixed', 1200.00, 'New York', 'NY', 40.7128, -74.0060,
     '["https://images.pexels.com/photos/8761732/pexels-photo-8761732.jpeg", "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg"]'::jsonb,
     4.9, 367, 'Active'),
    
    (demo_provider_id, subcat_id, 'Premium Photo Booth - Open Air & Backdrop Options',
     'Professional open-air photo booth with modern DSLR camera, lighting, and unlimited prints. Includes custom backdrop, props, and digital gallery.',
     'Fixed', 800.00, 'Los Angeles', 'CA', 34.0522, -118.2437,
     '["https://images.pexels.com/photos/8761732/pexels-photo-8761732.jpeg", "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg"]'::jsonb,
     4.8, 423, 'Active'),
    
    (demo_provider_id, subcat_id, 'Mirror Photo Booth - Interactive Touchscreen Experience',
     'Stunning magic mirror photo booth featuring a full-length interactive touchscreen. Guests see animated prompts and effects.',
     'Fixed', 1000.00, 'Chicago', 'IL', 41.8781, -87.6298,
     '["https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg", "https://images.pexels.com/photos/8761732/pexels-photo-8761732.jpeg"]'::jsonb,
     4.7, 298, 'Active');

END $$;
