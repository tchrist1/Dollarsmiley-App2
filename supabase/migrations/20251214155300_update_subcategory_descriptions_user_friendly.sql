/*
  # Update Subcategory Descriptions to User-Friendly Text

  1. Changes
    - Updates all subcategory descriptions from image-generation prompts to customer-facing descriptions
    - Affects display in Post a Job and Create Service Listing category selectors
    - Does not change names, IDs, images, or any other fields

  2. Scope
    - All subcategories across all categories
    - Description field only
*/

-- Event Planning & Coordination
UPDATE subcategories SET description = 'End-to-end planning and coordination for events of any size or type.' WHERE name = 'Full-Service Event Planning';
UPDATE subcategories SET description = 'Complete planning and coordination for weddings, from concept to execution.' WHERE name = 'Wedding Planning';
UPDATE subcategories SET description = 'Professional management of meetings, conferences, and corporate events.' WHERE name = 'Corporate Event Management';
UPDATE subcategories SET description = 'Planning and coordination for social gatherings and community celebrations.' WHERE name = 'Social & Community Events';
UPDATE subcategories SET description = 'On-site coordination to ensure events run smoothly on the event day.' WHERE name = 'Day-of Coordination';

-- Venue & Space Rentals
UPDATE subcategories SET description = 'Indoor venues suitable for formal events, receptions, and large gatherings.' WHERE name = 'Banquet Halls & Ballrooms';
UPDATE subcategories SET description = 'Open-air spaces ideal for outdoor ceremonies and celebrations.' WHERE name = 'Outdoor Gardens & Parks';
UPDATE subcategories SET description = 'Residential spaces available for private events and small gatherings.' WHERE name = 'Private Homes & Airbnb Venues';
UPDATE subcategories SET description = 'Scenic venues offering rooftop or waterfront event settings.' WHERE name = 'Rooftop & Waterfront Spaces';
UPDATE subcategories SET description = 'Large multipurpose spaces for expos, conventions, and public events.' WHERE name = 'Community & Convention Centers';

-- Catering & Food Services
UPDATE subcategories SET description = 'Complete food service including preparation, delivery, setup, and service staff.' WHERE name = 'Full-Service Catering';
UPDATE subcategories SET description = 'Self-serve or attended food stations for events and celebrations.' WHERE name = 'Buffets & Food Stations';
UPDATE subcategories SET description = 'Professional beverage service, including bartenders and drink menus.' WHERE name = 'Beverage & Bartending';
UPDATE subcategories SET description = 'Custom cakes and dessert offerings for events and special occasions.' WHERE name = 'Specialty Desserts & Cakes';
UPDATE subcategories SET description = 'Mobile food and beverage services brought directly to event locations.' WHERE name = 'Food Trucks & Mobile Bars';
UPDATE subcategories SET description = 'Personalized chef services for private dinners and exclusive events.' WHERE name = 'Private Chefs';
UPDATE subcategories SET description = 'Authentic cultural and traditional food services for diverse celebrations.' WHERE name = 'Cultural Cuisine';

-- Entertainment & Music
UPDATE subcategories SET description = 'Music entertainment services including DJs and live performers.' WHERE name = 'DJs & Live Bands';
UPDATE subcategories SET description = 'Professional hosts to guide programs and engage event audiences.' WHERE name = 'Emcees & Hosts';
UPDATE subcategories SET description = 'Dance performances for entertainment and special event features.' WHERE name = 'Dancers';
UPDATE subcategories SET description = 'Live magic and comedy acts for event entertainment.' WHERE name = 'Magicians & Comedians';
UPDATE subcategories SET description = 'Entertainment services designed specifically for children''s events.' WHERE name = 'Kids'' Entertainment';
UPDATE subcategories SET description = 'Interactive photo and video booth rentals for guest engagement.' WHERE name = 'Photo Booth & 360 Booth Rentals';

-- Decor, Design & Florals
UPDATE subcategories SET description = 'Custom floral designs and arrangements for events and special occasions.' WHERE name = 'Floral Design & Arrangements';
UPDATE subcategories SET description = 'Balloon installations and decorative arches for celebrations and events.' WHERE name = 'Balloon Decor & Arches';
UPDATE subcategories SET description = 'Decorative backdrops and draping to enhance event spaces.' WHERE name = 'Backdrops & Draping';
UPDATE subcategories SET description = 'Coordinated table decor and centerpieces for event setups.' WHERE name = 'Table Styling & Centerpieces';
UPDATE subcategories SET description = 'Decorative and functional lighting solutions for events.' WHERE name = 'Lighting Design';

-- Rentals & Equipment Supply
UPDATE subcategories SET description = 'Rental of tables, seating, and linens for events and gatherings.' WHERE name = 'Tables, Chairs & Linens';
UPDATE subcategories SET description = 'Temporary tent structures for outdoor and covered events.' WHERE name = 'Tents';
UPDATE subcategories SET description = 'Staging platforms and flooring rentals for performances and events.' WHERE name = 'Stages & Flooring';
UPDATE subcategories SET description = 'Rental of dining ware, glassware, and bar equipment.' WHERE name = 'Tableware, Glassware & Bars';
UPDATE subcategories SET description = 'Dance floors and lounge-style furniture rentals for events.' WHERE name = 'Dance Floors & Lounge Furniture';
UPDATE subcategories SET description = 'Utility equipment rentals to support outdoor and large-scale events.' WHERE name = 'Generators, Heaters & Restrooms';

-- Photography, Videography & Production
UPDATE subcategories SET description = 'Professional photography services for events and celebrations.' WHERE name = 'Event Photography';
UPDATE subcategories SET description = 'Video services capturing weddings and personal milestones.' WHERE name = 'Wedding & Portrait Videography';
UPDATE subcategories SET description = 'Aerial video and photography services for events and venues.' WHERE name = 'Drone Footage';
UPDATE subcategories SET description = 'Broadcasting and streaming services for virtual and hybrid events.' WHERE name = 'Live Streaming Services';
UPDATE subcategories SET description = 'Custom design services for event branding and promotional materials.' WHERE name = 'Graphic Design & Event Branding';

-- Beauty, Style & Personal Services
UPDATE subcategories SET description = 'Professional hair and makeup services for events and special occasions.' WHERE name = 'Makeup & Hair Artists';
UPDATE subcategories SET description = 'Professional hair braiding services for events and personal styling.' WHERE name = 'Braiding';
UPDATE subcategories SET description = 'Styling services for outfits, looks, and event appearances.' WHERE name = 'Wardrobe & Fashion Stylists';
UPDATE subcategories SET description = 'Mobile nail and spa services provided at event locations.' WHERE name = 'Nail & Spa On-Site Services';
UPDATE subcategories SET description = 'Professional grooming and barber services for events and clients.' WHERE name = 'Barber & Grooming Services';

-- Kids & Family Party Services
UPDATE subcategories SET description = 'Planning and coordination services for children''s birthday parties.' WHERE name = 'Birthday Party Planners';
UPDATE subcategories SET description = 'Inflatable entertainment rentals for kids'' parties and events.' WHERE name = 'Bouncy Castles & Inflatables';
UPDATE subcategories SET description = 'Costumed character appearances for children''s events.' WHERE name = 'Character Entertainment';
UPDATE subcategories SET description = 'Creative activity stations designed for children''s engagement.' WHERE name = 'Craft & Activity Stations';

-- Event Tech & Logistics
UPDATE subcategories SET description = 'Audio and visual equipment setup for events and presentations.' WHERE name = 'AV Setup';
UPDATE subcategories SET description = 'Ticketing, check-in, and guest registration services.' WHERE name = 'Event Ticketing & Registration';
UPDATE subcategories SET description = 'Event security services to manage access and crowd safety.' WHERE name = 'Security & Crowd Control';
UPDATE subcategories SET description = 'Transportation coordination and parking management services.' WHERE name = 'Transport, Valet & Parking Management';

-- Printing, Customization & Favors
UPDATE subcategories SET description = 'Custom invitation design and printing for events.' WHERE name = 'Invitation Design & Printing';
UPDATE subcategories SET description = 'Customized party favors and gift bags for guests.' WHERE name = 'Party Favors & Gift Bags';
UPDATE subcategories SET description = 'Branded merchandise and customized event products.' WHERE name = 'Custom Merchandise';
UPDATE subcategories SET description = 'Custom signage, labels, and banners for events and promotions.' WHERE name = 'Signage, Labels & Banners';

-- Handyman & Home Support Services
UPDATE subcategories SET description = 'Professional mounting and removal of televisions.' WHERE name = 'TV Mounting & Unmounting Services';
UPDATE subcategories SET description = 'Assembly and installation of furniture and fixtures.' WHERE name = 'Furniture Assembly & Installation';
UPDATE subcategories SET description = 'Professional hanging of artwork, mirrors, and curtains.' WHERE name = 'Picture, Art & Curtain Hanging';
UPDATE subcategories SET description = 'Assistance with moving items and setting up event spaces.' WHERE name = 'Moving Help & Event Setup';
UPDATE subcategories SET description = 'Minor repairs and light fixture installation services.' WHERE name = 'Fixture Repair & Light Installation';

-- Delivery, Setup & Cleanup
UPDATE subcategories SET description = 'Crews responsible for event setup and post-event breakdown.' WHERE name = 'Event Setup & Breakdown Crews';
UPDATE subcategories SET description = 'Professional cleaning and sanitization services for events.' WHERE name = 'Cleaning & Sanitization Teams';
UPDATE subcategories SET description = 'Waste removal and recycling services for event venues.' WHERE name = 'Waste Management & Recycling';
UPDATE subcategories SET description = 'Collection and return of rented linens and dishware.' WHERE name = 'Linen & Dish Return Services';

-- Specialty & Seasonal Services
UPDATE subcategories SET description = 'Seasonal decor and setup services for holiday events.' WHERE name = 'Holiday Party Setup';
UPDATE subcategories SET description = 'Services supporting cultural and religious ceremonies.' WHERE name = 'Cultural or Religious Ceremonies';
UPDATE subcategories SET description = 'Planning and setup for proposals and engagement events.' WHERE name = 'Proposal & Engagement Setup';
UPDATE subcategories SET description = 'Design and setup of booths for festivals and fairs.' WHERE name = 'Festival Booth Design';
UPDATE subcategories SET description = 'Setup and coordination for pop-up shops and brand activations.' WHERE name = 'Pop-Up & Brand Activation Events';
