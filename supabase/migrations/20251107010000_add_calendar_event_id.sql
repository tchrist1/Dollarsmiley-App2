/*
  # Add Calendar Event ID to Bookings

  1. Changes
    - Add `calendar_event_id` column to bookings table to track calendar integration
    - Index for faster lookups
  
  2. Purpose
    - Store device calendar event IDs for bookings
    - Enable calendar event updates/deletions
    - Track which bookings are synced to calendar
*/

-- Add calendar_event_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'calendar_event_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN calendar_event_id text;
  END IF;
END $$;

-- Create index for calendar event lookups
CREATE INDEX IF NOT EXISTS idx_bookings_calendar_event_id ON bookings(calendar_event_id) WHERE calendar_event_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN bookings.calendar_event_id IS 'Device calendar event ID for syncing booking to user calendar';
