/*
  # Fix time slot reservation trigger - remove ON CONFLICT
  
  1. Changes
    - Remove ON CONFLICT clause that requires a unique constraint
    - Allow trigger to simply insert without conflict handling
    
  2. Notes
    - Fixes the error "there is no unique or exclusion constraint matching the ON CONFLICT specification"
*/

-- Recreate the function without ON CONFLICT
CREATE OR REPLACE FUNCTION create_time_slot_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_time_slot_id uuid;
BEGIN
  -- Check if a time slot already exists for this booking
  SELECT id INTO new_time_slot_id
  FROM time_slot_bookings
  WHERE booking_id = NEW.id;
  
  -- Only create if it doesn't exist
  IF new_time_slot_id IS NULL THEN
    INSERT INTO time_slot_bookings (
      provider_id,
      booking_id,
      booking_date,
      start_time,
      end_time,
      status
    )
    VALUES (
      NEW.provider_id,
      NEW.id,
      NEW.scheduled_date::date,
      NEW.scheduled_time::time,
      (NEW.scheduled_time::time + (COALESCE(NEW.duration, 60) || ' minutes')::interval)::time,
      CASE 
        WHEN NEW.status = 'Confirmed' THEN 'Confirmed'
        ELSE 'Reserved'
      END
    )
    RETURNING id INTO new_time_slot_id;
    
    -- Update booking with the time slot ID
    IF new_time_slot_id IS NOT NULL THEN
      UPDATE bookings SET time_slot_id = new_time_slot_id WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;