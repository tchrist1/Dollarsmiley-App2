/*
  # Add Remaining Subcategories - Batch 1
  
  Adds subcategories for:
  - Catering & Food Services (7 subcategories)
  - Entertainment & Music (6 subcategories)
  - Décor, Design & Florals (5 subcategories)
*/

-- Catering & Food Services subcategories
INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Full-Service Catering', 'full-service-catering',
  'A catering team preparing gourmet dishes on polished buffet tables with stainless chafers and elegant plating.',
  id, 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg'
FROM categories WHERE name = 'Catering & Food Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Buffets & Food Stations', 'buffets-food-stations',
  'A colorful buffet arrangement featuring multiple themed food stations with labels and decorative accents.',
  id, 'https://images.pexels.com/photos/2788792/pexels-photo-2788792.jpeg'
FROM categories WHERE name = 'Catering & Food Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Beverage & Bartending', 'beverage-bartending',
  'A bartender crafting cocktails on a stylish bar counter with glassware, mixers, and ambient event lighting.',
  id, 'https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg'
FROM categories WHERE name = 'Catering & Food Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Specialty Desserts & Cakes', 'specialty-desserts-cakes',
  'A dessert table filled with artisanal cakes, pastries, and decorative sweets—high detail.',
  id, 'https://images.pexels.com/photos/1721932/pexels-photo-1721932.jpeg'
FROM categories WHERE name = 'Catering & Food Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Food Trucks & Mobile Bars', 'food-trucks-mobile-bars',
  'A trendy food truck at an event with open service windows, chalkboard menus, and outdoor festive lighting.',
  id, 'https://images.pexels.com/photos/5920742/pexels-photo-5920742.jpeg'
FROM categories WHERE name = 'Catering & Food Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Private Chefs', 'private-chefs',
  'A private chef preparing gourmet dishes in a modern kitchen with fresh ingredients and refined plating.',
  id, 'https://images.pexels.com/photos/2544829/pexels-photo-2544829.jpeg'
FROM categories WHERE name = 'Catering & Food Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Cultural Cuisine', 'cultural-cuisine',
  'A beautifully arranged ethnic cuisine table showcasing authentic dishes, spices, and cultural elements.',
  id, 'https://images.pexels.com/photos/1410235/pexels-photo-1410235.jpeg'
FROM categories WHERE name = 'Catering & Food Services' AND parent_id IS NULL;

-- Entertainment & Music subcategories
INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'DJs & Live Bands', 'djs-live-bands',
  'A DJ mixing music on a stage with LED lights, turntables, and energetic event lighting.',
  id, 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg'
FROM categories WHERE name = 'Entertainment & Music' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Emcees & Hosts', 'emcees-hosts',
  'A charismatic event host holding a microphone on a decorated stage with audience engagement.',
  id, 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg'
FROM categories WHERE name = 'Entertainment & Music' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Dancers', 'dancers',
  'Professional dancers performing in coordinated costumes on a well-lit event stage.',
  id, 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg'
FROM categories WHERE name = 'Entertainment & Music' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Magicians & Comedians', 'magicians-comedians',
  'A vibrant magic or comedy show setup with spotlight, props, and expressive performer.',
  id, 'https://images.pexels.com/photos/4252668/pexels-photo-4252668.jpeg'
FROM categories WHERE name = 'Entertainment & Music' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Kids'' Entertainment', 'kids-entertainment',
  'A cheerful children''s entertainer with colorful props, balloons, and playful background.',
  id, 'https://images.pexels.com/photos/1466335/pexels-photo-1466335.jpeg'
FROM categories WHERE name = 'Entertainment & Music' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Photo Booth & 360 Booth Rentals', 'photo-booth-360-booth-rentals',
  'A modern 360 photo booth with LED ring lights, platform, and festive props.',
  id, 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg'
FROM categories WHERE name = 'Entertainment & Music' AND parent_id IS NULL;

-- Décor, Design & Florals subcategories
INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Floral Design & Arrangements', 'floral-design-arrangements',
  'Elegant floral arrangements with roses, greenery, and premium vases—studio-quality lighting.',
  id, 'https://images.pexels.com/photos/1545590/pexels-photo-1545590.jpeg'
FROM categories WHERE name = 'Décor, Design & Florals' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Balloon Décor & Arches', 'balloon-decor-arches',
  'A stylish balloon arch with coordinated colors, metallic balloons, and party backdrop.',
  id, 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg'
FROM categories WHERE name = 'Décor, Design & Florals' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Backdrops & Draping', 'backdrops-draping',
  'A professionally staged event backdrop with drapes, lighting, and themed decorations.',
  id, 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg'
FROM categories WHERE name = 'Décor, Design & Florals' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Table Styling & Centerpieces', 'table-styling-centerpieces',
  'A decorated event table with centerpieces, tableware, linens, and candles—luxury aesthetic.',
  id, 'https://images.pexels.com/photos/1395964/pexels-photo-1395964.jpeg'
FROM categories WHERE name = 'Décor, Design & Florals' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Lighting Design', 'lighting-design',
  'Event lighting setup with uplights, string lights, and atmospheric glow enhancing venue décor.',
  id, 'https://images.pexels.com/photos/2306277/pexels-photo-2306277.jpeg'
FROM categories WHERE name = 'Décor, Design & Florals' AND parent_id IS NULL;
