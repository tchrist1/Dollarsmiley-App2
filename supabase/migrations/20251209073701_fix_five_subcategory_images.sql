/*
  # Fix 5 Subcategory Images Not Displaying
  
  Updates 5 subcategories that were still pointing to Supabase storage
  instead of Pexels URLs. Assigns unique Pexels images to each.
*/

-- Dancers
UPDATE categories 
SET image_url = 'https://images.pexels.com/photos/3721941/pexels-photo-3721941.jpeg' 
WHERE slug = 'dancers';

-- Backdrops & Draping
UPDATE categories 
SET image_url = 'https://images.pexels.com/photos/2306276/pexels-photo-2306276.jpeg' 
WHERE slug = 'backdrops-draping';

-- Balloon Décor & Arches
UPDATE categories 
SET image_url = 'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg' 
WHERE slug = 'balloon-decor-arches';

-- Banquet Halls & Ballrooms
UPDATE categories 
SET image_url = 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg' 
WHERE slug = 'banquet-halls-ballrooms';

-- Community & Convention Centers
UPDATE categories 
SET image_url = 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg' 
WHERE slug = 'community-convention-centers';
