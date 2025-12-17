/*
  # Update All Subcategory Image URLs
  
  Updates image URLs for all subcategories to use the new Supabase storage URLs.
  This migration updates only the image_url field for each subcategory.
*/

-- Event Planning & Coordination
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/corporate-event-management_default.png' WHERE name = 'Corporate Event Management';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/day-of-coordination_default.png' WHERE name = 'Day-of Coordination';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/full-service-event-planning_default.png' WHERE name = 'Full-Service Event Planning';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/social-and-community-events_default.png' WHERE name = 'Social & Community Events';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/wedding-planning_default.png' WHERE name = 'Wedding Planning';

-- Venue & Space Rentals
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/banquet_halls_ballrooms.png' WHERE name = 'Banquet Halls & Ballrooms';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/community_convention_centers.png' WHERE name = 'Community & Convention Centers';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/outdoor_gardens_parks.png' WHERE name = 'Outdoor Gardens & Parks';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/private_homes_airbnb_venues.png' WHERE name = 'Private Homes & Airbnb Venues';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/rooftop_waterfront_spaces.png' WHERE name = 'Rooftop & Waterfront Spaces';

-- Catering & Food Services
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/beverage-and-bartending_default.png' WHERE name = 'Beverage & Bartending';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/buffets-and-food-stations_default.png' WHERE name = 'Buffets & Food Stations';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/cultural-cuisine_default.png' WHERE name = 'Cultural Cuisine';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/food-trucks-and-mobile-bars_default.png' WHERE name = 'Food Trucks & Mobile Bars';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/full-service-catering_default.png' WHERE name = 'Full-Service Catering';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/private-chefs_default.png' WHERE name = 'Private Chefs';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/specialty-desserts-and-cakes_default.png' WHERE name = 'Specialty Desserts & Cakes';

-- Entertainment & Music
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/djs-and-live-bands_default.png' WHERE name = 'DJs & Live Bands';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/emcees-and-hosts_default.png' WHERE name = 'Emcees & Hosts';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/dancers_default.png' WHERE name = 'Dancers';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/magicians-and-comedians_default.png' WHERE name = 'Magicians & Comedians';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/kids-entertainment_default.png' WHERE name = 'Kids'' Entertainment';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/photo-booth-and-360-booth-rentals_default.png' WHERE name = 'Photo Booth & 360 Booth Rentals';

-- Décor, Design & Florals
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/floral-design-and-arrangements_default.png' WHERE name = 'Floral Design & Arrangements';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/decor-and-arches_default.png' WHERE name = 'Balloon Décor & Arches';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/backdrops-and-draping_default.png' WHERE name = 'Backdrops & Draping';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/table-styling-and-centerpieces_default.png' WHERE name = 'Table Styling & Centerpieces';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/lighting-design_default.png' WHERE name = 'Lighting Design';

-- Rentals & Equipment Supply
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/tables_chairs_linens.png' WHERE name = 'Tables, Chairs & Linens';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/tents.png' WHERE name = 'Tents';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/stages_flooring.png' WHERE name = 'Stages & Flooring';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/tableware_glassware_bars.png' WHERE name = 'Tableware, Glassware & Bars';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/dance_floors_lounge_furniture.png' WHERE name = 'Dance Floors & Lounge Furniture';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/generators_heaters_restrooms.png' WHERE name = 'Generators, Heaters & Restrooms';

-- Photography, Videography & Production
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/event_photography.png' WHERE name = 'Event Photography';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/wedding_portrait_videography.png' WHERE name = 'Wedding & Portrait Videography';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/drone_footage.png' WHERE name = 'Drone Footage';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/live_streaming_services.png' WHERE name = 'Live Streaming Services';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/graphic_design_event_branding.png' WHERE name = 'Graphic Design & Event Branding';

-- Beauty, Style & Personal Services
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/makeup-and-hair-artists_default.png' WHERE name = 'Makeup & Hair Artists';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/braiding_default.png' WHERE name = 'Braiding';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/wardrobe-and-fashion-stylists_default.png' WHERE name = 'Wardrobe & Fashion Stylists';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/nail-and-spa-onsite-services_default.png' WHERE name = 'Nail & Spa On-Site Services';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/barber-and-grooming-services_default.png' WHERE name = 'Barber & Grooming Services';

-- Kids & Family Party Services
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/birthday_party_planners.png' WHERE name = 'Birthday Party Planners';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/bouncy_castles_inflatables.png' WHERE name = 'Bouncy Castles & Inflatables';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/character_entertainment.png' WHERE name = 'Character Entertainment';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/craft_activity_stations.png' WHERE name = 'Craft & Activity Stations';

-- Event Tech & Logistics
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/av_setup.png' WHERE name = 'AV Setup';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/event_ticketing_registration.png' WHERE name = 'Event Ticketing & Registration';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/security_crowd_control.png' WHERE name = 'Security & Crowd Control';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/transport_valet_parking_management.png' WHERE name = 'Transport, Valet & Parking Management';

-- Printing, Customization & Favors
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/invitation_design_printing.png' WHERE name = 'Invitation Design & Printing';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/party_favors_gift_bags.png' WHERE name = 'Party Favors & Gift Bags';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/custom_merchandise.png' WHERE name = 'Custom Merchandise';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/signage_labels_banners.png' WHERE name = 'Signage, Labels & Banners';

-- Handyman & Home Support Services
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/tv_mounting_unmounting_services.png' WHERE name = 'TV Mounting & Unmounting Services';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/furniture_assembly_installation.png' WHERE name = 'Furniture Assembly & Installation';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/picture_art_curtain_hanging.png' WHERE name = 'Picture, Art & Curtain Hanging';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/moving_help_event_setup.png' WHERE name = 'Moving Help & Event Setup';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/fixture_repair_light_installation.png' WHERE name = 'Fixture Repair & Light Installation';

-- Delivery, Setup & Cleanup
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/event-setup-and-breakdown-crews_default.png' WHERE name = 'Event Setup & Breakdown Crews';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/cleaning-and-sanitization-teams_default.png' WHERE name = 'Cleaning & Sanitization Teams';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/waste-management-and-recycling_default.png' WHERE name = 'Waste Management & Recycling';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/linen-and-dish-return-services_default.png' WHERE name = 'Linen & Dish Return Services';

-- Specialty & Seasonal Services
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/holiday_party_setup.png' WHERE name = 'Holiday Party Setup';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/cultural_or_religious_ceremonies.png' WHERE name = 'Cultural or Religious Ceremonies';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/proposal_engagement_setup.png' WHERE name = 'Proposal & Engagement Setup';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/festival_booth_design.png' WHERE name = 'Festival Booth Design';
UPDATE subcategories SET image_url = 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/public/category-images/subcategoriesimages/pop_up_brand_activation_events.png' WHERE name = 'Pop-Up & Brand Activation Events';
