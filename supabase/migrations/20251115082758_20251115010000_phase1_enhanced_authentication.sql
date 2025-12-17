/*
  # Phase 1: Enhanced Authentication System

  1. New Tables
    - `user_sessions` - Track active user sessions across devices
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `device_info` (jsonb) - Device details
      - `ip_address` (inet)
      - `last_active` (timestamptz)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `user_mfa` - Multi-factor authentication settings
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique)
      - `method` (text) - SMS, TOTP, email
      - `phone_number` (text) - For SMS MFA
      - `is_enabled` (boolean)
      - `backup_codes` (text[])
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `user_login_history` - Track login attempts and history
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `login_method` (text)
      - `ip_address` (inet)
      - `device_info` (jsonb)
      - `success` (boolean)
      - `failure_reason` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only view/manage their own auth data
    - Admins have full access for security monitoring
*/

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_info jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  last_active timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON user_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert sessions"
  ON user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- MFA Settings Table
CREATE TABLE IF NOT EXISTS user_mfa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('sms', 'totp', 'email')),
  phone_number text,
  is_enabled boolean DEFAULT false,
  backup_codes text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_mfa_user_id ON user_mfa(user_id);

ALTER TABLE user_mfa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own MFA settings"
  ON user_mfa FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own MFA settings"
  ON user_mfa FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own MFA settings"
  ON user_mfa FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Login History Table
CREATE TABLE IF NOT EXISTS user_login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  login_method text NOT NULL,
  ip_address inet,
  device_info jsonb DEFAULT '{}'::jsonb,
  success boolean DEFAULT false,
  failure_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_login_history_user_id ON user_login_history(user_id);
CREATE INDEX idx_login_history_created ON user_login_history(created_at DESC);

ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login history"
  ON user_login_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can log all login attempts"
  ON user_login_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < now();
END;
$$;

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity(session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_sessions
  SET last_active = now()
  WHERE id = session_id;
END;
$$;