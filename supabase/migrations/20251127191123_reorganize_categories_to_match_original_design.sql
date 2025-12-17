/*
  # Reorganize Categories to Match Original Design
  
  This migration restructures the categories to match the original app design:
  - 4 main parent categories on the left: Events & Parties, Home Services, Personal Services, Professional Services
  - All detailed categories become subcategories under these parents
  - Preserves existing subcategories and links them properly
  
  Structure:
  - Events & Parties (parent)
    - Event Planning & Coordination
    - Venue & Space Rentals
    - Catering & Food Services
    - Entertainment & Music
    - Décor, Design & Florals
    - Rentals & Equipment Supply
    - Photography, Videography & Production
    - Kids & Family Party Services
    - Event Tech & Logistics
    - Printing, Customization & Favors
    - Delivery, Setup & Cleanup
    - Specialty & Seasonal Services
  
  - Home Services (parent)
    - Handyman & Home Support Services
    - Cleaning
    - Landscaping
    - Plumbing
    - Electrical
    - Painting
    - Furniture Assembly
    - Moving & Delivery
  
  - Personal Services (parent)
    - Beauty, Style & Personal Services
    - Massage
    - Personal Training
    - Tutoring
  
  - Professional Services (parent)
    - Accounting
    - Legal Services
    - Consulting
*/

-- Step 1: Update the detailed event categories to be children of "Events & Parties"
UPDATE categories 
SET parent_id = (SELECT id FROM categories WHERE slug = 'events-parties')
WHERE slug IN (
  'event-planning-coordination',
  'venue-space-rentals',
  'catering-food-services',
  'entertainment-music',
  'decor-design-florals',
  'rentals-equipment-supply',
  'photography-videography-production',
  'kids-family-party-services',
  'event-tech-logistics',
  'printing-customization-favors',
  'delivery-setup-cleanup',
  'specialty-seasonal-services',
  'bartending',
  'catering',
  'dj-services',
  'event-planning',
  'entertainment',
  'photography',
  'decor-rentals'
);

-- Step 2: Update home service categories to be children of "Home Services"
UPDATE categories 
SET parent_id = (SELECT id FROM categories WHERE slug = 'home-services')
WHERE slug IN (
  'handyman-home-support-services',
  'cleaning',
  'landscaping',
  'plumbing',
  'electrical',
  'painting',
  'furniture-assembly',
  'moving-delivery',
  'handyman'
);

-- Step 3: Update personal service categories to be children of "Personal Services"
UPDATE categories 
SET parent_id = (SELECT id FROM categories WHERE slug = 'personal-services')
WHERE slug IN (
  'beauty-style-personal-services',
  'massage',
  'personal-training',
  'tutoring',
  'makeup',
  'hair-styling',
  'braiding'
);

-- Step 4: Update professional service categories to be children of "Professional Services"
UPDATE categories 
SET parent_id = (SELECT id FROM categories WHERE slug = 'professional-services')
WHERE slug IN (
  'accounting',
  'legal-services',
  'consulting'
);

-- Step 5: Ensure main categories have null parent_id
UPDATE categories
SET parent_id = NULL
WHERE slug IN ('events-parties', 'home-services', 'personal-services', 'professional-services');

-- Step 6: Add icon/image column to categories if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE categories ADD COLUMN image_url text;
  END IF;
END $$;

-- Step 7: Add images to the sub-categories under Events & Parties
UPDATE categories SET image_url = 'https://images.pexels.com/photos/2788488/pexels-photo-2788488.jpeg' WHERE slug = 'event-planning-coordination';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg' WHERE slug = 'venue-space-rentals';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg' WHERE slug = 'catering-food-services';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg' WHERE slug = 'entertainment-music';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1545590/pexels-photo-1545590.jpeg' WHERE slug = 'decor-design-florals';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg' WHERE slug = 'rentals-equipment-supply';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg' WHERE slug = 'photography-videography-production';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg' WHERE slug = 'kids-family-party-services';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg' WHERE slug = 'event-tech-logistics';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg' WHERE slug = 'printing-customization-favors';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg' WHERE slug = 'delivery-setup-cleanup';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1570810/pexels-photo-1570810.jpeg' WHERE slug = 'specialty-seasonal-services';

-- Add images for the original simple subcategories under Events & Parties
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg' WHERE slug = 'bartending';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg' WHERE slug = 'catering';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg' WHERE slug = 'dj-services';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg' WHERE slug = 'decor-rentals';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg' WHERE slug = 'entertainment';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/2788488/pexels-photo-2788488.jpeg' WHERE slug = 'event-planning';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg' WHERE slug = 'photography';

-- Add images for Home Services subcategories
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg' WHERE slug = 'handyman';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg' WHERE slug = 'cleaning';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1453499/pexels-photo-1453499.jpeg' WHERE slug = 'landscaping';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg' WHERE slug = 'handyman-home-support-services';

-- Add images for Personal Services subcategories  
UPDATE categories SET image_url = 'https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg' WHERE slug = 'beauty-style-personal-services';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg' WHERE slug = 'makeup';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg' WHERE slug = 'hair-styling';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/3992870/pexels-photo-3992870.jpeg' WHERE slug = 'braiding';
