/*
  # Update Demo Providers with Unique Profiles V3
  
  1. Creates 20 unique provider profiles with diverse names and profile images
  2. Updates existing service listings to use these providers
  3. Creates corresponding auth.users entries for each provider
  
  Provider Names:
  - Olivia Carter, Marcus Bennett, Sophia Ramirez, Ethan Jefferson, Chloe Anderson
  - Daniel Okoro, Maya Thompson, Logan Patel, Isabella Nguyen, Christopher Hall
  - Naomi Wright, Jordan Lewis, Gabriella Costa, Samuel Brooks, Aria Mohammed
  - Xavier King, Lydia Chen, Benjamin Ortiz, Harper Davis, Andre Williams
*/

DO $$
DECLARE
  provider_ids uuid[];
  provider_data jsonb := '[
    {"name": "Olivia Carter", "image": "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Marcus Bennett", "image": "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Sophia Ramirez", "image": "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Ethan Jefferson", "image": "https://images.pexels.com/photos/1081685/pexels-photo-1081685.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Chloe Anderson", "image": "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Daniel Okoro", "image": "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Maya Thompson", "image": "https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Logan Patel", "image": "https://images.pexels.com/photos/1300402/pexels-photo-1300402.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Isabella Nguyen", "image": "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Christopher Hall", "image": "https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Naomi Wright", "image": "https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Jordan Lewis", "image": "https://images.pexels.com/photos/1310522/pexels-photo-1310522.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Gabriella Costa", "image": "https://images.pexels.com/photos/1181695/pexels-photo-1181695.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Samuel Brooks", "image": "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Aria Mohammed", "image": "https://images.pexels.com/photos/1181414/pexels-photo-1181414.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Xavier King", "image": "https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Lydia Chen", "image": "https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Benjamin Ortiz", "image": "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Harper Davis", "image": "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400"},
    {"name": "Andre Williams", "image": "https://images.pexels.com/photos/1300402/pexels-photo-1300402.jpeg?auto=compress&cs=tinysrgb&w=400"}
  ]'::jsonb;
  provider_record jsonb;
  new_user_id uuid;
  existing_user_id uuid;
  provider_email text;
  i INT;
  listing_record RECORD;
  provider_index INT := 0;
BEGIN
  -- Enable pgcrypto extension if not already enabled
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  
  -- Create 20 provider auth users and profiles
  FOR i IN 0..19 LOOP
    provider_record := provider_data->i;
    provider_email := 'demoprovider' || (i + 1) || '@dollarsmiley.app';
    
    -- Check if user already exists
    SELECT id INTO existing_user_id FROM auth.users WHERE email = provider_email;
    
    IF existing_user_id IS NOT NULL THEN
      -- User exists, update metadata
      UPDATE auth.users 
      SET 
        raw_user_meta_data = jsonb_build_object('full_name', provider_record->>'name', 'avatar_url', provider_record->>'image'),
        updated_at = now()
      WHERE id = existing_user_id;
      
      new_user_id := existing_user_id;
    ELSE
      -- Create new user
      new_user_id := gen_random_uuid();
      
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        provider_email,
        crypt('DemoPass123!', gen_salt('bf')),
        now(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('full_name', provider_record->>'name', 'avatar_url', provider_record->>'image'),
        now(),
        now(),
        '',
        '',
        '',
        ''
      );
    END IF;
    
    -- Create or update matching profile
    INSERT INTO profiles (
      id,
      email,
      full_name,
      avatar_url,
      user_type,
      id_verified,
      phone_verified,
      business_verified,
      rating_average,
      rating_count,
      total_bookings,
      created_at,
      updated_at
    ) VALUES (
      new_user_id,
      provider_email,
      provider_record->>'name',
      provider_record->>'image',
      'Provider',
      true,
      true,
      true,
      4.5 + (random() * 0.5),
      50 + (random() * 150)::INT,
      30 + (random() * 100)::INT,
      now() - (random() * interval '2 years'),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      user_type = EXCLUDED.user_type,
      id_verified = EXCLUDED.id_verified,
      phone_verified = EXCLUDED.phone_verified,
      business_verified = EXCLUDED.business_verified,
      rating_average = EXCLUDED.rating_average,
      rating_count = EXCLUDED.rating_count,
      updated_at = now();
    
    provider_ids := array_append(provider_ids, new_user_id);
    
    RAISE NOTICE 'Created/updated provider: % (%)', provider_record->>'name', new_user_id;
  END LOOP;
  
  -- Distribute all service listings across the 20 providers
  FOR listing_record IN 
    SELECT id FROM service_listings 
    ORDER BY created_at
  LOOP
    UPDATE service_listings 
    SET provider_id = provider_ids[(provider_index % 20) + 1]
    WHERE id = listing_record.id;
    
    provider_index := provider_index + 1;
  END LOOP;
  
  RAISE NOTICE 'Updated % listings with diverse providers', provider_index;
  
  -- Sync provider ratings from their listings
  UPDATE profiles p
  SET 
    rating_average = COALESCE((
      SELECT AVG(rating_average)
      FROM service_listings 
      WHERE provider_id = p.id AND rating_average > 0
    ), p.rating_average),
    rating_count = COALESCE((
      SELECT SUM(rating_count)
      FROM service_listings 
      WHERE provider_id = p.id
    ), p.rating_count)
  WHERE p.id = ANY(provider_ids);
  
END $$;
