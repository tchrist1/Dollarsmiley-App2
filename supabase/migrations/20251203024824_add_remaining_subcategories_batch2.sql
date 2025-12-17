/*
  # Add Remaining Subcategories - Batch 2
  
  Adds subcategories for:
  - Rentals & Equipment Supply (6 subcategories)
  - Photography, Videography & Production (5 subcategories)
  - Beauty, Style & Personal Services (5 subcategories)
*/

-- Rentals & Equipment Supply subcategories
INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Tables, Chairs & Linens', 'tables-chairs-linens',
  'Neatly arranged event tables with chairs, linens, and coordinated décor accents.',
  id, 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg'
FROM categories WHERE name = 'Rentals & Equipment Supply' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Tents', 'tents',
  'A large outdoor event tent with draping, lighting, and open sides—elegant white fabric.',
  id, 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg'
FROM categories WHERE name = 'Rentals & Equipment Supply' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Stages & Flooring', 'stages-flooring',
  'A modular event stage with lighting truss, speakers, and polished flooring.',
  id, 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg'
FROM categories WHERE name = 'Rentals & Equipment Supply' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Tableware, Glassware & Bars', 'tableware-glassware-bars',
  'Premium tableware and glassware arranged for an upscale reception.',
  id, 'https://images.pexels.com/photos/1395964/pexels-photo-1395964.jpeg'
FROM categories WHERE name = 'Rentals & Equipment Supply' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Dance Floors & Lounge Furniture', 'dance-floors-lounge-furniture',
  'A modern dance floor with LED accents and stylish lounge seating around it.',
  id, 'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg'
FROM categories WHERE name = 'Rentals & Equipment Supply' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Generators, Heaters & Restrooms', 'generators-heaters-restrooms',
  'Professional event equipment setup including generators, heaters, and portable units.',
  id, 'https://images.pexels.com/photos/210617/pexels-photo-210617.jpeg'
FROM categories WHERE name = 'Rentals & Equipment Supply' AND parent_id IS NULL;

-- Photography, Videography & Production subcategories
INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Event Photography', 'event-photography',
  'A photographer capturing candid event moments with DSLR camera and soft lighting.',
  id, 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg'
FROM categories WHERE name = 'Photography, Videography & Production' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Wedding & Portrait Videography', 'wedding-portrait-videography',
  'A videographer filming a wedding scene with gimbal and cinematic lighting.',
  id, 'https://images.pexels.com/photos/2788488/pexels-photo-2788488.jpeg'
FROM categories WHERE name = 'Photography, Videography & Production' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Drone Footage', 'drone-footage',
  'A drone capturing aerial views of an outdoor event from above.',
  id, 'https://images.pexels.com/photos/442587/pexels-photo-442587.jpeg'
FROM categories WHERE name = 'Photography, Videography & Production' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Live Streaming Services', 'live-streaming-services',
  'A streaming setup with cameras, monitors, and lighting for live broadcast.',
  id, 'https://images.pexels.com/photos/3184317/pexels-photo-3184317.jpeg'
FROM categories WHERE name = 'Photography, Videography & Production' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Graphic Design & Event Branding', 'graphic-design-event-branding',
  'Event branding designs including banners, invitations, and digital mockups.',
  id, 'https://images.pexels.com/photos/326514/pexels-photo-326514.jpeg'
FROM categories WHERE name = 'Photography, Videography & Production' AND parent_id IS NULL;

-- Beauty, Style & Personal Services subcategories
INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Makeup & Hair Artists', 'makeup-hair-artists',
  'A makeup artist applying bridal makeup with high-quality tools and bright vanity lights.',
  id, 'https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg'
FROM categories WHERE name = 'Beauty, Style & Personal Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Braiding', 'braiding',
  'A full-view close-up of a person''s head showcasing intricate, neatly styled braids from back and top angles, with clean parting lines, symmetrical braid patterns, and smooth hair texture—professional studio lighting, neutral background, sharp detail.',
  id, 'https://images.pexels.com/photos/3992870/pexels-photo-3992870.jpeg'
FROM categories WHERE name = 'Beauty, Style & Personal Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Wardrobe & Fashion Stylists', 'wardrobe-fashion-stylists',
  'A fashion stylist preparing outfits on a clothing rack with accessories and mood boards.',
  id, 'https://images.pexels.com/photos/972995/pexels-photo-972995.jpeg'
FROM categories WHERE name = 'Beauty, Style & Personal Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Nail & Spa On-Site Services', 'nail-spa-on-site-services',
  'A mobile spa setup with manicure tools, towels, and soothing décor.',
  id, 'https://images.pexels.com/photos/3997379/pexels-photo-3997379.jpeg'
FROM categories WHERE name = 'Beauty, Style & Personal Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Barber & Grooming Services', 'barber-grooming-services',
  'A professional barber providing grooming services in a clean, modern setup.',
  id, 'https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg'
FROM categories WHERE name = 'Beauty, Style & Personal Services' AND parent_id IS NULL;
