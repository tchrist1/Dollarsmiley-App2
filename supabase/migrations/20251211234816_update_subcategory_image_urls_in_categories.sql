/*
  # Update Subcategory Image URLs in Categories Table
  
  Updates image URLs for all subcategories (categories with non-null parent_id) 
  to use the new Supabase storage URLs.
  This migration updates only the image_url field for each subcategory.
*/

-- Event Planning & Coordination subcategories
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/corporate-event-management_default.png' WHERE name = 'Corporate Event Management' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/day-of-coordination_default.png' WHERE name = 'Day-of Coordination' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/full-service-event-planning_default.png' WHERE name = 'Full-Service Event Planning' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/social-and-community-events_default.png' WHERE name = 'Social & Community Events' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/wedding-planning_default.png' WHERE name = 'Wedding Planning' AND parent_id IS NOT NULL;

-- Venue & Space Rentals subcategories
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/banquet_halls_ballrooms.png' WHERE name = 'Banquet Halls & Ballrooms' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/community_convention_centers.png' WHERE name = 'Community & Convention Centers' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/outdoor_gardens_parks.png' WHERE name = 'Outdoor Gardens & Parks' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/private_homes_airbnb_venues.png' WHERE name = 'Private Homes & Airbnb Venues' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/rooftop_waterfront_spaces.png' WHERE name = 'Rooftop & Waterfront Spaces' AND parent_id IS NOT NULL;

-- Catering & Food Services subcategories
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/beverage-and-bartending_default.png' WHERE name = 'Beverage & Bartending' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/buffets-and-food-stations_default.png' WHERE name = 'Buffets & Food Stations' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/cultural-cuisine_default.png' WHERE name = 'Cultural Cuisine' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/food-trucks-and-mobile-bars_default.png' WHERE name = 'Food Trucks & Mobile Bars' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/full-service-catering_default.png' WHERE name = 'Full-Service Catering' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/private-chefs_default.png' WHERE name = 'Private Chefs' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/specialty-desserts-and-cakes_default.png' WHERE name = 'Specialty Desserts & Cakes' AND parent_id IS NOT NULL;

-- Entertainment & Music subcategories
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/djs-and-live-bands_default.png' WHERE name = 'DJs & Live Bands' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/emcees-and-hosts_default.png' WHERE name = 'Emcees & Hosts' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/dancers_default.png' WHERE name = 'Dancers' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/magicians-and-comedians_default.png' WHERE name = 'Magicians & Comedians' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/kids-entertainment_default.png' WHERE name = 'Kids'' Entertainment' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/photo-booth-and-360-booth-rentals_default.png' WHERE name = 'Photo Booth & 360 Booth Rentals' AND parent_id IS NOT NULL;

-- Décor, Design & Florals subcategories
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/floral-design-and-arrangements_default.png' WHERE name = 'Floral Design & Arrangements' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/decor-and-arches_default.png' WHERE name = 'Balloon Décor & Arches' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/backdrops-and-draping_default.png' WHERE name = 'Backdrops & Draping' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/table-styling-and-centerpieces_default.png' WHERE name = 'Table Styling & Centerpieces' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/lighting-design_default.png' WHERE name = 'Lighting Design' AND parent_id IS NOT NULL;

-- Rentals & Equipment Supply subcategories
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/tables_chairs_linens.png' WHERE name = 'Tables, Chairs & Linens' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/tents.png' WHERE name = 'Tents' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/stages_flooring.png' WHERE name = 'Stages & Flooring' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/tableware_glassware_bars.png' WHERE name = 'Tableware, Glassware & Bars' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/dance_floors_lounge_furniture.png' WHERE name = 'Dance Floors & Lounge Furniture' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/generators_heaters_restrooms.png' WHERE name = 'Generators, Heaters & Restrooms' AND parent_id IS NOT NULL;

-- Photography, Videography & Production subcategories
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/event_photography.png' WHERE name = 'Event Photography' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/wedding_portrait_videography.png' WHERE name = 'Wedding & Portrait Videography' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/drone_footage.png' WHERE name = 'Drone Footage' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/live_streaming_services.png' WHERE name = 'Live Streaming Services' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/graphic_design_event_branding.png' WHERE name = 'Graphic Design & Event Branding' AND parent_id IS NOT NULL;

-- Beauty, Style & Personal Services subcategories
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/makeup-and-hair-artists_default.png' WHERE name = 'Makeup & Hair Artists' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/braiding_default.png' WHERE name = 'Braiding' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/wardrobe-and-fashion-stylists_default.png' WHERE name = 'Wardrobe & Fashion Stylists' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/nail-and-spa-onsite-services_default.png' WHERE name = 'Nail & Spa On-Site Services' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/barber-and-grooming-services_default.png' WHERE name = 'Barber & Grooming Services' AND parent_id IS NOT NULL;

-- Kids & Family Party Services subcategories
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/birthday_party_planners.png' WHERE name = 'Birthday Party Planners' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/bouncy_castles_inflatables.png' WHERE name = 'Bouncy Castles & Inflatables' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/character_entertainment.png' WHERE name = 'Character Entertainment' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/craft_activity_stations.png' WHERE name = 'Craft & Activity Stations' AND parent_id IS NOT NULL;

-- Event Tech & Logistics subcategories
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/av_setup.png' WHERE name = 'AV Setup' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/event_ticketing_registration.png' WHERE name = 'Event Ticketing & Registration' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/security_crowd_control.png' WHERE name = 'Security & Crowd Control' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/transport_valet_parking_management.png' WHERE name = 'Transport, Valet & Parking Management' AND parent_id IS NOT NULL;

-- Printing, Customization & Favors subcategories
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/invitation_design_printing.png' WHERE name = 'Invitation Design & Printing' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/party_favors_gift_bags.png' WHERE name = 'Party Favors & Gift Bags' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/custom_merchandise.png' WHERE name = 'Custom Merchandise' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/signage_labels_banners.png' WHERE name = 'Signage, Labels & Banners' AND parent_id IS NOT NULL;

-- Handyman & Home Support Services subcategories
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/tv_mounting_unmounting_services.png' WHERE name = 'TV Mounting & Unmounting Services' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/furniture_assembly_installation.png' WHERE name = 'Furniture Assembly & Installation' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/picture_art_curtain_hanging.png' WHERE name = 'Picture, Art & Curtain Hanging' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/moving_help_event_setup.png' WHERE name = 'Moving Help & Event Setup' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/fixture_repair_light_installation.png' WHERE name = 'Fixture Repair & Light Installation' AND parent_id IS NOT NULL;

-- Delivery, Setup & Cleanup subcategories
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/event-setup-and-breakdown-crews_default.png' WHERE name = 'Event Setup & Breakdown Crews' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/cleaning-and-sanitization-teams_default.png' WHERE name = 'Cleaning & Sanitization Teams' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/waste-management-and-recycling_default.png' WHERE name = 'Waste Management & Recycling' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/linen-and-dish-return-services_default.png' WHERE name = 'Linen & Dish Return Services' AND parent_id IS NOT NULL;

-- Specialty & Seasonal Services subcategories
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/holiday_party_setup.png' WHERE name = 'Holiday Party Setup' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/cultural_or_religious_ceremonies.png' WHERE name = 'Cultural or Religious Ceremonies' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/proposal_engagement_setup.png' WHERE name = 'Proposal & Engagement Setup' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/festival_booth_design.png' WHERE name = 'Festival Booth Design' AND parent_id IS NOT NULL;
UPDATE categories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/pop_up_brand_activation_events.png' WHERE name = 'Pop-Up & Brand Activation Events' AND parent_id IS NOT NULL;
