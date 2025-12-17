/*
  # Add Rating Columns and Generate Demo Data

  1. Adds rating columns to service_listings
  2. Generates comprehensive demo data with images
*/

-- Add rating columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_listings' AND column_name = 'average_rating') THEN
    ALTER TABLE service_listings ADD COLUMN average_rating numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_listings' AND column_name = 'total_reviews') THEN
    ALTER TABLE service_listings ADD COLUMN total_reviews integer DEFAULT 0;
  END IF;
END $$;

-- Generate demo data
DO $$
DECLARE
  cat_rec RECORD;
  provider_ids uuid[];
  listing_counter int := 0;
BEGIN
  RAISE NOTICE 'Generating demo data with images and ratings...';

  SELECT array_agg(id) INTO provider_ids FROM profiles WHERE user_type IN ('Provider', 'Both');

  FOR cat_rec IN SELECT id, name, slug FROM categories WHERE parent_id IS NOT NULL ORDER BY name
  LOOP
    FOR i IN 1..12 LOOP
      INSERT INTO service_listings (
        provider_id, category_id, title, description, base_price, pricing_type,
        location, latitude, longitude, status, estimated_duration, photos, tags,
        average_rating, total_reviews
      ) VALUES (
        provider_ids[1 + (listing_counter % array_length(provider_ids, 1))],
        cat_rec.id,
        'Professional ' || cat_rec.name || ' #' || i,
        'Expert ' || cat_rec.name || ' with 10+ years experience. Licensed, insured, highly rated by hundreds of satisfied clients.',
        CASE
          WHEN cat_rec.slug LIKE '%wedding%' THEN 2800 + (i * 250)
          WHEN cat_rec.slug LIKE '%corporate%' THEN 2200 + (i * 180)
          WHEN cat_rec.slug LIKE '%catering%' THEN 1400 + (i * 120)
          WHEN cat_rec.slug LIKE '%photo%' OR cat_rec.slug LIKE '%video%' THEN 850 + (i * 90)
          ELSE 500 + (i * 60)
        END,
        CASE (i % 3) WHEN 0 THEN 'Fixed' WHEN 1 THEN 'Hourly' ELSE 'Custom' END,
        CASE (i % 5) WHEN 0 THEN 'New York, NY' WHEN 1 THEN 'Los Angeles, CA' WHEN 2 THEN 'Chicago, IL' WHEN 3 THEN 'Houston, TX' ELSE 'Miami, FL' END,
        40.7 + (random() * 0.1), -74.0 + (random() * 0.1), 'Active', 120 + (i * 20),
        jsonb_build_array(
          jsonb_build_object('url', 'https://source.unsplash.com/random/800x600/?event&' || listing_counter || 'a', 'caption', cat_rec.name),
          jsonb_build_object('url', 'https://source.unsplash.com/random/800x600/?professional&' || listing_counter || 'b', 'caption', cat_rec.name),
          jsonb_build_object('url', 'https://source.unsplash.com/random/800x600/?service&' || listing_counter || 'c', 'caption', cat_rec.name),
          jsonb_build_object('url', 'https://source.unsplash.com/random/800x600/?business&' || listing_counter || 'd', 'caption', cat_rec.name)
        ),
        ARRAY['Professional', 'Licensed', 'Insured', 'Top Rated'],
        4.6 + (random() * 0.4),
        5 + floor(random() * 8)::int
      );
      listing_counter := listing_counter + 1;
    END LOOP;
  END LOOP;

  -- Update provider avatars
  UPDATE profiles SET avatar_url = 'https://i.pravatar.cc/150?img=' || (CAST(EXTRACT(epoch FROM created_at) AS integer) % 70 + 1)
  WHERE user_type IN ('Provider', 'Both') AND avatar_url IS NULL;

  RAISE NOTICE 'Complete! Created % listings', listing_counter;
END $$;

-- Verify
SELECT 'Total Listings' as metric, COUNT(*)::text as value FROM service_listings WHERE status = 'Active'
UNION ALL SELECT 'With Images', COUNT(*)::text FROM service_listings WHERE jsonb_array_length(photos) >= 4
UNION ALL SELECT 'With Ratings', COUNT(*)::text FROM service_listings WHERE average_rating >= 4.5;
