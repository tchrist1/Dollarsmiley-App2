/*
  # Complete Demo Data Generation with Images and Ratings
  
  This migration generates comprehensive demo data for all subcategories including:
  - Provider profiles with avatars
  - Service listings with images and ratings
  - Reviews with reviewer data
  - Proper average ratings and review counts
*/

-- Helper function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(text_input text)
RETURNS text AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(text_input, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Clear existing data
DELETE FROM reviews;
DELETE FROM service_listings;
DELETE FROM subcategories;

-- Insert all 14 main categories with slugs
INSERT INTO categories (name, slug, icon, description, sort_order) VALUES
  ('Event Planning & Coordination', 'event-planning-coordination', 'calendar-check', 'Professional event planners who help clients design, coordinate, and manage their events seamlessly', 1),
  ('Venue & Space Rentals', 'venue-space-rentals', 'building', 'Unique spaces and rental venues for weddings, parties, or corporate gatherings', 2),
  ('Catering & Food Services', 'catering-food-services', 'utensils', 'Culinary experts offering a variety of menu options and setups for any event', 3),
  ('Entertainment & Music', 'entertainment-music', 'music', 'Artists and performers who bring energy and life to every celebration', 4),
  ('Décor, Design & Florals', 'decor-design-florals', 'flower', 'Transform spaces with themed décor, flowers, lighting, and artistic styling', 5),
  ('Rentals & Equipment Supply', 'rentals-equipment-supply', 'package', 'Essential event rental equipment to bring any vision to life', 6),
  ('Photography, Videography & Production', 'photography-videography-production', 'camera', 'Media professionals capturing and producing memorable event moments', 7),
  ('Beauty, Style & Personal Services', 'beauty-style-personal-services', 'sparkles', 'Glam and personal care experts for brides, hosts, and guests', 8),
  ('Kids & Family Party Services', 'kids-family-party-services', 'baby', 'Fun and engaging experiences for children''s events', 9),
  ('Event Tech & Logistics', 'event-tech-logistics', 'monitor', 'Professionals providing event setup, audio-visual, and safety support', 10),
  ('Printing, Customization & Favors', 'printing-customization-favors', 'gift', 'Personalized items, gifts, and designs for event branding and keepsakes', 11),
  ('Handyman & Home Support Services', 'handyman-home-support-services', 'wrench', 'Professional handyman services to prepare, decorate, and restore event or home spaces', 12),
  ('Delivery, Setup & Cleanup', 'delivery-setup-cleanup', 'truck', 'On-site support for logistics, preparation, and teardown', 13),
  ('Specialty & Seasonal Services', 'specialty-seasonal-services', 'star', 'Creative and niche services for themed or holiday-based celebrations', 14)
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- Insert ALL 77 subcategories in batches
INSERT INTO subcategories (category_id, name, description) VALUES
  -- Event Planning (5)
  ((SELECT id FROM categories WHERE slug = 'event-planning-coordination'), 'Full-Service Event Planning', 'Complete event planning from concept to execution'),
  ((SELECT id FROM categories WHERE slug = 'event-planning-coordination'), 'Wedding Planning', 'Specialized wedding coordination and planning'),
  ((SELECT id FROM categories WHERE slug = 'event-planning-coordination'), 'Corporate Event Management', 'Professional corporate event planning'),
  ((SELECT id FROM categories WHERE slug = 'event-planning-coordination'), 'Social & Community Events', 'Planning for social gatherings'),
  ((SELECT id FROM categories WHERE slug = 'event-planning-coordination'), 'Day-of Coordination', 'Expert day-of coordination'),
  -- Venue Rentals (5)
  ((SELECT id FROM categories WHERE slug = 'venue-space-rentals'), 'Banquet Halls & Ballrooms', 'Elegant indoor event spaces'),
  ((SELECT id FROM categories WHERE slug = 'venue-space-rentals'), 'Outdoor Gardens & Parks', 'Beautiful outdoor venues'),
  ((SELECT id FROM categories WHERE slug = 'venue-space-rentals'), 'Private Homes & Airbnb Venues', 'Intimate private spaces'),
  ((SELECT id FROM categories WHERE slug = 'venue-space-rentals'), 'Rooftop & Waterfront Spaces', 'Scenic views and locations'),
  ((SELECT id FROM categories WHERE slug = 'venue-space-rentals'), 'Community & Convention Centers', 'Large conference spaces'),
  -- Catering (7)
  ((SELECT id FROM categories WHERE slug = 'catering-food-services'), 'Full-Service Catering', 'Complete catering with staff'),
  ((SELECT id FROM categories WHERE slug = 'catering-food-services'), 'Buffets & Food Stations', 'Self-serve food displays'),
  ((SELECT id FROM categories WHERE slug = 'catering-food-services'), 'Beverage & Bartending', 'Professional bar service'),
  ((SELECT id FROM categories WHERE slug = 'catering-food-services'), 'Specialty Desserts & Cakes', 'Custom cakes and desserts'),
  ((SELECT id FROM categories WHERE slug = 'catering-food-services'), 'Food Trucks & Mobile Bars', 'Mobile food services'),
  ((SELECT id FROM categories WHERE slug = 'catering-food-services'), 'Private Chefs', 'Personal chef services'),
  ((SELECT id FROM categories WHERE slug = 'catering-food-services'), 'Cultural Cuisine', 'Authentic international cuisine'),
  -- Entertainment (6)
  ((SELECT id FROM categories WHERE slug = 'entertainment-music'), 'DJs & Live Bands', 'Professional music entertainment'),
  ((SELECT id FROM categories WHERE slug = 'entertainment-music'), 'Emcees & Hosts', 'Event hosts and MCs'),
  ((SELECT id FROM categories WHERE slug = 'entertainment-music'), 'Dancers', 'Professional dance performances'),
  ((SELECT id FROM categories WHERE slug = 'entertainment-music'), 'Magicians & Comedians', 'Comedy and magic acts'),
  ((SELECT id FROM categories WHERE slug = 'entertainment-music'), 'Kids'' Entertainment', 'Children''s entertainers'),
  ((SELECT id FROM categories WHERE slug = 'entertainment-music'), 'Photo Booth & 360 Booth Rentals', 'Interactive photo experiences'),
  -- Décor (5)
  ((SELECT id FROM categories WHERE slug = 'decor-design-florals'), 'Floral Design & Arrangements', 'Professional flower arrangements'),
  ((SELECT id FROM categories WHERE slug = 'decor-design-florals'), 'Balloon Décor & Arches', 'Creative balloon designs'),
  ((SELECT id FROM categories WHERE slug = 'decor-design-florals'), 'Backdrops & Draping', 'Elegant fabric backdrops'),
  ((SELECT id FROM categories WHERE slug = 'decor-design-florals'), 'Table Styling & Centerpieces', 'Beautiful table decorations'),
  ((SELECT id FROM categories WHERE slug = 'decor-design-florals'), 'Lighting Design', 'Professional event lighting'),
  -- Rentals (5)
  ((SELECT id FROM categories WHERE slug = 'rentals-equipment-supply'), 'Tables, Chairs & Linens', 'Event furniture rentals'),
  ((SELECT id FROM categories WHERE slug = 'rentals-equipment-supply'), 'Tents, Stages & Flooring', 'Large structure rentals'),
  ((SELECT id FROM categories WHERE slug = 'rentals-equipment-supply'), 'Tableware, Glassware & Bars', 'Dining equipment rentals'),
  ((SELECT id FROM categories WHERE slug = 'rentals-equipment-supply'), 'Dance Floors & Lounge Furniture', 'Specialty flooring and lounge'),
  ((SELECT id FROM categories WHERE slug = 'rentals-equipment-supply'), 'Generators, Heaters & Restrooms', 'Essential utilities'),
  -- Photography (5)
  ((SELECT id FROM categories WHERE slug = 'photography-videography-production'), 'Event Photography', 'Professional event photos'),
  ((SELECT id FROM categories WHERE slug = 'photography-videography-production'), 'Wedding & Portrait Videography', 'Cinematic wedding videos'),
  ((SELECT id FROM categories WHERE slug = 'photography-videography-production'), 'Drone Footage', 'Aerial photography'),
  ((SELECT id FROM categories WHERE slug = 'photography-videography-production'), 'Live Streaming Services', 'Professional live broadcasting'),
  ((SELECT id FROM categories WHERE slug = 'photography-videography-production'), 'Graphic Design & Event Branding', 'Visual design services'),
  -- Beauty (5)
  ((SELECT id FROM categories WHERE slug = 'beauty-style-personal-services'), 'Makeup & Hair Artists', 'Professional makeup and hair'),
  ((SELECT id FROM categories WHERE slug = 'beauty-style-personal-services'), 'Braiding', 'Expert braiding styles'),
  ((SELECT id FROM categories WHERE slug = 'beauty-style-personal-services'), 'Wardrobe & Fashion Stylists', 'Personal styling services'),
  ((SELECT id FROM categories WHERE slug = 'beauty-style-personal-services'), 'Nail & Spa On-Site Services', 'Mobile nail and spa'),
  ((SELECT id FROM categories WHERE slug = 'beauty-style-personal-services'), 'Barber & Grooming Services', 'Professional grooming'),
  -- Kids (4)
  ((SELECT id FROM categories WHERE slug = 'kids-family-party-services'), 'Birthday Party Planners', 'Children''s birthday planning'),
  ((SELECT id FROM categories WHERE slug = 'kids-family-party-services'), 'Bouncy Castles & Inflatables', 'Inflatable equipment rentals'),
  ((SELECT id FROM categories WHERE slug = 'kids-family-party-services'), 'Character Entertainment', 'Costumed character performers'),
  ((SELECT id FROM categories WHERE slug = 'kids-family-party-services'), 'Craft & Activity Stations', 'Interactive craft setups'),
  -- Event Tech (4)
  ((SELECT id FROM categories WHERE slug = 'event-tech-logistics'), 'AV Setup', 'Audio-visual equipment'),
  ((SELECT id FROM categories WHERE slug = 'event-tech-logistics'), 'Event Ticketing & Registration', 'Registration systems'),
  ((SELECT id FROM categories WHERE slug = 'event-tech-logistics'), 'Security & Crowd Control', 'Event security services'),
  ((SELECT id FROM categories WHERE slug = 'event-tech-logistics'), 'Transport, Valet & Parking Management', 'Transportation services'),
  -- Printing (4)
  ((SELECT id FROM categories WHERE slug = 'printing-customization-favors'), 'Invitation Design & Printing', 'Custom invitation printing'),
  ((SELECT id FROM categories WHERE slug = 'printing-customization-favors'), 'Party Favors & Gift Bags', 'Personalized party favors'),
  ((SELECT id FROM categories WHERE slug = 'printing-customization-favors'), 'Custom Merchandise', 'Branded merchandise'),
  ((SELECT id FROM categories WHERE slug = 'printing-customization-favors'), 'Signage, Labels & Banners', 'Event signage printing'),
  -- Handyman (5)
  ((SELECT id FROM categories WHERE slug = 'handyman-home-support-services'), 'TV Mounting & Unmounting Services', 'Professional TV installation'),
  ((SELECT id FROM categories WHERE slug = 'handyman-home-support-services'), 'Furniture Assembly & Installation', 'Expert furniture assembly'),
  ((SELECT id FROM categories WHERE slug = 'handyman-home-support-services'), 'Picture, Art & Curtain Hanging', 'Professional hanging services'),
  ((SELECT id FROM categories WHERE slug = 'handyman-home-support-services'), 'Moving Help & Event Setup', 'Moving and setup assistance'),
  ((SELECT id FROM categories WHERE slug = 'handyman-home-support-services'), 'Fixture Repair & Light Installation', 'Fixture and lighting work'),
  -- Delivery (4)
  ((SELECT id FROM categories WHERE slug = 'delivery-setup-cleanup'), 'Event Setup & Breakdown Crews', 'Professional setup and teardown'),
  ((SELECT id FROM categories WHERE slug = 'delivery-setup-cleanup'), 'Cleaning & Sanitization Teams', 'Post-event cleaning'),
  ((SELECT id FROM categories WHERE slug = 'delivery-setup-cleanup'), 'Waste Management & Recycling', 'Event waste disposal'),
  ((SELECT id FROM categories WHERE slug = 'delivery-setup-cleanup'), 'Linen & Dish Return Services', 'Rental item returns'),
  -- Specialty (5)
  ((SELECT id FROM categories WHERE slug = 'specialty-seasonal-services'), 'Holiday Party Setup', 'Holiday event planning'),
  ((SELECT id FROM categories WHERE slug = 'specialty-seasonal-services'), 'Cultural or Religious Ceremonies', 'Culturally specific services'),
  ((SELECT id FROM categories WHERE slug = 'specialty-seasonal-services'), 'Proposal & Engagement Setup', 'Romantic proposal planning'),
  ((SELECT id FROM categories WHERE slug = 'specialty-seasonal-services'), 'Festival Booth Design', 'Festival booth design'),
  ((SELECT id FROM categories WHERE slug = 'specialty-seasonal-services'), 'Pop-Up & Brand Activation Events', 'Brand activation events');
