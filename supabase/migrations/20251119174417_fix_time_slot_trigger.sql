/*
  # Fix time slot reservation trigger
  
  1. Changes
    - Drop and recreate the trigger to handle RETURNING clause properly
    - The trigger was trying to modify NEW.time_slot_id which causes foreign key issues
    
  2. Notes
    - This fixes the issue where bookings couldn't be created due to trigger errors
*/

-- Drop the existing trigger
DROP TRIGGER IF EXISTS trigger_create_time_slot ON bookings;

-- Recreate the function without modifying NEW
CREATE OR REPLACE FUNCTION create_time_slot_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_time_slot_id uuid;
BEGIN
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
  ON CONFLICT (booking_id) DO NOTHING
  RETURNING id INTO new_time_slot_id;
  
  -- Only update if we successfully created a time slot
  IF new_time_slot_id IS NOT NULL THEN
    UPDATE bookings SET time_slot_id = new_time_slot_id WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_create_time_slot
AFTER INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION create_time_slot_reservation();