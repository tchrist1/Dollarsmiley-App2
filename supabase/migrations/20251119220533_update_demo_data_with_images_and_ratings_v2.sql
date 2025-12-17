/*
  # Update Demo Data with Images and Ratings

  1. Updates
    - Add profile images to all provider profiles (avatar_url)
    - Add thumbnail images to all service listings (photos array)
    - Add realistic ratings and review counts to all profiles
    - Ensure all data displays properly on Home, Discover, Categories, and Search

  2. Data Updates
    - Profile images: Use professional Pexels stock photos
    - Service images: Use relevant service/business Pexels photos
    - Ratings: Random realistic values between 4.0-5.0
    - Review counts: Random values between 5-150

  3. Notes
    - Updates existing demo data without deletion
    - All images are from Pexels and guaranteed to work
    - Photos stored as JSONB array with url and caption
*/

-- Update profiles with avatar images and ratings
UPDATE profiles
SET 
  avatar_url = CASE 
    WHEN full_name ILIKE '%royal av%' THEN 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400'
    WHEN full_name ILIKE '%premier backdrop%' THEN 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400'
    WHEN full_name ILIKE '%professional backdrop%' THEN 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=400'
    WHEN full_name ILIKE '%expert backdrop%' THEN 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400'
    WHEN full_name ILIKE '%master backdrop%' THEN 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400'
    WHEN full_name ILIKE '%signature backdrop%' THEN 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400'
    WHEN full_name ILIKE '%elite%' THEN 'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=400'
    WHEN full_name ILIKE '%creative%' THEN 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400'
    WHEN full_name ILIKE '%ultimate%' THEN 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=400'
    WHEN full_name ILIKE '%premium%' THEN 'https://images.pexels.com/photos/1181391/pexels-photo-1181391.jpeg?auto=compress&cs=tinysrgb&w=400'
    ELSE 'https://images.pexels.com/photos/1372134/pexels-photo-1372134.jpeg?auto=compress&cs=tinysrgb&w=400'
  END,
  rating_average = ROUND((4.0 + (RANDOM() * 1.0))::numeric, 1),
  rating_count = FLOOR(5 + (RANDOM() * 145))::integer
WHERE user_type = 'provider' AND full_name IS NOT NULL;

-- Update service_listings with photos array (JSONB format)
UPDATE service_listings
SET 
  photos = CASE
    -- Event Services
    WHEN title ILIKE '%dj%' OR title ILIKE '%audio%' THEN 
      '[{"url": "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Professional DJ Services"}]'::jsonb
    WHEN title ILIKE '%photo%' OR title ILIKE '%videograph%' THEN 
      '[{"url": "https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Professional Photography"}]'::jsonb
    WHEN title ILIKE '%backdrop%' OR title ILIKE '%draping%' THEN 
      '[{"url": "https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Event Backdrop & Draping"}]'::jsonb
    WHEN title ILIKE '%flower%' OR title ILIKE '%floral%' THEN 
      '[{"url": "https://images.pexels.com/photos/1128797/pexels-photo-1128797.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Floral Arrangements"}]'::jsonb
    WHEN title ILIKE '%cater%' OR title ILIKE '%food%' THEN 
      '[{"url": "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Catering Services"}]'::jsonb
    WHEN title ILIKE '%event plan%' OR title ILIKE '%coordinator%' THEN 
      '[{"url": "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Event Planning"}]'::jsonb
    WHEN title ILIKE '%bar%' OR title ILIKE '%bartend%' THEN 
      '[{"url": "https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Bartending Services"}]'::jsonb
    WHEN title ILIKE '%cake%' OR title ILIKE '%bakery%' THEN 
      '[{"url": "https://images.pexels.com/photos/1721932/pexels-photo-1721932.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Custom Cakes"}]'::jsonb
    
    -- Home Services
    WHEN title ILIKE '%clean%' THEN 
      '[{"url": "https://images.pexels.com/photos/4239146/pexels-photo-4239146.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Professional Cleaning"}]'::jsonb
    WHEN title ILIKE '%paint%' THEN 
      '[{"url": "https://images.pexels.com/photos/1669754/pexels-photo-1669754.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Painting Services"}]'::jsonb
    WHEN title ILIKE '%plumb%' THEN 
      '[{"url": "https://images.pexels.com/photos/8346877/pexels-photo-8346877.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Plumbing Services"}]'::jsonb
    WHEN title ILIKE '%electric%' THEN 
      '[{"url": "https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Electrical Services"}]'::jsonb
    WHEN title ILIKE '%landscape%' OR title ILIKE '%lawn%' THEN 
      '[{"url": "https://images.pexels.com/photos/1453499/pexels-photo-1453499.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Landscaping Services"}]'::jsonb
    WHEN title ILIKE '%handyman%' OR title ILIKE '%repair%' THEN 
      '[{"url": "https://images.pexels.com/photos/5691621/pexels-photo-5691621.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Handyman Services"}]'::jsonb
    WHEN title ILIKE '%hvac%' OR title ILIKE '%air%' THEN 
      '[{"url": "https://images.pexels.com/photos/1409999/pexels-photo-1409999.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "HVAC Services"}]'::jsonb
    
    -- Beauty & Wellness
    WHEN title ILIKE '%hair%' OR title ILIKE '%stylist%' THEN 
      '[{"url": "https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Hair Styling"}]'::jsonb
    WHEN title ILIKE '%makeup%' THEN 
      '[{"url": "https://images.pexels.com/photos/3764568/pexels-photo-3764568.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Makeup Services"}]'::jsonb
    WHEN title ILIKE '%massage%' OR title ILIKE '%spa%' THEN 
      '[{"url": "https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Spa & Massage"}]'::jsonb
    WHEN title ILIKE '%nail%' OR title ILIKE '%manicure%' THEN 
      '[{"url": "https://images.pexels.com/photos/3997379/pexels-photo-3997379.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Nail Services"}]'::jsonb
    WHEN title ILIKE '%fitness%' OR title ILIKE '%personal train%' THEN 
      '[{"url": "https://images.pexels.com/photos/416809/pexels-photo-416809.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Fitness Training"}]'::jsonb
    WHEN title ILIKE '%yoga%' THEN 
      '[{"url": "https://images.pexels.com/photos/3822583/pexels-photo-3822583.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Yoga Classes"}]'::jsonb
    
    -- Professional Services
    WHEN title ILIKE '%tutor%' OR title ILIKE '%teach%' THEN 
      '[{"url": "https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Tutoring Services"}]'::jsonb
    WHEN title ILIKE '%music%' OR title ILIKE '%lesson%' THEN 
      '[{"url": "https://images.pexels.com/photos/1407322/pexels-photo-1407322.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Music Lessons"}]'::jsonb
    WHEN title ILIKE '%legal%' OR title ILIKE '%attorney%' THEN 
      '[{"url": "https://images.pexels.com/photos/5668772/pexels-photo-5668772.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Legal Services"}]'::jsonb
    WHEN title ILIKE '%account%' OR title ILIKE '%tax%' THEN 
      '[{"url": "https://images.pexels.com/photos/6863332/pexels-photo-6863332.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Accounting Services"}]'::jsonb
    WHEN title ILIKE '%consult%' THEN 
      '[{"url": "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Consulting Services"}]'::jsonb
    WHEN title ILIKE '%design%' OR title ILIKE '%graphic%' THEN 
      '[{"url": "https://images.pexels.com/photos/196645/pexels-photo-196645.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Design Services"}]'::jsonb
    WHEN title ILIKE '%web%' OR title ILIKE '%develop%' THEN 
      '[{"url": "https://images.pexels.com/photos/270348/pexels-photo-270348.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Web Development"}]'::jsonb
    WHEN title ILIKE '%market%' THEN 
      '[{"url": "https://images.pexels.com/photos/265087/pexels-photo-265087.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Marketing Services"}]'::jsonb
    
    -- Transportation & Moving
    WHEN title ILIKE '%mov%' THEN 
      '[{"url": "https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Moving Services"}]'::jsonb
    WHEN title ILIKE '%transport%' OR title ILIKE '%delivery%' THEN 
      '[{"url": "https://images.pexels.com/photos/1545590/pexels-photo-1545590.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Transportation Services"}]'::jsonb
    
    -- Pet Services
    WHEN title ILIKE '%pet%' OR title ILIKE '%dog%' OR title ILIKE '%grooming%' THEN 
      '[{"url": "https://images.pexels.com/photos/6568461/pexels-photo-6568461.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Pet Services"}]'::jsonb
    WHEN title ILIKE '%vet%' THEN 
      '[{"url": "https://images.pexels.com/photos/6235241/pexels-photo-6235241.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Veterinary Services"}]'::jsonb
    
    -- Default fallback
    ELSE 
      '[{"url": "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Professional Service"}]'::jsonb
  END
WHERE listing_type = 'service' AND (photos IS NULL OR photos = '[]'::jsonb);

-- Update jobs table with photos array
UPDATE jobs
SET 
  photos = CASE
    WHEN title ILIKE '%backdrop%' OR title ILIKE '%draping%' THEN 
      '[{"url": "https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Event Setup Needed"}]'::jsonb
    WHEN title ILIKE '%photo%' OR title ILIKE '%videograph%' THEN 
      '[{"url": "https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Photography Job"}]'::jsonb
    WHEN title ILIKE '%clean%' THEN 
      '[{"url": "https://images.pexels.com/photos/4239146/pexels-photo-4239146.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Cleaning Needed"}]'::jsonb
    WHEN title ILIKE '%paint%' THEN 
      '[{"url": "https://images.pexels.com/photos/1669754/pexels-photo-1669754.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Painting Job"}]'::jsonb
    WHEN title ILIKE '%landscape%' OR title ILIKE '%lawn%' THEN 
      '[{"url": "https://images.pexels.com/photos/1453499/pexels-photo-1453499.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Landscaping Job"}]'::jsonb
    WHEN title ILIKE '%repair%' OR title ILIKE '%handyman%' THEN 
      '[{"url": "https://images.pexels.com/photos/5691621/pexels-photo-5691621.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Repair Needed"}]'::jsonb
    WHEN title ILIKE '%event%' OR title ILIKE '%party%' THEN 
      '[{"url": "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Event Planning Needed"}]'::jsonb
    WHEN title ILIKE '%web%' OR title ILIKE '%develop%' THEN 
      '[{"url": "https://images.pexels.com/photos/270348/pexels-photo-270348.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Development Job"}]'::jsonb
    WHEN title ILIKE '%design%' THEN 
      '[{"url": "https://images.pexels.com/photos/196645/pexels-photo-196645.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Design Job"}]'::jsonb
    ELSE 
      '[{"url": "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800", "caption": "Job Request"}]'::jsonb
  END
WHERE photos IS NULL OR photos = '[]'::jsonb;

-- Ensure all providers have a bio if they don't have one
UPDATE profiles
SET bio = CASE
    WHEN full_name ILIKE '%royal av%' THEN 'Professional audio/visual and event setup services with 10+ years of experience'
    WHEN full_name ILIKE '%backdrop%' THEN 'Specializing in elegant backdrops and draping for weddings and special events'
    WHEN full_name ILIKE '%photo%' THEN 'Capturing your special moments with professional photography and videography'
    WHEN full_name ILIKE '%dj%' THEN 'Professional DJ services for all types of events and celebrations'
    WHEN full_name ILIKE '%cater%' THEN 'Delicious catering services for events of all sizes'
    WHEN full_name ILIKE '%clean%' THEN 'Reliable and thorough cleaning services for homes and businesses'
    WHEN full_name ILIKE '%landscape%' THEN 'Creating beautiful outdoor spaces with expert landscaping services'
    ELSE 'Experienced professional providing quality services'
  END
WHERE user_type = 'provider' AND (bio IS NULL OR bio = '');