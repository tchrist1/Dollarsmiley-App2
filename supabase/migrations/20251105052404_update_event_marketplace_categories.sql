/*
  # Update Event Marketplace Categories

  1. Clear existing categories
  2. Add all event marketplace categories with descriptions
  3. Add all subcategories with proper parent relationships

  Categories include:
  - Event Planning & Coordination
  - Venue & Space Rentals
  - Catering & Food Services
  - Entertainment & Music
  - Décor, Design & Florals
  - Rentals & Equipment Supply
  - Photography, Videography & Production
  - Beauty, Style & Personal Services
  - Kids & Family Party Services
  - Event Tech & Logistics
  - Printing, Customization & Favors
  - Handyman & Home Support Services
  - Delivery, Setup & Cleanup
  - Specialty & Seasonal Services
*/

-- Clear existing categories and their relationships
TRUNCATE TABLE categories CASCADE;

-- Insert main categories
INSERT INTO categories (name, slug, description, is_active, parent_id) VALUES
('Event Planning & Coordination', 'event-planning-coordination', 'Professional event planners who help clients design, coordinate, and manage their events seamlessly.', true, NULL),
('Venue & Space Rentals', 'venue-space-rentals', 'Unique spaces and rental venues for weddings, parties, or corporate gatherings.', true, NULL),
('Catering & Food Services', 'catering-food-services', 'Culinary experts offering a variety of menu options and setups for any event.', true, NULL),
('Entertainment & Music', 'entertainment-music', 'Artists and performers who bring energy and life to every celebration.', true, NULL),
('Décor, Design & Florals', 'decor-design-florals', 'Transform spaces with themed décor, flowers, lighting, and artistic styling.', true, NULL),
('Rentals & Equipment Supply', 'rentals-equipment-supply', 'Essential event rental equipment to bring any vision to life.', true, NULL),
('Photography, Videography & Production', 'photography-videography-production', 'Media professionals capturing and producing memorable event moments.', true, NULL),
('Beauty, Style & Personal Services', 'beauty-style-personal-services', 'Glam and personal care experts for brides, hosts, and guests.', true, NULL),
('Kids & Family Party Services', 'kids-family-party-services', 'Fun and engaging experiences for children''s events.', true, NULL),
('Event Tech & Logistics', 'event-tech-logistics', 'Professionals providing event setup, audio-visual, and safety support.', true, NULL),
('Printing, Customization & Favors', 'printing-customization-favors', 'Personalized items, gifts, and designs for event branding and keepsakes.', true, NULL),
('Handyman & Home Support Services', 'handyman-home-support', 'Professional handyman services to prepare, decorate, and restore event or home spaces.', true, NULL),
('Delivery, Setup & Cleanup', 'delivery-setup-cleanup', 'On-site support for logistics, preparation, and teardown.', true, NULL),
('Specialty & Seasonal Services', 'specialty-seasonal-services', 'Creative and niche services for themed or holiday-based celebrations.', true, NULL);

-- Insert subcategories for Event Planning & Coordination
INSERT INTO categories (name, slug, description, is_active, parent_id)
SELECT name, slug, '', true, (SELECT id FROM categories WHERE slug = 'event-planning-coordination')
FROM (VALUES
  ('Full-Service Event Planning', 'full-service-event-planning'),
  ('Wedding Planning', 'wedding-planning'),
  ('Corporate Event Management', 'corporate-event-management'),
  ('Social & Community Events', 'social-community-events'),
  ('Day-of Coordination', 'day-of-coordination')
) AS subcats(name, slug);

-- Insert subcategories for Venue & Space Rentals
INSERT INTO categories (name, slug, description, is_active, parent_id)
SELECT name, slug, '', true, (SELECT id FROM categories WHERE slug = 'venue-space-rentals')
FROM (VALUES
  ('Banquet Halls & Ballrooms', 'banquet-halls-ballrooms'),
  ('Outdoor Gardens & Parks', 'outdoor-gardens-parks'),
  ('Private Homes & Airbnb Venues', 'private-homes-airbnb-venues'),
  ('Rooftop & Waterfront Spaces', 'rooftop-waterfront-spaces'),
  ('Community & Convention Centers', 'community-convention-centers')
) AS subcats(name, slug);

-- Insert subcategories for Catering & Food Services
INSERT INTO categories (name, slug, description, is_active, parent_id)
SELECT name, slug, '', true, (SELECT id FROM categories WHERE slug = 'catering-food-services')
FROM (VALUES
  ('Full-Service Catering', 'full-service-catering'),
  ('Buffets & Food Stations', 'buffets-food-stations'),
  ('Beverage & Bartending', 'beverage-bartending'),
  ('Specialty Desserts & Cakes', 'specialty-desserts-cakes'),
  ('Food Trucks & Mobile Bars', 'food-trucks-mobile-bars'),
  ('Private Chefs', 'private-chefs'),
  ('Cultural Cuisine', 'cultural-cuisine')
) AS subcats(name, slug);

-- Insert subcategories for Entertainment & Music
INSERT INTO categories (name, slug, description, is_active, parent_id)
SELECT name, slug, '', true, (SELECT id FROM categories WHERE slug = 'entertainment-music')
FROM (VALUES
  ('DJs & Live Bands', 'djs-live-bands'),
  ('Emcees & Hosts', 'emcees-hosts'),
  ('Dancers', 'dancers'),
  ('Magicians & Comedians', 'magicians-comedians'),
  ('Kids'' Entertainment', 'kids-entertainment'),
  ('Photo Booth & 360 Booth Rentals', 'photo-booth-360-booth-rentals')
) AS subcats(name, slug);

-- Insert subcategories for Décor, Design & Florals
INSERT INTO categories (name, slug, description, is_active, parent_id)
SELECT name, slug, '', true, (SELECT id FROM categories WHERE slug = 'decor-design-florals')
FROM (VALUES
  ('Floral Design & Arrangements', 'floral-design-arrangements'),
  ('Balloon Décor & Arches', 'balloon-decor-arches'),
  ('Backdrops & Draping', 'backdrops-draping'),
  ('Table Styling & Centerpieces', 'table-styling-centerpieces'),
  ('Lighting Design', 'lighting-design')
) AS subcats(name, slug);

-- Insert subcategories for Rentals & Equipment Supply
INSERT INTO categories (name, slug, description, is_active, parent_id)
SELECT name, slug, '', true, (SELECT id FROM categories WHERE slug = 'rentals-equipment-supply')
FROM (VALUES
  ('Tables, Chairs & Linens', 'tables-chairs-linens'),
  ('Tents, Stages & Flooring', 'tents-stages-flooring'),
  ('Tableware, Glassware & Bars', 'tableware-glassware-bars'),
  ('Dance Floors & Lounge Furniture', 'dance-floors-lounge-furniture'),
  ('Generators, Heaters & Restrooms', 'generators-heaters-restrooms')
) AS subcats(name, slug);

-- Insert subcategories for Photography, Videography & Production
INSERT INTO categories (name, slug, description, is_active, parent_id)
SELECT name, slug, '', true, (SELECT id FROM categories WHERE slug = 'photography-videography-production')
FROM (VALUES
  ('Event Photography', 'event-photography'),
  ('Wedding & Portrait Videography', 'wedding-portrait-videography'),
  ('Drone Footage', 'drone-footage'),
  ('Live Streaming Services', 'live-streaming-services'),
  ('Graphic Design & Event Branding', 'graphic-design-event-branding')
) AS subcats(name, slug);

-- Insert subcategories for Beauty, Style & Personal Services
INSERT INTO categories (name, slug, description, is_active, parent_id)
SELECT name, slug, '', true, (SELECT id FROM categories WHERE slug = 'beauty-style-personal-services')
FROM (VALUES
  ('Makeup & Hair Artists', 'makeup-hair-artists'),
  ('Braiding', 'braiding'),
  ('Wardrobe & Fashion Stylists', 'wardrobe-fashion-stylists'),
  ('Nail & Spa On-Site Services', 'nail-spa-onsite-services'),
  ('Barber & Grooming Services', 'barber-grooming-services')
) AS subcats(name, slug);

-- Insert subcategories for Kids & Family Party Services
INSERT INTO categories (name, slug, description, is_active, parent_id)
SELECT name, slug, '', true, (SELECT id FROM categories WHERE slug = 'kids-family-party-services')
FROM (VALUES
  ('Birthday Party Planners', 'birthday-party-planners'),
  ('Bouncy Castles & Inflatables', 'bouncy-castles-inflatables'),
  ('Character Entertainment', 'character-entertainment'),
  ('Craft & Activity Stations', 'craft-activity-stations')
) AS subcats(name, slug);

-- Insert subcategories for Event Tech & Logistics
INSERT INTO categories (name, slug, description, is_active, parent_id)
SELECT name, slug, '', true, (SELECT id FROM categories WHERE slug = 'event-tech-logistics')
FROM (VALUES
  ('AV Setup', 'av-setup'),
  ('Event Ticketing & Registration', 'event-ticketing-registration'),
  ('Security & Crowd Control', 'security-crowd-control'),
  ('Transport, Valet & Parking Management', 'transport-valet-parking-management')
) AS subcats(name, slug);

-- Insert subcategories for Printing, Customization & Favors
INSERT INTO categories (name, slug, description, is_active, parent_id)
SELECT name, slug, '', true, (SELECT id FROM categories WHERE slug = 'printing-customization-favors')
FROM (VALUES
  ('Invitation Design & Printing', 'invitation-design-printing'),
  ('Party Favors & Gift Bags', 'party-favors-gift-bags'),
  ('Custom Merchandise', 'custom-merchandise'),
  ('Signage, Labels & Banners', 'signage-labels-banners')
) AS subcats(name, slug);

-- Insert subcategories for Handyman & Home Support Services
INSERT INTO categories (name, slug, description, is_active, parent_id)
SELECT name, slug, '', true, (SELECT id FROM categories WHERE slug = 'handyman-home-support')
FROM (VALUES
  ('TV Mounting & Unmounting Services', 'tv-mounting-unmounting-services'),
  ('Furniture Assembly & Installation', 'furniture-assembly-installation'),
  ('Picture, Art & Curtain Hanging', 'picture-art-curtain-hanging'),
  ('Moving Help & Event Setup', 'moving-help-event-setup'),
  ('Fixture Repair & Light Installation', 'fixture-repair-light-installation')
) AS subcats(name, slug);

-- Insert subcategories for Delivery, Setup & Cleanup
INSERT INTO categories (name, slug, description, is_active, parent_id)
SELECT name, slug, '', true, (SELECT id FROM categories WHERE slug = 'delivery-setup-cleanup')
FROM (VALUES
  ('Event Setup & Breakdown Crews', 'event-setup-breakdown-crews'),
  ('Cleaning & Sanitization Teams', 'cleaning-sanitization-teams'),
  ('Waste Management & Recycling', 'waste-management-recycling'),
  ('Linen & Dish Return Services', 'linen-dish-return-services')
) AS subcats(name, slug);

-- Insert subcategories for Specialty & Seasonal Services
INSERT INTO categories (name, slug, description, is_active, parent_id)
SELECT name, slug, '', true, (SELECT id FROM categories WHERE slug = 'specialty-seasonal-services')
FROM (VALUES
  ('Holiday Party Setup', 'holiday-party-setup'),
  ('Cultural or Religious Ceremonies', 'cultural-religious-ceremonies'),
  ('Proposal & Engagement Setup', 'proposal-engagement-setup'),
  ('Festival Booth Design', 'festival-booth-design'),
  ('Pop-Up & Brand Activation Events', 'popup-brand-activation-events')
) AS subcats(name, slug);
