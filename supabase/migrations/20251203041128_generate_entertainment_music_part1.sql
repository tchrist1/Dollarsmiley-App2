/*
  # Generate Entertainment & Music Demo Listings - Part 1
  
  Creates realistic demo listings for:
  - DJs & Live Bands (3 listings)
  - Emcees & Hosts (3 listings)
  - Dancers (3 listings)
*/

DO $$
DECLARE
  demo_provider_id uuid;
  cat_id uuid;
  subcat_id uuid;
BEGIN
  SELECT id INTO demo_provider_id FROM profiles WHERE user_type = 'Admin' LIMIT 1;
  SELECT id INTO cat_id FROM categories WHERE name = 'Entertainment & Music' AND parent_id IS NULL LIMIT 1;
  
  -- DJs & Live Bands
  SELECT id INTO subcat_id FROM categories WHERE name = 'DJs & Live Bands' AND parent_id = cat_id LIMIT 1;
  
  INSERT INTO service_listings (provider_id, category_id, title, description, pricing_type, base_price, city, state, latitude, longitude, photos, rating_average, total_reviews, status)
  VALUES
    (demo_provider_id, subcat_id, 'Elite DJ Entertainment - Professional Mobile DJ Services',
     'Transform your event with our award-winning DJ services! Specializing in weddings, corporate events, and private parties. We bring premium sound systems, intelligent lighting, and an extensive music library spanning all genres.',
     'Fixed', 1500.00, 'New York', 'NY', 40.7128, -74.0060,
     '["https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg", "https://images.pexels.com/photos/1047442/pexels-photo-1047442.jpeg", "https://images.pexels.com/photos/2114365/pexels-photo-2114365.jpeg"]'::jsonb,
     4.9, 387, 'Active'),
    
    (demo_provider_id, subcat_id, 'Live Band Experience - Full Service Wedding & Event Band',
     'Premium live band featuring 5-8 talented musicians performing Top 40, Classic Rock, Motown, Jazz, and more. Perfect for weddings, galas, and upscale events.',
     'Fixed', 4500.00, 'Los Angeles', 'CA', 34.0522, -118.2437,
     '["https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg", "https://images.pexels.com/photos/1267393/pexels-photo-1267393.jpeg", "https://images.pexels.com/photos/1677710/pexels-photo-1677710.jpeg"]'::jsonb,
     4.8, 156, 'Active'),
    
    (demo_provider_id, subcat_id, 'Vibe DJ Co. - Modern EDM & Hip Hop DJ Services',
     'Cutting-edge DJ entertainment specializing in EDM, Hip Hop, and Modern Pop. We bring state-of-the-art Pioneer equipment, custom light shows, and LED walls.',
     'Fixed', 1200.00, 'Chicago', 'IL', 41.8781, -87.6298,
     '["https://images.pexels.com/photos/1916821/pexels-photo-1916821.jpeg", "https://images.pexels.com/photos/2147029/pexels-photo-2147029.jpeg"]'::jsonb,
     4.7, 203, 'Active');
  
  -- Emcees & Hosts
  SELECT id INTO subcat_id FROM categories WHERE name = 'Emcees & Hosts' AND parent_id = cat_id LIMIT 1;
  
  INSERT INTO service_listings (provider_id, category_id, title, description, pricing_type, base_price, city, state, latitude, longitude, photos, rating_average, total_reviews, status)
  VALUES
    (demo_provider_id, subcat_id, 'Professional Event Emcee - Corporate & Wedding Specialist',
     'Experienced emcee and event host with over 15 years hosting weddings, galas, and corporate events. I bring energy, professionalism, and seamless flow to your special day.',
     'Fixed', 800.00, 'Houston', 'TX', 29.7604, -95.3698,
     '["https://images.pexels.com/photos/1157557/pexels-photo-1157557.jpeg", "https://images.pexels.com/photos/2306703/pexels-photo-2306703.jpeg"]'::jsonb,
     4.9, 421, 'Active'),
    
    (demo_provider_id, subcat_id, 'Bilingual MC Services - English & Spanish Event Hosting',
     'Fluently bilingual emcee specializing in multicultural weddings and corporate events. I seamlessly switch between English and Spanish to ensure all your guests feel included.',
     'Fixed', 950.00, 'Phoenix', 'AZ', 33.4484, -112.0740,
     '["https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg", "https://images.pexels.com/photos/3184296/pexels-photo-3184296.jpeg"]'::jsonb,
     4.8, 267, 'Active'),
    
    (demo_provider_id, subcat_id, 'Comedy Host & MC - Entertainment-Focused Event Hosting',
     'Stand-up comedian and professional host bringing laughs and energy to your event! Perfect for corporate dinners and celebrations.',
     'Fixed', 1100.00, 'Philadelphia', 'PA', 39.9526, -75.1652,
     '["https://images.pexels.com/photos/1587927/pexels-photo-1587927.jpeg", "https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg"]'::jsonb,
     4.7, 189, 'Active');
  
  -- Dancers
  SELECT id INTO subcat_id FROM categories WHERE name = 'Dancers' AND parent_id = cat_id LIMIT 1;
  
  INSERT INTO service_listings (provider_id, category_id, title, description, pricing_type, base_price, city, state, latitude, longitude, photos, rating_average, total_reviews, status)
  VALUES
    (demo_provider_id, subcat_id, 'Elite Dance Troupe - Professional Performance Group',
     'Professional dance company offering stunning performances for weddings, galas, and corporate events. Our versatile troupe performs contemporary, jazz, Latin, and cultural dances.',
     'Fixed', 2800.00, 'New York', 'NY', 40.7128, -74.0060,
     '["https://images.pexels.com/photos/3621953/pexels-photo-3621953.jpeg", "https://images.pexels.com/photos/3621954/pexels-photo-3621954.jpeg"]'::jsonb,
     4.9, 234, 'Active'),
    
    (demo_provider_id, subcat_id, 'Cultural Dance Performers - Traditional & Folk Dance',
     'Authentic cultural dance performances celebrating traditions from around the world. Specializing in Indian classical, African, Irish step dancing, and Latin performances.',
     'Fixed', 1500.00, 'San Diego', 'CA', 32.7157, -117.1611,
     '["https://images.pexels.com/photos/1679618/pexels-photo-1679618.jpeg", "https://images.pexels.com/photos/3621951/pexels-photo-3621951.jpeg"]'::jsonb,
     4.8, 178, 'Active'),
    
    (demo_provider_id, subcat_id, 'LED & Fire Performers - Spectacular Visual Entertainment',
     'Mesmerizing LED and fire dance performances that will leave your guests speechless! Perfect for upscale events and celebrations.',
     'Fixed', 1800.00, 'Dallas', 'TX', 32.7767, -96.7970,
     '["https://images.pexels.com/photos/2102587/pexels-photo-2102587.jpeg", "https://images.pexels.com/photos/1047442/pexels-photo-1047442.jpeg"]'::jsonb,
     4.7, 145, 'Active');

END $$;
