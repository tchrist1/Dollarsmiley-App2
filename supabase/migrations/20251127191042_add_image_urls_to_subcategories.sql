/*
  # Add Image URLs to Subcategories
  
  1. Changes
    - Add image_url column to subcategories table
    - Update all subcategories with appropriate Pexels images matching their service type
  
  2. Purpose
    - Enable displaying circular images for each subcategory
    - Match the original app design with visual subcategory representations
*/

-- Add image_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subcategories' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE subcategories ADD COLUMN image_url text;
  END IF;
END $$;

-- Update subcategories with appropriate images
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg' WHERE name = 'Full-Service Event Planning';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/2788488/pexels-photo-2788488.jpeg' WHERE name = 'Wedding Planning';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg' WHERE name = 'Corporate Event Management';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg' WHERE name = 'Social & Community Events';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg' WHERE name = 'Day-of Coordination';

UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg' WHERE name = 'Banquet Halls & Ballrooms';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg' WHERE name = 'Outdoor Gardens & Parks';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg' WHERE name = 'Private Homes & Airbnb Venues';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg' WHERE name = 'Rooftop & Waterfront Spaces';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg' WHERE name = 'Community & Convention Centers';

UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg' WHERE name = 'Full-Service Catering';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/2788792/pexels-photo-2788792.jpeg' WHERE name = 'Buffets & Food Stations';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg' WHERE name = 'Beverage & Bartending';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1721932/pexels-photo-1721932.jpeg' WHERE name = 'Specialty Desserts & Cakes';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/5920742/pexels-photo-5920742.jpeg' WHERE name = 'Food Trucks & Mobile Bars';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/2544829/pexels-photo-2544829.jpeg' WHERE name = 'Private Chefs';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1410235/pexels-photo-1410235.jpeg' WHERE name = 'Cultural Cuisine';

UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg' WHERE name = 'DJs & Live Bands';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg' WHERE name = 'Emcees & Hosts';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg' WHERE name = 'Dancers';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/4252668/pexels-photo-4252668.jpeg' WHERE name = 'Magicians & Comedians';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1466335/pexels-photo-1466335.jpeg' WHERE name = 'Kids'' Entertainment';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg' WHERE name = 'Photo Booth & 360 Booth Rentals';

UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1545590/pexels-photo-1545590.jpeg' WHERE name = 'Floral Design & Arrangements';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg' WHERE name = 'Balloon Décor & Arches';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg' WHERE name = 'Backdrops & Draping';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1395964/pexels-photo-1395964.jpeg' WHERE name = 'Table Styling & Centerpieces';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/2306277/pexels-photo-2306277.jpeg' WHERE name = 'Lighting Design';

UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg' WHERE name = 'Tables, Chairs & Linens';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg' WHERE name = 'Tents, Stages & Flooring';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1395964/pexels-photo-1395964.jpeg' WHERE name = 'Tableware, Glassware & Bars';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg' WHERE name = 'Dance Floors & Lounge Furniture';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/210617/pexels-photo-210617.jpeg' WHERE name = 'Generators, Heaters & Restrooms';

UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg' WHERE name = 'Event Photography';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/2788488/pexels-photo-2788488.jpeg' WHERE name = 'Wedding & Portrait Videography';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/442587/pexels-photo-442587.jpeg' WHERE name = 'Drone Footage';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/3184317/pexels-photo-3184317.jpeg' WHERE name = 'Live Streaming Services';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/326514/pexels-photo-326514.jpeg' WHERE name = 'Graphic Design & Event Branding';

UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg' WHERE name = 'Makeup & Hair Artists';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/3992870/pexels-photo-3992870.jpeg' WHERE name = 'Braiding';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/972995/pexels-photo-972995.jpeg' WHERE name = 'Wardrobe & Fashion Stylists';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/3997379/pexels-photo-3997379.jpeg' WHERE name = 'Nail & Spa On-Site Services';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg' WHERE name = 'Barber & Grooming Services';

UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg' WHERE name = 'Birthday Party Planners';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/5869469/pexels-photo-5869469.jpeg' WHERE name = 'Bouncy Castles & Inflatables';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/8613320/pexels-photo-8613320.jpeg' WHERE name = 'Character Entertainment';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/4048094/pexels-photo-4048094.jpeg' WHERE name = 'Craft & Activity Stations';

UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg' WHERE name = 'AV Setup';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg' WHERE name = 'Event Ticketing & Registration';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg' WHERE name = 'Security & Crowd Control';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/977003/pexels-photo-977003.jpeg' WHERE name = 'Transport, Valet & Parking Management';

UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg' WHERE name = 'Invitation Design & Printing';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/264985/pexels-photo-264985.jpeg' WHERE name = 'Party Favors & Gift Bags';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1229861/pexels-photo-1229861.jpeg' WHERE name = 'Custom Merchandise';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg' WHERE name = 'Signage, Labels & Banners';

UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg' WHERE name = 'TV Mounting & Unmounting Services';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/4792385/pexels-photo-4792385.jpeg' WHERE name = 'Furniture Assembly & Installation';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/5691608/pexels-photo-5691608.jpeg' WHERE name = 'Picture, Art & Curtain Hanging';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg' WHERE name = 'Moving Help & Event Setup';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/5691578/pexels-photo-5691578.jpeg' WHERE name = 'Fixture Repair & Light Installation';

UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg' WHERE name = 'Event Setup & Breakdown Crews';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg' WHERE name = 'Cleaning & Sanitization Teams';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/3735218/pexels-photo-3735218.jpeg' WHERE name = 'Waste Management & Recycling';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/3171735/pexels-photo-3171735.jpeg' WHERE name = 'Linen & Dish Return Services';

UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1570810/pexels-photo-1570810.jpeg' WHERE name = 'Holiday Party Setup';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/1729798/pexels-photo-1729798.jpeg' WHERE name = 'Cultural or Religious Ceremonies';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/2072176/pexels-photo-2072176.jpeg' WHERE name = 'Proposal & Engagement Setup';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/3018845/pexels-photo-3018845.jpeg' WHERE name = 'Festival Booth Design';
UPDATE subcategories SET image_url = 'https://images.pexels.com/photos/3760837/pexels-photo-3760837.jpeg' WHERE name = 'Pop-Up & Brand Activation Events';
