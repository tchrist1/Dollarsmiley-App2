/*
  # Create User Events Table

  1. New Tables
    - `user_events` - Tracks all user behavior events for analytics

  2. Security
    - Enable RLS
    - Users can insert and view own events
*/

-- Create user_events table
CREATE TABLE IF NOT EXISTS user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_id uuid,
  event_type text NOT NULL CHECK (event_type IN (
    'screen_view', 'button_click', 'form_submit', 'search', 'filter',
    'navigation', 'api_call', 'error', 'feature_use', 'purchase',
    'social', 'booking', 'message', 'notification'
  )),
  event_category text NOT NULL,
  event_name text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  screen_name text NOT NULL,
  previous_screen text,
  duration_ms integer,
  device_type text,
  os text,
  app_version text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- Policies for user_events
CREATE POLICY "Users can insert own events"
  ON user_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own events"
  ON user_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow anonymous event tracking
CREATE POLICY "Anonymous users can insert events"
  ON user_events FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_session_id ON user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_screen_name ON user_events(screen_name);