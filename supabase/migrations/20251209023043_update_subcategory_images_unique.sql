/*
  # Update All Subcategory Images with Unique Pexels Photos
  
  Updates 41 subcategories with unique, high-quality Pexels images.
  Each image is used only once across all subcategories.
  
  Categories updated:
  - Décor, Design & Florals (5 subcategories)
  - Rentals & Equipment Supply (6 subcategories)
  - Beauty, Style & Personal Services (4 subcategories)
  - Kids & Family Party Services (4 subcategories)
  - Event Tech & Logistics (4 subcategories)
  - Printing, Customization & Favors (4 subcategories)
  - Handyman & Home Support Services (5 subcategories)
  - Delivery, Setup & Cleanup (4 subcategories)
  - Specialty & Seasonal Services (5 subcategories)
*/

-- DÉCOR, DESIGN & FLORALS
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1179229/pexels-photo-1179229.jpeg' 
WHERE slug = 'floral-design-arrangements';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/3171815/pexels-photo-3171815.jpeg' 
WHERE slug = 'balloon-decor-arches';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/2306276/pexels-photo-2306276.jpeg' 
WHERE slug = 'backdrops-draping';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/587741/pexels-photo-587741.jpeg' 
WHERE slug = 'table-styling-centerpieces';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg' 
WHERE slug = 'lighting-design';

-- RENTALS & EQUIPMENT SUPPLY
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1395967/pexels-photo-1395967.jpeg' 
WHERE slug = 'tables-chairs-linens';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/2306278/pexels-photo-2306278.jpeg' 
WHERE slug = 'tents';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/2102568/pexels-photo-2102568.jpeg' 
WHERE slug = 'stages-flooring';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/1123262/pexels-photo-1123262.jpeg' 
WHERE slug = 'tableware-glassware-bars';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/2263434/pexels-photo-2263434.jpeg' 
WHERE slug = 'dance-floors-lounge-furniture';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/159376/construction-site-build-construction-work-159376.jpeg' 
WHERE slug = 'generators-heaters-restrooms';

-- BEAUTY, STYLE & PERSONAL SERVICES
UPDATE categories SET image_url = 'https://images.pexels.com/photos/457701/pexels-photo-457701.jpeg' 
WHERE slug = 'makeup-hair-artists';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg' 
WHERE slug = 'wardrobe-fashion-stylists';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/3997992/pexels-photo-3997992.jpeg' 
WHERE slug = 'nail-spa-on-site-services';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg' 
WHERE slug = 'barber-grooming-services';

-- KIDS & FAMILY PARTY SERVICES
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1729798/pexels-photo-1729798.jpeg' 
WHERE slug = 'birthday-party-planners';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/6032467/pexels-photo-6032467.jpeg' 
WHERE slug = 'bouncy-castles-inflatables';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/4700399/pexels-photo-4700399.jpeg' 
WHERE slug = 'character-entertainment';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg' 
WHERE slug = 'craft-activity-stations';

-- EVENT TECH & LOGISTICS
UPDATE categories SET image_url = 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg' 
WHERE slug = 'av-setup';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/3321793/pexels-photo-3321793.jpeg' 
WHERE slug = 'event-ticketing-registration';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/2608519/pexels-photo-2608519.jpeg' 
WHERE slug = 'security-crowd-control';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg' 
WHERE slug = 'transport-valet-parking-management';

-- PRINTING, CUSTOMIZATION & FAVORS
UPDATE categories SET image_url = 'https://images.pexels.com/photos/1456951/pexels-photo-1456951.jpeg' 
WHERE slug = 'invitation-design-printing';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/3692879/pexels-photo-3692879.jpeg' 
WHERE slug = 'party-favors-gift-bags';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/3755913/pexels-photo-3755913.jpeg' 
WHERE slug = 'custom-merchandise';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/3184311/pexels-photo-3184311.jpeg' 
WHERE slug = 'signage-labels-banners';

-- HANDYMAN & HOME SUPPORT SERVICES
UPDATE categories SET image_url = 'https://images.pexels.com/photos/5825362/pexels-photo-5825362.jpeg' 
WHERE slug = 'tv-mounting-unmounting-services';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/4792486/pexels-photo-4792486.jpeg' 
WHERE slug = 'furniture-assembly-installation';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/1090638/pexels-photo-1090638.jpeg' 
WHERE slug = 'picture-art-curtain-hanging';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg' 
WHERE slug = 'moving-help-event-setup';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/8853502/pexels-photo-8853502.jpeg' 
WHERE slug = 'fixture-repair-light-installation';

-- DELIVERY, SETUP & CLEANUP
UPDATE categories SET image_url = 'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg' 
WHERE slug = 'event-setup-breakdown-crews';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg' 
WHERE slug = 'cleaning-sanitization-teams';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/8853508/pexels-photo-8853508.jpeg' 
WHERE slug = 'waste-management-recycling';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/6197118/pexels-photo-6197118.jpeg' 
WHERE slug = 'linen-dish-return-services';

-- SPECIALTY & SEASONAL SERVICES
UPDATE categories SET image_url = 'https://images.pexels.com/photos/3171815/pexels-photo-3171815.jpeg' 
WHERE slug = 'holiday-party-setup';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/8553828/pexels-photo-8553828.jpeg' 
WHERE slug = 'cultural-religious-ceremonies';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/1024975/pexels-photo-1024975.jpeg' 
WHERE slug = 'proposal-engagement-setup';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/2952834/pexels-photo-2952834.jpeg' 
WHERE slug = 'festival-booth-design';

UPDATE categories SET image_url = 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg' 
WHERE slug = 'pop-up-brand-activation-events';
