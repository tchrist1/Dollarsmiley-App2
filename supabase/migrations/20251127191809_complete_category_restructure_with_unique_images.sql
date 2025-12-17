/*
  # Complete Category Restructure - Match Original Design
  
  This migration completely restructures the categories to match the original app design:
  
  STRUCTURE:
  - Events & Parties (parent)
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
  
  - Home Services (parent)
    - Cleaning
    - Plumbing
    - Electrical
    - Painting
    - Landscaping
    - Furniture Assembly
    - Moving & Delivery
    - Handyman
  
  - Personal Services (parent)
    - Massage
    - Personal Training
    - Tutoring
    - Makeup
    - Hair Styling
    - Braiding
  
  - Professional Services (parent)
    - Accounting
    - Legal Services
    - Consulting
  
  All subcategories get unique, relevant Pexels images.
*/

-- Step 1: Clear parent_id for categories that shouldn't be nested
UPDATE categories SET parent_id = NULL;

-- Step 2: Ensure only 4 main parent categories exist
UPDATE categories 
SET parent_id = NULL, sort_order = CASE name
  WHEN 'Events & Parties' THEN 1
  WHEN 'Home Services' THEN 2
  WHEN 'Personal Services' THEN 3
  WHEN 'Professional Services' THEN 4
  ELSE sort_order
END
WHERE name IN ('Events & Parties', 'Home Services', 'Personal Services', 'Professional Services');

-- Step 3: Set ALL 14 event-related categories as children of "Events & Parties"
UPDATE categories 
SET 
  parent_id = (SELECT id FROM categories WHERE slug = 'events-parties' AND parent_id IS NULL),
  sort_order = CASE slug
    WHEN 'event-planning-coordination' THEN 1
    WHEN 'venue-space-rentals' THEN 2
    WHEN 'catering-food-services' THEN 3
    WHEN 'entertainment-music' THEN 4
    WHEN 'decor-design-florals' THEN 5
    WHEN 'rentals-equipment-supply' THEN 6
    WHEN 'photography-videography-production' THEN 7
    WHEN 'beauty-style-personal-services' THEN 8
    WHEN 'kids-family-party-services' THEN 9
    WHEN 'event-tech-logistics' THEN 10
    WHEN 'printing-customization-favors' THEN 11
    WHEN 'handyman-home-support-services' THEN 12
    WHEN 'delivery-setup-cleanup' THEN 13
    WHEN 'specialty-seasonal-services' THEN 14
    ELSE 99
  END
WHERE slug IN (
  'event-planning-coordination',
  'venue-space-rentals',
  'catering-food-services',
  'entertainment-music',
  'decor-design-florals',
  'rentals-equipment-supply',
  'photography-videography-production',
  'beauty-style-personal-services',
  'kids-family-party-services',
  'event-tech-logistics',
  'printing-customization-favors',
  'handyman-home-support-services',
  'delivery-setup-cleanup',
  'specialty-seasonal-services'
);

-- Step 4: Delete old simple event subcategories (duplicates)
DELETE FROM categories WHERE slug IN (
  'bartending', 'catering', 'dj-services', 'event-planning', 
  'entertainment', 'photography', 'decor-rentals'
) AND parent_id IS NOT NULL;

-- Step 5: Set Home Services children
UPDATE categories 
SET 
  parent_id = (SELECT id FROM categories WHERE slug = 'home-services' AND parent_id IS NULL),
  sort_order = CASE slug
    WHEN 'cleaning' THEN 1
    WHEN 'plumbing' THEN 2
    WHEN 'electrical' THEN 3
    WHEN 'painting' THEN 4
    WHEN 'landscaping' THEN 5
    WHEN 'furniture-assembly' THEN 6
    WHEN 'moving-delivery' THEN 7
    WHEN 'handyman' THEN 8
    ELSE 99
  END
WHERE slug IN ('cleaning', 'plumbing', 'electrical', 'painting', 'landscaping', 'furniture-assembly', 'moving-delivery', 'handyman')
  AND slug != 'handyman-home-support-services';

-- Step 6: Set Personal Services children
UPDATE categories 
SET 
  parent_id = (SELECT id FROM categories WHERE slug = 'personal-services' AND parent_id IS NULL),
  sort_order = CASE slug
    WHEN 'massage' THEN 1
    WHEN 'personal-training' THEN 2
    WHEN 'tutoring' THEN 3
    WHEN 'makeup' THEN 4
    WHEN 'hair-styling' THEN 5
    WHEN 'braiding' THEN 6
    ELSE 99
  END
WHERE slug IN ('massage', 'personal-training', 'tutoring', 'makeup', 'hair-styling', 'braiding')
  AND slug != 'beauty-style-personal-services';

-- Step 7: Set Professional Services children
UPDATE categories 
SET 
  parent_id = (SELECT id FROM categories WHERE slug = 'professional-services' AND parent_id IS NULL),
  sort_order = CASE slug
    WHEN 'accounting' THEN 1
    WHEN 'legal-services' THEN 2
    WHEN 'consulting' THEN 3
    ELSE 99
  END
WHERE slug IN ('accounting', 'legal-services', 'consulting');

-- Step 8: Assign UNIQUE images to all Events & Parties subcategories
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg' WHERE slug = 'event-planning-coordination';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg' WHERE slug = 'venue-space-rentals';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg' WHERE slug = 'catering-food-services';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg' WHERE slug = 'entertainment-music';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg' WHERE slug = 'decor-design-florals';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg' WHERE slug = 'rentals-equipment-supply';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg' WHERE slug = 'photography-videography-production';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg' WHERE slug = 'beauty-style-personal-services';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg' WHERE slug = 'kids-family-party-services';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/2608517/pexels-photo-2608517.jpeg' WHERE slug = 'event-tech-logistics';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg' WHERE slug = 'printing-customization-favors';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/5691573/pexels-photo-5691573.jpeg' WHERE slug = 'handyman-home-support-services';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg' WHERE slug = 'delivery-setup-cleanup';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1729798/pexels-photo-1729798.jpeg' WHERE slug = 'specialty-seasonal-services';

-- Step 9: Assign UNIQUE images to Home Services subcategories
UPDATE categories SET image_url = 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg' WHERE slug = 'cleaning';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/8486931/pexels-photo-8486931.jpeg' WHERE slug = 'plumbing';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg' WHERE slug = 'electrical';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1669754/pexels-photo-1669754.jpeg' WHERE slug = 'painting';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1453499/pexels-photo-1453499.jpeg' WHERE slug = 'landscaping';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/4792385/pexels-photo-4792385.jpeg' WHERE slug = 'furniture-assembly';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/4246120/pexels-photo-4246120.jpeg' WHERE slug = 'moving-delivery';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/5691591/pexels-photo-5691591.jpeg' WHERE slug = 'handyman';

-- Step 10: Assign UNIQUE images to Personal Services subcategories
UPDATE categories SET image_url = 'https://images.pexels.com/photos/3997379/pexels-photo-3997379.jpeg' WHERE slug = 'massage';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg' WHERE slug = 'personal-training';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/4145356/pexels-photo-4145356.jpeg' WHERE slug = 'tutoring';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/3785147/pexels-photo-3785147.jpeg' WHERE slug = 'makeup';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg' WHERE slug = 'hair-styling';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg' WHERE slug = 'braiding';

-- Step 11: Assign UNIQUE images to Professional Services subcategories
UPDATE categories SET image_url = 'https://images.pexels.com/photos/6863332/pexels-photo-6863332.jpeg' WHERE slug = 'accounting';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/5668772/pexels-photo-5668772.jpeg' WHERE slug = 'legal-services';
UPDATE categories SET image_url = 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg' WHERE slug = 'consulting';
