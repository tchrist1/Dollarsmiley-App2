/*
  # Fix user_events Table Missing Columns

  Adds missing columns to user_events table that the tracking code expects:
  - timestamp (for explicit event timestamp)
  - ip_address (for tracking user location)
  - user_agent (for tracking browser/device info)
  - device_info (jsonb for detailed device information)
*/

-- Add missing columns to user_events
ALTER TABLE user_events 
  ADD COLUMN IF NOT EXISTS timestamp timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS device_info jsonb DEFAULT '{}'::jsonb;

-- Create index on timestamp for performance
CREATE INDEX IF NOT EXISTS idx_user_events_timestamp ON user_events(timestamp DESC);

-- Update RLS policies to allow inserts
DROP POLICY IF EXISTS "Users can create own events" ON user_events;
CREATE POLICY "Users can create own events"
  ON user_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anon users can create events" ON user_events;
CREATE POLICY "Anon users can create events"
  ON user_events FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);
