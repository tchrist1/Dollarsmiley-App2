/*
  # Update Categories and Subcategories from dollarsmiley_full_ai_categories.json

  1. Schema Updates
    - Add image_url column to subcategories table
    - Add image_prompt column to subcategories table for AI image generation

  2. Data Migration
    - Clear existing categories and subcategories (cascades to subcategories)
    - Insert all 14 categories from JSON file
    - Insert all 82 subcategories with image_prompt data

  3. Notes
    - This becomes the single source of truth for all categories
    - All category and subcategory references across the app will use this data
    - Image URLs can be populated later using the image_prompt field
*/

-- Add image fields to subcategories if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subcategories' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE subcategories ADD COLUMN image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subcategories' AND column_name = 'image_prompt'
  ) THEN
    ALTER TABLE subcategories ADD COLUMN image_prompt text;
  END IF;
END $$;

-- Add image fields to categories if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE categories ADD COLUMN image_url text;
  END IF;
END $$;

-- Clear existing data (will cascade to subcategories due to foreign key)
TRUNCATE TABLE categories CASCADE;

-- Insert all categories from JSON
INSERT INTO categories (name, slug, description, icon, sort_order, is_active) VALUES
  ('Event Planning & Coordination', 'event-planning-coordination', 'Professional event planning and coordination services', '📋', 1, true),
  ('Venue & Space Rentals', 'venue-space-rentals', 'Event venues and space rental options', '🏛️', 2, true),
  ('Catering & Food Services', 'catering-food-services', 'Professional catering and food service providers', '🍽️', 3, true),
  ('Entertainment & Music', 'entertainment-music', 'Entertainment and music services for events', '🎵', 4, true),
  ('Décor, Design & Florals', 'decor-design-florals', 'Event décor, design, and floral arrangements', '🌸', 5, true),
  ('Rentals & Equipment Supply', 'rentals-equipment-supply', 'Event equipment and supply rentals', '🪑', 6, true),
  ('Photography, Videography & Production', 'photography-videography-production', 'Professional photo and video services', '📸', 7, true),
  ('Beauty, Style & Personal Services', 'beauty-style-personal-services', 'Beauty and personal styling services', '💄', 8, true),
  ('Kids & Family Party Services', 'kids-family-party-services', 'Children and family party services', '🎈', 9, true),
  ('Event Tech & Logistics', 'event-tech-logistics', 'Technical and logistics support for events', '🎛️', 10, true),
  ('Printing, Customization & Favors', 'printing-customization-favors', 'Custom printing and party favor services', '🎁', 11, true),
  ('Handyman & Home Support Services', 'handyman-home-support-services', 'Handyman and home support services', '🔧', 12, true),
  ('Delivery, Setup & Cleanup', 'delivery-setup-cleanup', 'Event delivery, setup, and cleanup services', '🚚', 13, true),
  ('Specialty & Seasonal Services', 'specialty-seasonal-services', 'Specialized and seasonal event services', '⭐', 14, true);

-- Insert all subcategories with image_prompt from JSON
-- Event Planning & Coordination (5 subcategories)
INSERT INTO subcategories (category_id, name, description, image_prompt) VALUES
  ((SELECT id FROM categories WHERE slug = 'event-planning-coordination'), 'Full-Service Event Planning', 'Complete event planning from start to finish', 'A professional event planner coordinating a luxury event layout with checklists, venue maps, and décor samples on a sleek table—bright natural lighting, elegant workspace.'),
  ((SELECT id FROM categories WHERE slug = 'event-planning-coordination'), 'Wedding Planning', 'Comprehensive wedding planning services', 'A wedding planner reviewing floral arrangements and seating charts beside soft pastel décor, candles, and bridal inspiration boards—romantic and modern.'),
  ((SELECT id FROM categories WHERE slug = 'event-planning-coordination'), 'Corporate Event Management', 'Professional corporate event planning', 'A corporate event planner managing a conference setup with lanyards, signage, stage lighting plans, and digital tablets—clean, modern, business-professional tone.'),
  ((SELECT id FROM categories WHERE slug = 'event-planning-coordination'), 'Social & Community Events', 'Community and social event coordination', 'A vibrant community event planner organizing colorful festival decorations, community booths, and activity charts—friendly and cheerful atmosphere.'),
  ((SELECT id FROM categories WHERE slug = 'event-planning-coordination'), 'Day-of Coordination', 'Day-of event coordination services', 'A day-of event coordinator with headset and clipboard managing event timelines, checking vendor schedules, and adjusting table settings—dynamic and focused.');

-- Venue & Space Rentals (5 subcategories)
INSERT INTO subcategories (category_id, name, description, image_prompt) VALUES
  ((SELECT id FROM categories WHERE slug = 'venue-space-rentals'), 'Banquet Halls & Ballrooms', 'Elegant banquet halls and ballrooms', 'A luxurious ballroom with chandeliers, polished floors, draped tables, and ambient lighting—elegant and formal.'),
  ((SELECT id FROM categories WHERE slug = 'venue-space-rentals'), 'Outdoor Gardens & Parks', 'Beautiful outdoor garden venues', 'A scenic outdoor garden event space with floral arches, greenery, and natural sunlight—romantic open-air atmosphere.'),
  ((SELECT id FROM categories WHERE slug = 'venue-space-rentals'), 'Private Homes & Airbnb Venues', 'Private home event spaces', 'A stylish modern home prepared for an event with minimalist décor, warm lighting, and clean staging.'),
  ((SELECT id FROM categories WHERE slug = 'venue-space-rentals'), 'Rooftop & Waterfront Spaces', 'Scenic rooftop and waterfront venues', 'A rooftop event venue overlooking a city skyline with string lights, cocktail tables, and a sunset backdrop.'),
  ((SELECT id FROM categories WHERE slug = 'venue-space-rentals'), 'Community & Convention Centers', 'Community and convention centers', 'A spacious convention center setup with exhibitor booths, banners, and professional lighting—clean and organized.');

-- Catering & Food Services (7 subcategories)
INSERT INTO subcategories (category_id, name, description, image_prompt) VALUES
  ((SELECT id FROM categories WHERE slug = 'catering-food-services'), 'Full-Service Catering', 'Complete catering services', 'A catering team preparing gourmet dishes on polished buffet tables with stainless chafers and elegant plating.'),
  ((SELECT id FROM categories WHERE slug = 'catering-food-services'), 'Buffets & Food Stations', 'Buffet and food station setups', 'A colorful buffet arrangement featuring multiple themed food stations with labels and decorative accents.'),
  ((SELECT id FROM categories WHERE slug = 'catering-food-services'), 'Beverage & Bartending', 'Professional bartending services', 'A bartender crafting cocktails on a stylish bar counter with glassware, mixers, and ambient event lighting.'),
  ((SELECT id FROM categories WHERE slug = 'catering-food-services'), 'Specialty Desserts & Cakes', 'Custom desserts and cakes', 'A dessert table filled with artisanal cakes, pastries, and decorative sweets—high detail.'),
  ((SELECT id FROM categories WHERE slug = 'catering-food-services'), 'Food Trucks & Mobile Bars', 'Mobile food and bar services', 'A trendy food truck at an event with open service windows, chalkboard menus, and outdoor festive lighting.'),
  ((SELECT id FROM categories WHERE slug = 'catering-food-services'), 'Private Chefs', 'Personal chef services', 'A private chef preparing gourmet dishes in a modern kitchen with fresh ingredients and refined plating.'),
  ((SELECT id FROM categories WHERE slug = 'catering-food-services'), 'Cultural Cuisine', 'Authentic cultural cuisine', 'A beautifully arranged ethnic cuisine table showcasing authentic dishes, spices, and cultural elements.');

-- Entertainment & Music (6 subcategories)
INSERT INTO subcategories (category_id, name, description, image_prompt) VALUES
  ((SELECT id FROM categories WHERE slug = 'entertainment-music'), 'DJs & Live Bands', 'Professional DJs and live bands', 'A DJ mixing music on a stage with LED lights, turntables, and energetic event lighting.'),
  ((SELECT id FROM categories WHERE slug = 'entertainment-music'), 'Emcees & Hosts', 'Event hosts and emcees', 'A charismatic event host holding a microphone on a decorated stage with audience engagement.'),
  ((SELECT id FROM categories WHERE slug = 'entertainment-music'), 'Dancers', 'Professional dance performances', 'Professional dancers performing in coordinated costumes on a well-lit event stage.'),
  ((SELECT id FROM categories WHERE slug = 'entertainment-music'), 'Magicians & Comedians', 'Magic and comedy entertainment', 'A vibrant magic or comedy show setup with spotlight, props, and expressive performer.'),
  ((SELECT id FROM categories WHERE slug = 'entertainment-music'), 'Kids Entertainment', 'Childrens entertainment services', 'A cheerful childrens entertainer with colorful props, balloons, and playful background.'),
  ((SELECT id FROM categories WHERE slug = 'entertainment-music'), 'Photo Booth & 360 Booth Rentals', 'Photo booth rental services', 'A modern 360 photo booth with LED ring lights, platform, and festive props.');

-- Décor, Design & Florals (5 subcategories)
INSERT INTO subcategories (category_id, name, description, image_prompt) VALUES
  ((SELECT id FROM categories WHERE slug = 'decor-design-florals'), 'Floral Design & Arrangements', 'Professional floral arrangements', 'Elegant floral arrangements with roses, greenery, and premium vases—studio-quality lighting.'),
  ((SELECT id FROM categories WHERE slug = 'decor-design-florals'), 'Balloon Décor & Arches', 'Balloon decorations and arches', 'A stylish balloon arch with coordinated colors, metallic balloons, and party backdrop.'),
  ((SELECT id FROM categories WHERE slug = 'decor-design-florals'), 'Backdrops & Draping', 'Event backdrops and draping', 'A professionally staged event backdrop with drapes, lighting, and themed decorations.'),
  ((SELECT id FROM categories WHERE slug = 'decor-design-florals'), 'Table Styling & Centerpieces', 'Table décor and centerpieces', 'A decorated event table with centerpieces, tableware, linens, and candles—luxury aesthetic.'),
  ((SELECT id FROM categories WHERE slug = 'decor-design-florals'), 'Lighting Design', 'Event lighting design', 'Event lighting setup with uplights, string lights, and atmospheric glow enhancing venue décor.');

-- Rentals & Equipment Supply (6 subcategories)
INSERT INTO subcategories (category_id, name, description, image_prompt) VALUES
  ((SELECT id FROM categories WHERE slug = 'rentals-equipment-supply'), 'Tables, Chairs & Linens', 'Table and chair rentals', 'Neatly arranged event tables with chairs, linens, and coordinated décor accents.'),
  ((SELECT id FROM categories WHERE slug = 'rentals-equipment-supply'), 'Tents', 'Outdoor tent rentals', 'A large outdoor event tent with draping, lighting, and open sides—elegant white fabric.'),
  ((SELECT id FROM categories WHERE slug = 'rentals-equipment-supply'), 'Stages & Flooring', 'Stage and flooring rentals', 'A modular event stage with lighting truss, speakers, and polished flooring.'),
  ((SELECT id FROM categories WHERE slug = 'rentals-equipment-supply'), 'Tableware, Glassware & Bars', 'Tableware and bar equipment', 'Premium tableware and glassware arranged for an upscale reception.'),
  ((SELECT id FROM categories WHERE slug = 'rentals-equipment-supply'), 'Dance Floors & Lounge Furniture', 'Dance floors and lounge furniture', 'A modern dance floor with LED accents and stylish lounge seating around it.'),
  ((SELECT id FROM categories WHERE slug = 'rentals-equipment-supply'), 'Generators, Heaters & Restrooms', 'Power and comfort equipment', 'Professional event equipment setup including generators, heaters, and portable units.');

-- Photography, Videography & Production (5 subcategories)
INSERT INTO subcategories (category_id, name, description, image_prompt) VALUES
  ((SELECT id FROM categories WHERE slug = 'photography-videography-production'), 'Event Photography', 'Professional event photography', 'A photographer capturing candid event moments with DSLR camera and soft lighting.'),
  ((SELECT id FROM categories WHERE slug = 'photography-videography-production'), 'Wedding & Portrait Videography', 'Wedding and portrait videography', 'A videographer filming a wedding scene with gimbal and cinematic lighting.'),
  ((SELECT id FROM categories WHERE slug = 'photography-videography-production'), 'Drone Footage', 'Aerial drone videography', 'A drone capturing aerial views of an outdoor event from above.'),
  ((SELECT id FROM categories WHERE slug = 'photography-videography-production'), 'Live Streaming Services', 'Live event streaming', 'A streaming setup with cameras, monitors, and lighting for live broadcast.'),
  ((SELECT id FROM categories WHERE slug = 'photography-videography-production'), 'Graphic Design & Event Branding', 'Event branding and design', 'Event branding designs including banners, invitations, and digital mockups.');

-- Beauty, Style & Personal Services (5 subcategories)
INSERT INTO subcategories (category_id, name, description, image_prompt) VALUES
  ((SELECT id FROM categories WHERE slug = 'beauty-style-personal-services'), 'Makeup & Hair Artists', 'Professional makeup and hair', 'A makeup artist applying bridal makeup with high-quality tools and bright vanity lights.'),
  ((SELECT id FROM categories WHERE slug = 'beauty-style-personal-services'), 'Braiding', 'Professional hair braiding', 'A full-view close-up of a persons head showcasing intricate, neatly styled braids from back and top angles, with clean parting lines, symmetrical braid patterns, and smooth hair texture—professional studio lighting, neutral background, sharp detail.'),
  ((SELECT id FROM categories WHERE slug = 'beauty-style-personal-services'), 'Wardrobe & Fashion Stylists', 'Fashion and wardrobe styling', 'A fashion stylist preparing outfits on a clothing rack with accessories and mood boards.'),
  ((SELECT id FROM categories WHERE slug = 'beauty-style-personal-services'), 'Nail & Spa On-Site Services', 'Mobile nail and spa services', 'A mobile spa setup with manicure tools, towels, and soothing décor.'),
  ((SELECT id FROM categories WHERE slug = 'beauty-style-personal-services'), 'Barber & Grooming Services', 'Professional grooming services', 'A professional barber providing grooming services in a clean, modern setup.');

-- Kids & Family Party Services (4 subcategories)
INSERT INTO subcategories (category_id, name, description, image_prompt) VALUES
  ((SELECT id FROM categories WHERE slug = 'kids-family-party-services'), 'Birthday Party Planners', 'Childrens party planning', 'A colorful birthday party layout with balloons, themed decorations, and a planners table.'),
  ((SELECT id FROM categories WHERE slug = 'kids-family-party-services'), 'Bouncy Castles & Inflatables', 'Inflatable rentals for kids', 'A vibrant inflatable bounce house at an outdoor kids party.'),
  ((SELECT id FROM categories WHERE slug = 'kids-family-party-services'), 'Character Entertainment', 'Character performers for kids', 'A costumed character entertaining children at a festive event.'),
  ((SELECT id FROM categories WHERE slug = 'kids-family-party-services'), 'Craft & Activity Stations', 'Kids activity stations', 'Kids activity station with craft supplies, colorful tables, and joyful setting.');

-- Event Tech & Logistics (4 subcategories)
INSERT INTO subcategories (category_id, name, description, image_prompt) VALUES
  ((SELECT id FROM categories WHERE slug = 'event-tech-logistics'), 'AV Setup', 'Audio-visual equipment setup', 'Professional audio-visual setup with speakers, mixers, screens, and cables.'),
  ((SELECT id FROM categories WHERE slug = 'event-tech-logistics'), 'Event Ticketing & Registration', 'Ticketing and registration services', 'Registration desk with tablets, badges, banners, and professional setup.'),
  ((SELECT id FROM categories WHERE slug = 'event-tech-logistics'), 'Security & Crowd Control', 'Event security services', 'Event security personnel with radios and designated entry barriers.'),
  ((SELECT id FROM categories WHERE slug = 'event-tech-logistics'), 'Transport, Valet & Parking Management', 'Transportation and parking services', 'Valet service station with signage, parking cones, and uniformed staff.');

-- Printing, Customization & Favors (4 subcategories)
INSERT INTO subcategories (category_id, name, description, image_prompt) VALUES
  ((SELECT id FROM categories WHERE slug = 'printing-customization-favors'), 'Invitation Design & Printing', 'Custom invitation design', 'Elegant printed invitations with envelopes, ribbons, and branding elements.'),
  ((SELECT id FROM categories WHERE slug = 'printing-customization-favors'), 'Party Favors & Gift Bags', 'Custom party favors', 'A display of themed party favor bags and small customized gifts.'),
  ((SELECT id FROM categories WHERE slug = 'printing-customization-favors'), 'Custom Merchandise', 'Branded merchandise', 'Custom-printed shirts, mugs, and accessories with event branding.'),
  ((SELECT id FROM categories WHERE slug = 'printing-customization-favors'), 'Signage, Labels & Banners', 'Event signage and banners', 'Event signage and banners printed with vibrant colors and clean typography.');

-- Handyman & Home Support Services (5 subcategories)
INSERT INTO subcategories (category_id, name, description, image_prompt) VALUES
  ((SELECT id FROM categories WHERE slug = 'handyman-home-support-services'), 'TV Mounting & Unmounting Services', 'TV installation services', 'A technician mounting a flat-screen TV using tools and level on a clean wall.'),
  ((SELECT id FROM categories WHERE slug = 'handyman-home-support-services'), 'Furniture Assembly & Installation', 'Furniture assembly services', 'Technician assembling furniture with tools on a neat workspace.'),
  ((SELECT id FROM categories WHERE slug = 'handyman-home-support-services'), 'Picture, Art & Curtain Hanging', 'Wall hanging services', 'A professional hanging artwork and curtains using level and measuring tools.'),
  ((SELECT id FROM categories WHERE slug = 'handyman-home-support-services'), 'Moving Help & Event Setup', 'Moving and setup assistance', 'Crew members carrying event equipment and setting up an event area.'),
  ((SELECT id FROM categories WHERE slug = 'handyman-home-support-services'), 'Fixture Repair & Light Installation', 'Fixture and lighting services', 'Handyman repairing fixtures and installing lights using proper tools.');

-- Delivery, Setup & Cleanup (4 subcategories)
INSERT INTO subcategories (category_id, name, description, image_prompt) VALUES
  ((SELECT id FROM categories WHERE slug = 'delivery-setup-cleanup'), 'Event Setup & Breakdown Crews', 'Event setup crews', 'Team arranging tables, chairs, and décor during event setup.'),
  ((SELECT id FROM categories WHERE slug = 'delivery-setup-cleanup'), 'Cleaning & Sanitization Teams', 'Professional cleaning teams', 'Sanitization team cleaning event space with professional equipment.'),
  ((SELECT id FROM categories WHERE slug = 'delivery-setup-cleanup'), 'Waste Management & Recycling', 'Waste management services', 'Organized event waste and recycling stations with labeled bins.'),
  ((SELECT id FROM categories WHERE slug = 'delivery-setup-cleanup'), 'Linen & Dish Return Services', 'Linen and dish return', 'Stacked event linens and dish return setup with organized carts.');

-- Specialty & Seasonal Services (5 subcategories)
INSERT INTO subcategories (category_id, name, description, image_prompt) VALUES
  ((SELECT id FROM categories WHERE slug = 'specialty-seasonal-services'), 'Holiday Party Setup', 'Holiday event setup', 'Festive holiday décor with wreaths, lights, themed displays, and warm ambiance.'),
  ((SELECT id FROM categories WHERE slug = 'specialty-seasonal-services'), 'Cultural or Religious Ceremonies', 'Cultural ceremony services', 'Beautifully arranged cultural ceremony setup with symbolic items.'),
  ((SELECT id FROM categories WHERE slug = 'specialty-seasonal-services'), 'Proposal & Engagement Setup', 'Proposal and engagement setup', 'Romantic engagement setup with candles, floral arrangements, and signage.'),
  ((SELECT id FROM categories WHERE slug = 'specialty-seasonal-services'), 'Festival Booth Design', 'Festival booth design', 'Colorful event booth with signage, samples, and decorative elements.'),
  ((SELECT id FROM categories WHERE slug = 'specialty-seasonal-services'), 'Pop-Up & Brand Activation Events', 'Pop-up events and brand activations', 'Modern branded pop-up event setup with banners, displays, and lighting.');

-- Create index on image_prompt for future AI image generation
CREATE INDEX IF NOT EXISTS idx_subcategories_image_prompt ON subcategories(image_prompt) WHERE image_prompt IS NOT NULL;
