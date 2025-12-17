/*
  # Add Remaining Subcategories - Batch 3
  
  Adds subcategories for:
  - Kids & Family Party Services (4 subcategories)
  - Event Tech & Logistics (4 subcategories)
  - Printing, Customization & Favors (4 subcategories)
  - Handyman & Home Support Services (5 subcategories)
  - Delivery, Setup & Cleanup (4 subcategories)
  - Specialty & Seasonal Services (5 subcategories)
*/

-- Kids & Family Party Services subcategories
INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Birthday Party Planners', 'birthday-party-planners',
  'A colorful birthday party layout with balloons, themed decorations, and a planner''s table.',
  id, 'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg'
FROM categories WHERE name = 'Kids & Family Party Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Bouncy Castles & Inflatables', 'bouncy-castles-inflatables',
  'A vibrant inflatable bounce house at an outdoor kids'' party.',
  id, 'https://images.pexels.com/photos/5869469/pexels-photo-5869469.jpeg'
FROM categories WHERE name = 'Kids & Family Party Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Character Entertainment', 'character-entertainment',
  'A costumed character entertaining children at a festive event.',
  id, 'https://images.pexels.com/photos/8613320/pexels-photo-8613320.jpeg'
FROM categories WHERE name = 'Kids & Family Party Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Craft & Activity Stations', 'craft-activity-stations',
  'Kids'' activity station with craft supplies, colorful tables, and joyful setting.',
  id, 'https://images.pexels.com/photos/4048094/pexels-photo-4048094.jpeg'
FROM categories WHERE name = 'Kids & Family Party Services' AND parent_id IS NULL;

-- Event Tech & Logistics subcategories
INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'AV Setup', 'av-setup',
  'Professional audio-visual setup with speakers, mixers, screens, and cables.',
  id, 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg'
FROM categories WHERE name = 'Event Tech & Logistics' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Event Ticketing & Registration', 'event-ticketing-registration',
  'Registration desk with tablets, badges, banners, and professional setup.',
  id, 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg'
FROM categories WHERE name = 'Event Tech & Logistics' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Security & Crowd Control', 'security-crowd-control',
  'Event security personnel with radios and designated entry barriers.',
  id, 'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg'
FROM categories WHERE name = 'Event Tech & Logistics' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Transport, Valet & Parking Management', 'transport-valet-parking-management',
  'Valet service station with signage, parking cones, and uniformed staff.',
  id, 'https://images.pexels.com/photos/977003/pexels-photo-977003.jpeg'
FROM categories WHERE name = 'Event Tech & Logistics' AND parent_id IS NULL;

-- Printing, Customization & Favors subcategories
INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Invitation Design & Printing', 'invitation-design-printing',
  'Elegant printed invitations with envelopes, ribbons, and branding elements.',
  id, 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg'
FROM categories WHERE name = 'Printing, Customization & Favors' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Party Favors & Gift Bags', 'party-favors-gift-bags',
  'A display of themed party favor bags and small customized gifts.',
  id, 'https://images.pexels.com/photos/264985/pexels-photo-264985.jpeg'
FROM categories WHERE name = 'Printing, Customization & Favors' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Custom Merchandise', 'custom-merchandise',
  'Custom-printed shirts, mugs, and accessories with event branding.',
  id, 'https://images.pexels.com/photos/1229861/pexels-photo-1229861.jpeg'
FROM categories WHERE name = 'Printing, Customization & Favors' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Signage, Labels & Banners', 'signage-labels-banners',
  'Event signage and banners printed with vibrant colors and clean typography.',
  id, 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg'
FROM categories WHERE name = 'Printing, Customization & Favors' AND parent_id IS NULL;

-- Handyman & Home Support Services subcategories
INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'TV Mounting & Unmounting Services', 'tv-mounting-unmounting-services',
  'A technician mounting a flat-screen TV using tools and level on a clean wall.',
  id, 'https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg'
FROM categories WHERE name = 'Handyman & Home Support Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Furniture Assembly & Installation', 'furniture-assembly-installation',
  'Technician assembling furniture with tools on a neat workspace.',
  id, 'https://images.pexels.com/photos/4792385/pexels-photo-4792385.jpeg'
FROM categories WHERE name = 'Handyman & Home Support Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Picture, Art & Curtain Hanging', 'picture-art-curtain-hanging',
  'A professional hanging artwork and curtains using level and measuring tools.',
  id, 'https://images.pexels.com/photos/5691608/pexels-photo-5691608.jpeg'
FROM categories WHERE name = 'Handyman & Home Support Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Moving Help & Event Setup', 'moving-help-event-setup',
  'Crew members carrying event equipment and setting up an event area.',
  id, 'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg'
FROM categories WHERE name = 'Handyman & Home Support Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Fixture Repair & Light Installation', 'fixture-repair-light-installation',
  'Handyman repairing fixtures and installing lights using proper tools.',
  id, 'https://images.pexels.com/photos/5691578/pexels-photo-5691578.jpeg'
FROM categories WHERE name = 'Handyman & Home Support Services' AND parent_id IS NULL;

-- Delivery, Setup & Cleanup subcategories
INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Event Setup & Breakdown Crews', 'event-setup-breakdown-crews',
  'Team arranging tables, chairs, and décor during event setup.',
  id, 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg'
FROM categories WHERE name = 'Delivery, Setup & Cleanup' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Cleaning & Sanitization Teams', 'cleaning-sanitization-teams',
  'Sanitization team cleaning event space with professional equipment.',
  id, 'https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg'
FROM categories WHERE name = 'Delivery, Setup & Cleanup' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Waste Management & Recycling', 'waste-management-recycling',
  'Organized event waste and recycling stations with labeled bins.',
  id, 'https://images.pexels.com/photos/3735218/pexels-photo-3735218.jpeg'
FROM categories WHERE name = 'Delivery, Setup & Cleanup' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Linen & Dish Return Services', 'linen-dish-return-services',
  'Stacked event linens and dish return setup with organized carts.',
  id, 'https://images.pexels.com/photos/3171735/pexels-photo-3171735.jpeg'
FROM categories WHERE name = 'Delivery, Setup & Cleanup' AND parent_id IS NULL;

-- Specialty & Seasonal Services subcategories
INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Holiday Party Setup', 'holiday-party-setup',
  'Festive holiday décor with wreaths, lights, themed displays, and warm ambiance.',
  id, 'https://images.pexels.com/photos/1570810/pexels-photo-1570810.jpeg'
FROM categories WHERE name = 'Specialty & Seasonal Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Cultural or Religious Ceremonies', 'cultural-religious-ceremonies',
  'Beautifully arranged cultural ceremony setup with symbolic items.',
  id, 'https://images.pexels.com/photos/1729798/pexels-photo-1729798.jpeg'
FROM categories WHERE name = 'Specialty & Seasonal Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Proposal & Engagement Setup', 'proposal-engagement-setup',
  'Romantic engagement setup with candles, floral arrangements, and signage.',
  id, 'https://images.pexels.com/photos/2072176/pexels-photo-2072176.jpeg'
FROM categories WHERE name = 'Specialty & Seasonal Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Festival Booth Design', 'festival-booth-design',
  'Colorful event booth with signage, samples, and decorative elements.',
  id, 'https://images.pexels.com/photos/3018845/pexels-photo-3018845.jpeg'
FROM categories WHERE name = 'Specialty & Seasonal Services' AND parent_id IS NULL;

INSERT INTO categories (name, slug, description, parent_id, image_url) 
SELECT 'Pop-Up & Brand Activation Events', 'pop-up-brand-activation-events',
  'Modern branded pop-up event setup with banners, displays, and lighting.',
  id, 'https://images.pexels.com/photos/3760837/pexels-photo-3760837.jpeg'
FROM categories WHERE name = 'Specialty & Seasonal Services' AND parent_id IS NULL;
