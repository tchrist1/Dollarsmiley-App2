/*
  # Update Subcategory Descriptions to User-Friendly Text

  1. Changes
    - Updates all 70 subcategory descriptions from image generation prompts to user-friendly descriptions
    - Each description now clearly explains what the service category offers to customers

  2. Categories Updated
    - Beauty, Style & Personal Services (5 subcategories)
    - Catering & Food Services (7 subcategories)
    - Decor, Design & Florals (5 subcategories)
    - Delivery, Setup & Cleanup (4 subcategories)
    - Entertainment & Music (6 subcategories)
    - Event Planning & Coordination (5 subcategories)
    - Event Tech & Logistics (4 subcategories)
    - Handyman & Home Support Services (5 subcategories)
    - Kids & Family Party Services (4 subcategories)
    - Photography, Videography & Production (5 subcategories)
    - Printing, Customization & Favors (4 subcategories)
    - Rentals & Equipment Supply (6 subcategories)
    - Specialty & Seasonal Services (5 subcategories)
    - Venue & Space Rentals (5 subcategories)
*/

-- Beauty, Style & Personal Services
UPDATE categories SET description = 'Professional haircuts, beard trims, and grooming services that come to you or your event.'
WHERE name = 'Barber & Grooming Services' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Expert braiders offering box braids, cornrows, twists, locs, and protective styles for all hair types.'
WHERE name = 'Braiding' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Skilled makeup artists and hairstylists for weddings, photoshoots, proms, and special occasions.'
WHERE name = 'Makeup & Hair Artists' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Mobile manicures, pedicures, facials, and spa treatments brought directly to your location.'
WHERE name = 'Nail & Spa On-Site Services' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Personal stylists who help you look your best with outfit selection, wardrobe planning, and fashion advice.'
WHERE name = 'Wardrobe & Fashion Stylists' AND parent_id IS NOT NULL;

-- Catering & Food Services
UPDATE categories SET description = 'Professional bartenders and mixologists for cocktails, mocktails, and beverage service at your event.'
WHERE name = 'Beverage & Bartending' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Self-serve buffet setups and themed food stations for parties, receptions, and corporate events.'
WHERE name = 'Buffets & Food Stations' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Authentic cuisines from around the world including Mexican, Indian, Asian, Caribbean, and more.'
WHERE name = 'Cultural Cuisine' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Mobile food trucks and portable bars that bring delicious food and drinks to your outdoor event.'
WHERE name = 'Food Trucks & Mobile Bars' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Complete catering packages with menu planning, cooking, serving staff, and cleanup included.'
WHERE name = 'Full-Service Catering' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Personal chefs who prepare custom meals in your home for intimate dinners and special occasions.'
WHERE name = 'Private Chefs' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Custom cakes, cupcakes, pastries, and dessert tables for weddings, birthdays, and celebrations.'
WHERE name = 'Specialty Desserts & Cakes' AND parent_id IS NOT NULL;

-- Decor, Design & Florals
UPDATE categories SET description = 'Elegant fabric draping, photo backdrops, and stage decorations to transform your venue.'
WHERE name = 'Backdrops & Draping' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Custom balloon arrangements, arches, columns, and sculptures for parties and celebrations.'
WHERE name = 'Balloon Décor & Arches' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Beautiful flower arrangements, bouquets, centerpieces, and floral installations for any occasion.'
WHERE name = 'Floral Design & Arrangements' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Ambient uplighting, string lights, spotlights, and creative lighting effects for events.'
WHERE name = 'Lighting Design' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Elegant table settings, centerpieces, place cards, and coordinated dining decor.'
WHERE name = 'Table Styling & Centerpieces' AND parent_id IS NOT NULL;

-- Delivery, Setup & Cleanup
UPDATE categories SET description = 'Professional cleaning crews to sanitize and prepare your venue before and after events.'
WHERE name = 'Cleaning & Sanitization Teams' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Experienced crews to set up tables, chairs, decor, and break down everything after your event.'
WHERE name = 'Event Setup & Breakdown Crews' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Convenient pickup and return services for rental linens, dishes, and tableware.'
WHERE name = 'Linen & Dish Return Services' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Eco-friendly waste disposal, recycling stations, and trash removal for events of all sizes.'
WHERE name = 'Waste Management & Recycling' AND parent_id IS NOT NULL;

-- Entertainment & Music
UPDATE categories SET description = 'Professional dancers and dance groups for performances, flash mobs, and entertainment.'
WHERE name = 'Dancers' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'DJs, live bands, and musicians to keep your guests entertained with great music all night.'
WHERE name = 'DJs & Live Bands' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Charismatic hosts and MCs to guide your event, make announcements, and engage your audience.'
WHERE name = 'Emcees & Hosts' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Fun entertainers for children including clowns, face painters, balloon artists, and performers.'
WHERE name = 'Kids'' Entertainment' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Amazing magicians, stand-up comedians, and variety performers for memorable entertainment.'
WHERE name = 'Magicians & Comedians' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Interactive photo booths, 360 video booths, and selfie stations with props and instant prints.'
WHERE name = 'Photo Booth & 360 Booth Rentals' AND parent_id IS NOT NULL;

-- Event Planning & Coordination
UPDATE categories SET description = 'Expert planners for conferences, team meetings, product launches, and business gatherings.'
WHERE name = 'Corporate Event Management' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Professional coordinators who manage all the details on your event day so you can relax.'
WHERE name = 'Day-of Coordination' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Complete event planning from concept to execution, handling every detail of your celebration.'
WHERE name = 'Full-Service Event Planning' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Planners for community gatherings, fundraisers, reunions, and social celebrations.'
WHERE name = 'Social & Community Events' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Dedicated wedding planners to create your perfect day from engagement to reception.'
WHERE name = 'Wedding Planning' AND parent_id IS NOT NULL;

-- Event Tech & Logistics
UPDATE categories SET description = 'Sound systems, microphones, projectors, screens, and complete audio-visual equipment setup.'
WHERE name = 'AV Setup' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Online registration systems, ticket sales, check-in apps, and guest management solutions.'
WHERE name = 'Event Ticketing & Registration' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Professional security guards, crowd management, and safety personnel for your event.'
WHERE name = 'Security & Crowd Control' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Shuttle services, valet parking, and transportation coordination for guests.'
WHERE name = 'Transport, Valet & Parking Management' AND parent_id IS NOT NULL;

-- Handyman & Home Support Services
UPDATE categories SET description = 'Electrical repairs, light fixture installation, and general fixture maintenance services.'
WHERE name = 'Fixture Repair & Light Installation' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Assembly of flat-pack furniture, shelving units, and installation of home fixtures.'
WHERE name = 'Furniture Assembly & Installation' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Help with moving furniture, loading trucks, and setting up for events or relocations.'
WHERE name = 'Moving Help & Event Setup' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Professional hanging of artwork, mirrors, curtains, and wall decorations.'
WHERE name = 'Picture, Art & Curtain Hanging' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Expert TV mounting on walls plus cable management and safe unmounting services.'
WHERE name = 'TV Mounting & Unmounting Services' AND parent_id IS NOT NULL;

-- Kids & Family Party Services
UPDATE categories SET description = 'Creative party planners specializing in memorable birthday celebrations for all ages.'
WHERE name = 'Birthday Party Planners' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Bounce houses, inflatable slides, obstacle courses, and fun attractions for kids parties.'
WHERE name = 'Bouncy Castles & Inflatables' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Costumed characters, princesses, superheroes, and mascots to delight children at parties.'
WHERE name = 'Character Entertainment' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Interactive arts and crafts stations, science experiments, and creative activities for kids.'
WHERE name = 'Craft & Activity Stations' AND parent_id IS NOT NULL;

-- Photography, Videography & Production
UPDATE categories SET description = 'Aerial photography and video capture using professional drones for stunning perspectives.'
WHERE name = 'Drone Footage' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Professional photographers capturing your special moments at events and celebrations.'
WHERE name = 'Event Photography' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Custom logos, invitations, signage, and visual branding for your event or business.'
WHERE name = 'Graphic Design & Event Branding' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Professional live streaming to share your event with remote guests in real-time.'
WHERE name = 'Live Streaming Services' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Cinematic video coverage of weddings, portraits, and special life moments.'
WHERE name = 'Wedding & Portrait Videography' AND parent_id IS NOT NULL;

-- Printing, Customization & Favors
UPDATE categories SET description = 'Custom t-shirts, hats, mugs, and branded items for events, teams, and businesses.'
WHERE name = 'Custom Merchandise' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Beautiful custom invitations, save-the-dates, and printed materials for your event.'
WHERE name = 'Invitation Design & Printing' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Customized party favors, gift bags, and thank-you gifts for your guests.'
WHERE name = 'Party Favors & Gift Bags' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Custom signs, banners, labels, and printed displays for events and promotions.'
WHERE name = 'Signage, Labels & Banners' AND parent_id IS NOT NULL;

-- Rentals & Equipment Supply
UPDATE categories SET description = 'Portable dance floors, lounge seating, sofas, and stylish furniture for events.'
WHERE name = 'Dance Floors & Lounge Furniture' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Power generators, outdoor heaters, cooling fans, and portable restroom facilities.'
WHERE name = 'Generators, Heaters & Restrooms' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Elevated stages, platforms, and specialty flooring for performances and events.'
WHERE name = 'Stages & Flooring' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Event furniture including tables, chairs, linens, and seating for any occasion.'
WHERE name = 'Tables, Chairs & Linens' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Plates, glasses, silverware, serving pieces, and portable bar setups for events.'
WHERE name = 'Tableware, Glassware & Bars' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Party tents, canopies, and covered structures for outdoor events and gatherings.'
WHERE name = 'Tents' AND parent_id IS NOT NULL;

-- Specialty & Seasonal Services
UPDATE categories SET description = 'Officiants and coordinators for religious ceremonies, cultural traditions, and rituals.'
WHERE name = 'Cultural or Religious Ceremonies' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Creative booth designs and setups for festivals, fairs, and market events.'
WHERE name = 'Festival Booth Design' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Themed decorations and party planning for Christmas, Halloween, and seasonal celebrations.'
WHERE name = 'Holiday Party Setup' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Experiential marketing setups, product launches, and brand activation events.'
WHERE name = 'Pop-Up & Brand Activation Events' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Romantic proposal setups, engagement party planning, and celebration coordination.'
WHERE name = 'Proposal & Engagement Setup' AND parent_id IS NOT NULL;

-- Venue & Space Rentals
UPDATE categories SET description = 'Elegant indoor venues with catering facilities for weddings, galas, and formal events.'
WHERE name = 'Banquet Halls & Ballrooms' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Large multi-purpose spaces for conferences, expos, and community gatherings.'
WHERE name = 'Community & Convention Centers' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Beautiful outdoor venues including gardens, parks, and natural settings for events.'
WHERE name = 'Outdoor Gardens & Parks' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Unique private homes and vacation rentals available for intimate events and gatherings.'
WHERE name = 'Private Homes & Airbnb Venues' AND parent_id IS NOT NULL;

UPDATE categories SET description = 'Scenic rooftop terraces and waterfront locations with stunning views for events.'
WHERE name = 'Rooftop & Waterfront Spaces' AND parent_id IS NOT NULL;