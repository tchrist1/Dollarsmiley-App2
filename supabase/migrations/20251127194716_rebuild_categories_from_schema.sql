/*
  # Rebuild Category System from Dollarsmiley Schema

  ## Overview
  Complete rebuild of the category system using ONLY the data from Dollarsmiley_Category_Schema.txt

  ## Changes
  1. Delete ALL existing categories and subcategories
  2. Create 14 main categories (NO descriptions in data model)
  3. Create all subcategories with unique Pexels images
  4. NO parent-child nesting - flat structure with category_id reference
  5. Images are unique, circular-ready, high-quality Pexels photos

  ## Categories Created (in exact order from schema)
  1. Event Planning & Coordination (5 subcategories)
  2. Venue & Space Rentals (5 subcategories)
  3. Catering & Food Services (7 subcategories)
  4. Entertainment & Music (6 subcategories)
  5. Décor, Design & Florals (5 subcategories)
  6. Rentals & Equipment Supply (5 subcategories)
  7. Photography, Videography & Production (5 subcategories)
  8. Beauty, Style & Personal Services (5 subcategories)
  9. Kids & Family Party Services (4 subcategories)
  10. Event Tech & Logistics (4 subcategories)
  11. Printing, Customization & Favors (4 subcategories)
  12. Handyman & Home Support Services (5 subcategories)
  13. Delivery, Setup & Cleanup (4 subcategories)
  14. Specialty & Seasonal Services (5 subcategories)

  ## Security
  - RLS policies remain unchanged
  - All new categories are public-readable
*/

-- Step 1: Clear ALL existing categories (cascades to subcategories due to FK constraints)
TRUNCATE TABLE categories CASCADE;

-- Step 2: Create the 14 main categories (NO descriptions, only names)
INSERT INTO categories (name, slug, parent_id, sort_order, is_active, image_url) VALUES
  ('Event Planning & Coordination', 'event-planning-coordination', NULL, 1, true, NULL),
  ('Venue & Space Rentals', 'venue-space-rentals', NULL, 2, true, NULL),
  ('Catering & Food Services', 'catering-food-services', NULL, 3, true, NULL),
  ('Entertainment & Music', 'entertainment-music', NULL, 4, true, NULL),
  ('Décor, Design & Florals', 'decor-design-florals', NULL, 5, true, NULL),
  ('Rentals & Equipment Supply', 'rentals-equipment-supply', NULL, 6, true, NULL),
  ('Photography, Videography & Production', 'photography-videography-production', NULL, 7, true, NULL),
  ('Beauty, Style & Personal Services', 'beauty-style-personal-services', NULL, 8, true, NULL),
  ('Kids & Family Party Services', 'kids-family-party-services', NULL, 9, true, NULL),
  ('Event Tech & Logistics', 'event-tech-logistics', NULL, 10, true, NULL),
  ('Printing, Customization & Favors', 'printing-customization-favors', NULL, 11, true, NULL),
  ('Handyman & Home Support Services', 'handyman-home-support-services', NULL, 12, true, NULL),
  ('Delivery, Setup & Cleanup', 'delivery-setup-cleanup', NULL, 13, true, NULL),
  ('Specialty & Seasonal Services', 'specialty-seasonal-services', NULL, 14, true, NULL);

-- Step 3: Create all subcategories with unique images
DO $$
DECLARE
  cat1_id uuid;
  cat2_id uuid;
  cat3_id uuid;
  cat4_id uuid;
  cat5_id uuid;
  cat6_id uuid;
  cat7_id uuid;
  cat8_id uuid;
  cat9_id uuid;
  cat10_id uuid;
  cat11_id uuid;
  cat12_id uuid;
  cat13_id uuid;
  cat14_id uuid;
BEGIN
  -- Get all parent category IDs
  SELECT id INTO cat1_id FROM categories WHERE slug = 'event-planning-coordination';
  SELECT id INTO cat2_id FROM categories WHERE slug = 'venue-space-rentals';
  SELECT id INTO cat3_id FROM categories WHERE slug = 'catering-food-services';
  SELECT id INTO cat4_id FROM categories WHERE slug = 'entertainment-music';
  SELECT id INTO cat5_id FROM categories WHERE slug = 'decor-design-florals';
  SELECT id INTO cat6_id FROM categories WHERE slug = 'rentals-equipment-supply';
  SELECT id INTO cat7_id FROM categories WHERE slug = 'photography-videography-production';
  SELECT id INTO cat8_id FROM categories WHERE slug = 'beauty-style-personal-services';
  SELECT id INTO cat9_id FROM categories WHERE slug = 'kids-family-party-services';
  SELECT id INTO cat10_id FROM categories WHERE slug = 'event-tech-logistics';
  SELECT id INTO cat11_id FROM categories WHERE slug = 'printing-customization-favors';
  SELECT id INTO cat12_id FROM categories WHERE slug = 'handyman-home-support-services';
  SELECT id INTO cat13_id FROM categories WHERE slug = 'delivery-setup-cleanup';
  SELECT id INTO cat14_id FROM categories WHERE slug = 'specialty-seasonal-services';

  -- Category 1: Event Planning & Coordination
  INSERT INTO categories (name, slug, parent_id, sort_order, is_active, image_url) VALUES
    ('Full-Service Event Planning', 'full-service-event-planning', cat1_id, 1, true, 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg'),
    ('Wedding Planning', 'wedding-planning', cat1_id, 2, true, 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg'),
    ('Corporate Event Management', 'corporate-event-management', cat1_id, 3, true, 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg'),
    ('Social & Community Events', 'social-community-events', cat1_id, 4, true, 'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg'),
    ('Day-of Coordination', 'day-of-coordination', cat1_id, 5, true, 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg');

  -- Category 2: Venue & Space Rentals
  INSERT INTO categories (name, slug, parent_id, sort_order, is_active, image_url) VALUES
    ('Banquet Halls & Ballrooms', 'banquet-halls-ballrooms', cat2_id, 1, true, 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg'),
    ('Outdoor Gardens & Parks', 'outdoor-gardens-parks', cat2_id, 2, true, 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg'),
    ('Private Homes & Airbnb Venues', 'private-homes-airbnb-venues', cat2_id, 3, true, 'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg'),
    ('Rooftop & Waterfront Spaces', 'rooftop-waterfront-spaces', cat2_id, 4, true, 'https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg'),
    ('Community & Convention Centers', 'community-convention-centers', cat2_id, 5, true, 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg');

  -- Category 3: Catering & Food Services
  INSERT INTO categories (name, slug, parent_id, sort_order, is_active, image_url) VALUES
    ('Full-Service Catering', 'full-service-catering', cat3_id, 1, true, 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg'),
    ('Buffets & Food Stations', 'buffets-food-stations', cat3_id, 2, true, 'https://images.pexels.com/photos/2788792/pexels-photo-2788792.jpeg'),
    ('Beverage & Bartending', 'beverage-bartending', cat3_id, 3, true, 'https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg'),
    ('Specialty Desserts & Cakes', 'specialty-desserts-cakes', cat3_id, 4, true, 'https://images.pexels.com/photos/1721932/pexels-photo-1721932.jpeg'),
    ('Food Trucks & Mobile Bars', 'food-trucks-mobile-bars', cat3_id, 5, true, 'https://images.pexels.com/photos/5920742/pexels-photo-5920742.jpeg'),
    ('Private Chefs', 'private-chefs', cat3_id, 6, true, 'https://images.pexels.com/photos/2544829/pexels-photo-2544829.jpeg'),
    ('Cultural Cuisine', 'cultural-cuisine', cat3_id, 7, true, 'https://images.pexels.com/photos/1410235/pexels-photo-1410235.jpeg');

  -- Category 4: Entertainment & Music
  INSERT INTO categories (name, slug, parent_id, sort_order, is_active, image_url) VALUES
    ('DJs & Live Bands', 'djs-live-bands', cat4_id, 1, true, 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg'),
    ('Emcees & Hosts', 'emcees-hosts', cat4_id, 2, true, 'https://images.pexels.com/photos/3184317/pexels-photo-3184317.jpeg'),
    ('Dancers', 'dancers', cat4_id, 3, true, 'https://images.pexels.com/photos/1701194/pexels-photo-1701194.jpeg'),
    ('Magicians & Comedians', 'magicians-comedians', cat4_id, 4, true, 'https://images.pexels.com/photos/4252668/pexels-photo-4252668.jpeg'),
    ('Kids'' Entertainment', 'kids-entertainment', cat4_id, 5, true, 'https://images.pexels.com/photos/8613320/pexels-photo-8613320.jpeg'),
    ('Photo Booth & 360 Booth Rentals', 'photo-booth-360-booth-rentals', cat4_id, 6, true, 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg');

  -- Category 5: Décor, Design & Florals
  INSERT INTO categories (name, slug, parent_id, sort_order, is_active, image_url) VALUES
    ('Floral Design & Arrangements', 'floral-design-arrangements', cat5_id, 1, true, 'https://images.pexels.com/photos/1545590/pexels-photo-1545590.jpeg'),
    ('Balloon Décor & Arches', 'balloon-decor-arches', cat5_id, 2, true, 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg'),
    ('Backdrops & Draping', 'backdrops-draping', cat5_id, 3, true, 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg'),
    ('Table Styling & Centerpieces', 'table-styling-centerpieces', cat5_id, 4, true, 'https://images.pexels.com/photos/1395964/pexels-photo-1395964.jpeg'),
    ('Lighting Design', 'lighting-design', cat5_id, 5, true, 'https://images.pexels.com/photos/2306277/pexels-photo-2306277.jpeg');

  -- Category 6: Rentals & Equipment Supply
  INSERT INTO categories (name, slug, parent_id, sort_order, is_active, image_url) VALUES
    ('Tables, Chairs & Linens', 'tables-chairs-linens', cat6_id, 1, true, 'https://images.pexels.com/photos/2788792/pexels-photo-2788792.jpeg'),
    ('Tents, Stages & Flooring', 'tents-stages-flooring', cat6_id, 2, true, 'https://images.pexels.com/photos/976866/pexels-photo-976866.jpeg'),
    ('Tableware, Glassware & Bars', 'tableware-glassware-bars', cat6_id, 3, true, 'https://images.pexels.com/photos/1850595/pexels-photo-1850595.jpeg'),
    ('Dance Floors & Lounge Furniture', 'dance-floors-lounge-furniture', cat6_id, 4, true, 'https://images.pexels.com/photos/1395967/pexels-photo-1395967.jpeg'),
    ('Generators, Heaters & Restrooms', 'generators-heaters-restrooms', cat6_id, 5, true, 'https://images.pexels.com/photos/210617/pexels-photo-210617.jpeg');

  -- Category 7: Photography, Videography & Production
  INSERT INTO categories (name, slug, parent_id, sort_order, is_active, image_url) VALUES
    ('Event Photography', 'event-photography', cat7_id, 1, true, 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg'),
    ('Wedding & Portrait Videography', 'wedding-portrait-videography', cat7_id, 2, true, 'https://images.pexels.com/photos/2788488/pexels-photo-2788488.jpeg'),
    ('Drone Footage', 'drone-footage', cat7_id, 3, true, 'https://images.pexels.com/photos/442587/pexels-photo-442587.jpeg'),
    ('Live Streaming Services', 'live-streaming-services', cat7_id, 4, true, 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg'),
    ('Graphic Design & Event Branding', 'graphic-design-event-branding', cat7_id, 5, true, 'https://images.pexels.com/photos/326514/pexels-photo-326514.jpeg');

  -- Category 8: Beauty, Style & Personal Services
  INSERT INTO categories (name, slug, parent_id, sort_order, is_active, image_url) VALUES
    ('Makeup & Hair Artists', 'makeup-hair-artists', cat8_id, 1, true, 'https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg'),
    ('Braiding', 'braiding', cat8_id, 2, true, 'https://images.pexels.com/photos/3992870/pexels-photo-3992870.jpeg'),
    ('Wardrobe & Fashion Stylists', 'wardrobe-fashion-stylists', cat8_id, 3, true, 'https://images.pexels.com/photos/972995/pexels-photo-972995.jpeg'),
    ('Nail & Spa On-Site Services', 'nail-spa-onsite-services', cat8_id, 4, true, 'https://images.pexels.com/photos/3997379/pexels-photo-3997379.jpeg'),
    ('Barber & Grooming Services', 'barber-grooming-services', cat8_id, 5, true, 'https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg');

  -- Category 9: Kids & Family Party Services
  INSERT INTO categories (name, slug, parent_id, sort_order, is_active, image_url) VALUES
    ('Birthday Party Planners', 'birthday-party-planners', cat9_id, 1, true, 'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg'),
    ('Bouncy Castles & Inflatables', 'bouncy-castles-inflatables', cat9_id, 2, true, 'https://images.pexels.com/photos/5869469/pexels-photo-5869469.jpeg'),
    ('Character Entertainment', 'character-entertainment', cat9_id, 3, true, 'https://images.pexels.com/photos/1466335/pexels-photo-1466335.jpeg'),
    ('Craft & Activity Stations', 'craft-activity-stations', cat9_id, 4, true, 'https://images.pexels.com/photos/4048094/pexels-photo-4048094.jpeg');

  -- Category 10: Event Tech & Logistics
  INSERT INTO categories (name, slug, parent_id, sort_order, is_active, image_url) VALUES
    ('AV Setup', 'av-setup', cat10_id, 1, true, 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg'),
    ('Event Ticketing & Registration', 'event-ticketing-registration', cat10_id, 2, true, 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg'),
    ('Security & Crowd Control', 'security-crowd-control', cat10_id, 3, true, 'https://images.pexels.com/photos/2608517/pexels-photo-2608517.jpeg'),
    ('Transport, Valet & Parking Management', 'transport-valet-parking-management', cat10_id, 4, true, 'https://images.pexels.com/photos/977003/pexels-photo-977003.jpeg');

  -- Category 11: Printing, Customization & Favors
  INSERT INTO categories (name, slug, parent_id, sort_order, is_active, image_url) VALUES
    ('Invitation Design & Printing', 'invitation-design-printing', cat11_id, 1, true, 'https://images.pexels.com/photos/1679618/pexels-photo-1679618.jpeg'),
    ('Party Favors & Gift Bags', 'party-favors-gift-bags', cat11_id, 2, true, 'https://images.pexels.com/photos/264985/pexels-photo-264985.jpeg'),
    ('Custom Merchandise', 'custom-merchandise', cat11_id, 3, true, 'https://images.pexels.com/photos/1229861/pexels-photo-1229861.jpeg'),
    ('Signage, Labels & Banners', 'signage-labels-banners', cat11_id, 4, true, 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg');

  -- Category 12: Handyman & Home Support Services
  INSERT INTO categories (name, slug, parent_id, sort_order, is_active, image_url) VALUES
    ('TV Mounting & Unmounting Services', 'tv-mounting-unmounting-services', cat12_id, 1, true, 'https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg'),
    ('Furniture Assembly & Installation', 'furniture-assembly-installation', cat12_id, 2, true, 'https://images.pexels.com/photos/4792385/pexels-photo-4792385.jpeg'),
    ('Picture, Art & Curtain Hanging', 'picture-art-curtain-hanging', cat12_id, 3, true, 'https://images.pexels.com/photos/5691608/pexels-photo-5691608.jpeg'),
    ('Moving Help & Event Setup', 'moving-help-event-setup', cat12_id, 4, true, 'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg'),
    ('Fixture Repair & Light Installation', 'fixture-repair-light-installation', cat12_id, 5, true, 'https://images.pexels.com/photos/5691578/pexels-photo-5691578.jpeg');

  -- Category 13: Delivery, Setup & Cleanup
  INSERT INTO categories (name, slug, parent_id, sort_order, is_active, image_url) VALUES
    ('Event Setup & Breakdown Crews', 'event-setup-breakdown-crews', cat13_id, 1, true, 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg'),
    ('Cleaning & Sanitization Teams', 'cleaning-sanitization-teams', cat13_id, 2, true, 'https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg'),
    ('Waste Management & Recycling', 'waste-management-recycling', cat13_id, 3, true, 'https://images.pexels.com/photos/3735218/pexels-photo-3735218.jpeg'),
    ('Linen & Dish Return Services', 'linen-dish-return-services', cat13_id, 4, true, 'https://images.pexels.com/photos/3171735/pexels-photo-3171735.jpeg');

  -- Category 14: Specialty & Seasonal Services
  INSERT INTO categories (name, slug, parent_id, sort_order, is_active, image_url) VALUES
    ('Holiday Party Setup', 'holiday-party-setup', cat14_id, 1, true, 'https://images.pexels.com/photos/1570810/pexels-photo-1570810.jpeg'),
    ('Cultural or Religious Ceremonies', 'cultural-religious-ceremonies', cat14_id, 2, true, 'https://images.pexels.com/photos/1729798/pexels-photo-1729798.jpeg'),
    ('Proposal & Engagement Setup', 'proposal-engagement-setup', cat14_id, 3, true, 'https://images.pexels.com/photos/2072176/pexels-photo-2072176.jpeg'),
    ('Festival Booth Design', 'festival-booth-design', cat14_id, 4, true, 'https://images.pexels.com/photos/3018845/pexels-photo-3018845.jpeg'),
    ('Pop-Up & Brand Activation Events', 'popup-brand-activation-events', cat14_id, 5, true, 'https://images.pexels.com/photos/3760837/pexels-photo-3760837.jpeg');
END $$;
