/*
  # Create Comprehensive Demo Listings

  This migration creates complete demo service listings with:
  - High-quality Pexels images
  - Realistic ratings and review counts
  - Complete descriptions
  - Proper pricing
  - Location data
  - Provider information

  All listings will display correctly across:
  - Home screen
  - Category listings
  - Search results
  - Service details
  - Provider profiles
*/

-- Get the provider and category IDs we'll use
DO $$
DECLARE
  provider1_id uuid := 'd48b3ae5-1556-49c1-a9ec-608d7dcda93f';
  provider2_id uuid := '30e7fc07-ae15-460a-a51c-738e0aba580e';
  event_planning_cat uuid;
  catering_cat uuid;
  entertainment_cat uuid;
  decor_cat uuid;
  photography_cat uuid;
  beauty_cat uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO event_planning_cat FROM categories WHERE slug = 'event-planning-coordination' LIMIT 1;
  SELECT id INTO catering_cat FROM categories WHERE slug = 'catering-food-services' LIMIT 1;
  SELECT id INTO entertainment_cat FROM categories WHERE slug = 'entertainment-music' LIMIT 1;
  SELECT id INTO decor_cat FROM categories WHERE slug = 'decor-design-florals' LIMIT 1;
  SELECT id INTO photography_cat FROM categories WHERE slug = 'photography-videography-production' LIMIT 1;
  SELECT id INTO beauty_cat FROM categories WHERE slug = 'beauty-style-personal-services' LIMIT 1;

  -- Event Planning & Coordination Listings
  INSERT INTO service_listings (provider_id, category_id, title, description, base_price, pricing_type, photos, location, latitude, longitude, status, rating_average, rating_count, total_reviews, view_count, save_count, booking_count) VALUES
  (provider1_id, event_planning_cat, 'Professional Wedding Planning Services', 
   'Transform your dream wedding into reality with our comprehensive planning services. We handle every detail from venue selection to vendor coordination, ensuring your special day is perfect. With over 10 years of experience and 200+ successful weddings, we bring creativity, organization, and peace of mind to your celebration.',
   2500, 'Fixed', 
   '["https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/2788488/pexels-photo-2788488.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
   'Los Angeles, CA', 34.0522, -118.2437, 'Active', 4.9, 127, 127, 450, 89, 45),

  (provider2_id, event_planning_cat, 'Corporate Event Management', 
   'Elevate your corporate events with professional management services. From conferences to product launches, we create memorable experiences that align with your brand. Our team excels in logistics, technology integration, and creating engaging attendee experiences.',
   3500, 'Fixed',
   '["https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/1709003/pexels-photo-1709003.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
   'San Francisco, CA', 37.7749, -122.4194, 'Active', 4.8, 92, 92, 320, 67, 38);

  -- Catering & Food Services Listings
  INSERT INTO service_listings (provider_id, category_id, title, description, base_price, pricing_type, photos, location, latitude, longitude, status, rating_average, rating_count, total_reviews, view_count, save_count, booking_count) VALUES
  (provider1_id, catering_cat, 'Gourmet Full-Service Catering', 
   'Experience culinary excellence with our gourmet catering services. Our award-winning chefs create customized menus featuring seasonal ingredients and stunning presentations. Perfect for weddings, corporate events, and special celebrations. We handle everything from menu design to service staff.',
   45, 'Hourly',
   '["https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/2788792/pexels-photo-2788792.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/1410235/pexels-photo-1410235.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
   'Los Angeles, CA', 34.0522, -118.2437, 'Active', 4.7, 156, 156, 520, 103, 67),

  (provider2_id, catering_cat, 'Premium Bartending Services', 
   'Professional bartenders and custom cocktail experiences for your events. We bring premium spirits, creative mixology, and exceptional service. Our team creates signature drinks, manages bars efficiently, and keeps your guests happy throughout the event.',
   55, 'Hourly',
   '["https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/5920742/pexels-photo-5920742.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/2544829/pexels-photo-2544829.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
   'Miami, FL', 25.7617, -80.1918, 'Active', 4.9, 84, 84, 290, 71, 42);

  -- Entertainment & Music Listings
  INSERT INTO service_listings (provider_id, category_id, title, description, base_price, pricing_type, photos, location, latitude, longitude, status, rating_average, rating_count, total_reviews, view_count, save_count, booking_count) VALUES
  (provider1_id, entertainment_cat, 'Professional DJ Services', 
   'Keep your party moving with our professional DJ services! With an extensive music library spanning all genres and decades, state-of-the-art equipment, and over 500 events under our belt, we know how to read the crowd and keep the dance floor packed all night long.',
   800, 'Fixed',
   '["https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
   'New York, NY', 40.7128, -74.0060, 'Active', 4.8, 215, 215, 780, 142, 98),

  (provider2_id, entertainment_cat, 'Live Band Performances', 
   'Bring live music energy to your event with our talented band. We perform everything from jazz and soul to pop and rock, creating an unforgettable atmosphere. Perfect for weddings, corporate events, and private parties. Customizable setlists to match your vision.',
   1200, 'Fixed',
   '["https://images.pexels.com/photos/416778/pexels-photo-416778.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/1466335/pexels-photo-1466335.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
   'Chicago, IL', 41.8781, -87.6298, 'Active', 4.9, 103, 103, 410, 87, 56);

  -- Décor, Design & Florals Listings
  INSERT INTO service_listings (provider_id, category_id, title, description, base_price, pricing_type, photos, location, latitude, longitude, status, rating_average, rating_count, total_reviews, view_count, save_count, booking_count) VALUES
  (provider1_id, decor_cat, 'Luxury Floral Design & Arrangements', 
   'Create breathtaking floral displays for your special event. Our expert florists design custom arrangements using premium flowers, bringing your vision to life. From romantic centerpieces to grand ceremony installations, we transform venues into floral wonderlands.',
   500, 'Fixed',
   '["https://images.pexels.com/photos/1545590/pexels-photo-1545590.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/1395964/pexels-photo-1395964.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
   'Los Angeles, CA', 34.0522, -118.2437, 'Active', 4.9, 178, 178, 590, 134, 89),

  (provider2_id, decor_cat, 'Event Lighting Design', 
   'Transform your venue with professional lighting design. We create stunning ambiance using uplighting, pin spotting, intelligent lighting, and custom effects. Our designs enhance architecture, highlight décor, and set the perfect mood for your celebration.',
   400, 'Fixed',
   '["https://images.pexels.com/photos/2306277/pexels-photo-2306277.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
   'Las Vegas, NV', 36.1699, -115.1398, 'Active', 4.7, 95, 95, 370, 79, 51);

  -- Photography, Videography & Production Listings
  INSERT INTO service_listings (provider_id, category_id, title, description, base_price, pricing_type, photos, location, latitude, longitude, status, rating_average, rating_count, total_reviews, view_count, save_count, booking_count) VALUES
  (provider1_id, photography_cat, 'Professional Event Photography', 
   'Capture every precious moment with our professional photography services. With 15+ years of experience and a keen eye for detail, we document your event beautifully. Receive fully edited high-resolution images within 2 weeks. Packages include engagement shoots and day-of coverage.',
   1500, 'Fixed',
   '["https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/2788488/pexels-photo-2788488.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/442587/pexels-photo-442587.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
   'San Diego, CA', 32.7157, -117.1611, 'Active', 4.9, 234, 234, 890, 189, 112),

  (provider2_id, photography_cat, 'Cinematic Wedding Videography', 
   'Tell your love story with cinematic wedding videography. We create emotional, artistic films that you''ll treasure forever. Using professional equipment and creative techniques, we capture the essence of your day. Includes highlight reel and full ceremony footage.',
   2000, 'Fixed',
   '["https://images.pexels.com/photos/3184317/pexels-photo-3184317.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/326514/pexels-photo-326514.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
   'Austin, TX', 30.2672, -97.7431, 'Active', 4.8, 167, 167, 620, 145, 87);

  -- Beauty, Style & Personal Services Listings
  INSERT INTO service_listings (provider_id, category_id, title, description, base_price, pricing_type, photos, location, latitude, longitude, status, rating_average, rating_count, total_reviews, view_count, save_count, booking_count) VALUES
  (provider1_id, beauty_cat, 'Bridal Hair & Makeup Artistry', 
   'Look absolutely stunning on your special day with our professional bridal beauty services. Our talented artists create flawless makeup and gorgeous hairstyles that last all day. We offer trials, on-location services, and can accommodate your entire bridal party.',
   250, 'Fixed',
   '["https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/3992870/pexels-photo-3992870.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/972995/pexels-photo-972995.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
   'Miami, FL', 25.7617, -80.1918, 'Active', 4.9, 298, 298, 1020, 224, 156),

  (provider2_id, beauty_cat, 'Professional Braiding Services', 
   'Expert braiding services for all hair types and occasions. From intricate cornrows to elegant formal styles, our skilled braiders create beautiful, long-lasting looks. Perfect for weddings, special events, or everyday style. We use quality products and gentle techniques.',
   75, 'Hourly',
   '["https://images.pexels.com/photos/3997379/pexels-photo-3997379.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
   'Atlanta, GA', 33.7490, -84.3880, 'Active', 4.8, 142, 142, 480, 118, 73);

  -- Add more variety across other categories
  INSERT INTO service_listings (provider_id, category_id, title, description, base_price, pricing_type, photos, location, latitude, longitude, status, rating_average, rating_count, total_reviews, view_count, save_count, booking_count) VALUES
  (provider1_id, event_planning_cat, 'Birthday Party Planning for Kids', 
   'Create magical birthday memories for your children! We handle every detail from themed decorations to entertainment, ensuring a stress-free, fun-filled celebration. Popular themes include superheros, princesses, and adventure quests. Packages include games, activities, and party favors.',
   600, 'Fixed',
   '["https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/5869469/pexels-photo-5869469.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/4048094/pexels-photo-4048094.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
   'Houston, TX', 29.7604, -95.3698, 'Active', 4.9, 186, 186, 650, 158, 94),

  (provider2_id, catering_cat, 'Artisan Desserts & Wedding Cakes', 
   'Delight your guests with stunning custom cakes and artisan desserts. Our pastry chefs create edible works of art that taste as amazing as they look. From elegant wedding cakes to dessert tables, we bring sweetness and beauty to your celebration.',
   350, 'Fixed',
   '["https://images.pexels.com/photos/1721932/pexels-photo-1721932.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/2788792/pexels-photo-2788792.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
   'Portland, OR', 45.5152, -122.6784, 'Active', 4.9, 203, 203, 720, 176, 108),

  (provider1_id, entertainment_cat, 'Photo Booth Rental with Props', 
   'Add instant fun to your event with our premium photo booth rental! Features unlimited prints, digital copies, fun props, custom backdrops, and an attendant. Guests love creating memories and taking home instant keepsakes. Perfect for weddings, parties, and corporate events.',
   400, 'Fixed',
   '["https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
   'Seattle, WA', 47.6062, -122.3321, 'Active', 4.8, 134, 134, 490, 112, 68),

  (provider2_id, decor_cat, 'Balloon Décor & Arches', 
   'Transform your venue with stunning balloon installations! From elegant arches to whimsical sculptures, we create Instagram-worthy balloon décor. Using premium balloons in your color scheme, we design centerpieces, columns, garlands, and more. Perfect for all celebrations.',
   300, 'Fixed',
   '["https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/1570810/pexels-photo-1570810.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/3018845/pexels-photo-3018845.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
   'Denver, CO', 39.7392, -104.9903, 'Active', 4.7, 119, 119, 430, 97, 62);

END $$;
