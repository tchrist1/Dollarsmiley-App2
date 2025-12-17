/*
  # Fix Duplicate Subcategory Images
  
  Removes all duplicate images and assigns unique Pexels photos.
  Ensures no image URL is used more than once across all subcategories.
*/

-- Fix the 3-way duplicate (Photo Booth, Lighting Design, AV Setup)
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg' 
WHERE slug = 'photo-booth-360-booth-rentals';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/2306280/pexels-photo-2306280.jpeg' 
WHERE slug = 'lighting-design';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg' 
WHERE slug = 'av-setup';

-- Fix Community & Convention Centers and Dancers duplicate
UPDATE categories SET image_url = 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg' 
WHERE slug = 'community-convention-centers';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/3721941/pexels-photo-3721941.jpeg' 
WHERE slug = 'dancers';

-- Fix Wedding Planning and Wedding Videography duplicate
UPDATE categories SET image_url = 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg' 
WHERE slug = 'wedding-planning';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/2788488/pexels-photo-2788488.jpeg' 
WHERE slug = 'wedding-portrait-videography';

-- Fix Balloon Decor and Holiday Party Setup duplicate
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg' 
WHERE slug = 'balloon-decor-arches';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/1708601/pexels-photo-1708601.jpeg' 
WHERE slug = 'holiday-party-setup';

-- Fix Birthday Party Planners conflict with new Balloon Decor image
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1903319/pexels-photo-1903319.jpeg' 
WHERE slug = 'birthday-party-planners';
