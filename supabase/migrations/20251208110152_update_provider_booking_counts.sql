/*
  # Update Provider Booking Counts
  
  Updates total_bookings for all demo providers to realistic values based on their ratings and review counts.
  
  Logic:
  - High ratings (4.7-5.0) with many reviews get 400-800+ bookings
  - Moderate ratings (4.5-4.69) get 100-400 bookings
  - Booking count is calculated as a multiplier of review count (assuming not all customers leave reviews)
  - Adds variance to make data more realistic
*/

DO $$
DECLARE
  provider_record RECORD;
  calculated_bookings INT;
  review_to_booking_ratio NUMERIC;
  rating_bonus NUMERIC;
BEGIN
  -- Update each provider's booking count
  FOR provider_record IN 
    SELECT 
      id,
      full_name,
      rating_average,
      rating_count
    FROM profiles
    WHERE user_type = 'Provider'
  LOOP
    -- Calculate review-to-booking ratio (30-50% of customers leave reviews)
    -- Higher rated providers get slightly better ratio (more engaged customers)
    IF provider_record.rating_average >= 4.75 THEN
      review_to_booking_ratio := 2.8 + (random() * 0.6); -- 2.8-3.4x reviews = bookings
    ELSIF provider_record.rating_average >= 4.65 THEN
      review_to_booking_ratio := 2.4 + (random() * 0.6); -- 2.4-3.0x
    ELSE
      review_to_booking_ratio := 2.0 + (random() * 0.6); -- 2.0-2.6x
    END IF;
    
    -- Calculate base bookings from review count
    calculated_bookings := FLOOR(provider_record.rating_count * review_to_booking_ratio);
    
    -- Add rating bonus for exceptional providers (4.8+)
    IF provider_record.rating_average >= 4.80 THEN
      rating_bonus := 1.15 + (random() * 0.15); -- 15-30% bonus
      calculated_bookings := FLOOR(calculated_bookings * rating_bonus);
    END IF;
    
    -- Apply reasonable bounds
    -- Minimum 50 bookings for established providers
    IF calculated_bookings < 50 THEN
      calculated_bookings := 50 + FLOOR(random() * 30);
    END IF;
    
    -- Maximum 850 bookings (keeps it realistic)
    IF calculated_bookings > 850 THEN
      calculated_bookings := 750 + FLOOR(random() * 100);
    END IF;
    
    -- Update the provider
    UPDATE profiles
    SET 
      total_bookings = calculated_bookings,
      updated_at = now()
    WHERE id = provider_record.id;
    
    RAISE NOTICE 'Updated % - Rating: %, Reviews: %, Bookings: %',
      provider_record.full_name,
      ROUND(provider_record.rating_average::numeric, 2),
      provider_record.rating_count,
      calculated_bookings;
  END LOOP;
  
  RAISE NOTICE 'Successfully updated booking counts for all providers';
END $$;
