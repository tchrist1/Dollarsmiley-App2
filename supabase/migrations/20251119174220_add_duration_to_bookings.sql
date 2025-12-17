/*
  # Add duration column to bookings table
  
  1. Changes
    - Add duration column to bookings table with default value of 60 minutes
    - This column is required by the create_time_slot_reservation trigger
    
  2. Notes
    - Duration is stored in minutes
    - Default value of 60 minutes (1 hour) for existing and new bookings
*/

-- Add duration column to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'duration'
  ) THEN
    ALTER TABLE bookings ADD COLUMN duration integer DEFAULT 60;
    COMMENT ON COLUMN bookings.duration IS 'Booking duration in minutes';
  END IF;
END $$;