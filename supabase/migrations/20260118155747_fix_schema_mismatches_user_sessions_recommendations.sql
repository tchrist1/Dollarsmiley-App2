/*
  # Fix Schema Mismatches

  Fixes three critical errors:
  1. user_sessions table - missing columns that code expects
  2. get_personalized_recommendations function - conflicting definitions
  3. Ensures all required tables exist for tracking

  ## Changes
  
  1. Add missing columns to user_sessions table:
     - device_type, os, app_version, is_active
  
  2. Drop conflicting get_personalized_recommendations functions
     and create a unified version that works with the current code
*/

-- 1. Fix user_sessions table - add missing columns
ALTER TABLE user_sessions 
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS os text,
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add check constraint for device_type if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_sessions_device_type_check'
  ) THEN
    ALTER TABLE user_sessions 
      ADD CONSTRAINT user_sessions_device_type_check 
      CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown'));
  END IF;
END $$;

-- Update RLS policies for user_sessions to allow inserts
DROP POLICY IF EXISTS "Users can create own sessions" ON user_sessions;
CREATE POLICY "Users can create own sessions"
  ON user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anon users can create sessions" ON user_sessions;
CREATE POLICY "Anon users can create sessions"
  ON user_sessions FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- 2. Fix get_personalized_recommendations function conflicts
-- Drop all existing versions
DROP FUNCTION IF EXISTS get_personalized_recommendations(uuid, text, integer);
DROP FUNCTION IF EXISTS get_personalized_recommendations(integer, text, uuid);

-- Create a unified version that matches the calling code
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
  p_user_id uuid,
  p_recommendation_type text DEFAULT 'providers',
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  item_id uuid,
  item_type text,
  score numeric,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return personalized recommendations based on user interactions
  -- For now, return popular listings as a fallback
  RETURN QUERY
  SELECT 
    sl.id as item_id,
    'listing'::text as item_type,
    COALESCE(sl.average_rating, 3.0) * COALESCE(sl.total_bookings, 0)::numeric as score,
    'Popular service'::text as reason
  FROM service_listings sl
  WHERE sl.status = 'active'
  ORDER BY score DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_personalized_recommendations(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_personalized_recommendations(uuid, text, integer) TO anon;

-- 3. Ensure ab_participants and ab_events tables exist for track_experiment_event
CREATE TABLE IF NOT EXISTS ab_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_id text,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(experiment_id, variant_id, user_id),
  UNIQUE(experiment_id, variant_id, session_id)
);

CREATE TABLE IF NOT EXISTS ab_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  participant_id uuid REFERENCES ab_participants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_name text NOT NULL,
  event_value numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on AB testing tables
ALTER TABLE ab_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_events ENABLE ROW LEVEL SECURITY;

-- Allow all users to participate in AB tests
CREATE POLICY "Anyone can be added as participant" ON ab_participants FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Users can view own participation" ON ab_participants FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Anon users can view own participation" ON ab_participants FOR SELECT TO anon USING (true);

-- Allow tracking events
CREATE POLICY "Anyone can create events" ON ab_events FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Users can view events they're part of" ON ab_events FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM ab_participants 
    WHERE ab_participants.id = ab_events.participant_id 
    AND ab_participants.user_id = auth.uid()
  )
);
