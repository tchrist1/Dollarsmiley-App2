/*
  # Phone Verification System

  ## Overview
  Comprehensive phone verification system using SMS OTP codes with rate limiting,
  expiration, and security features.

  ## New Tables

  ### phone_verifications
  Tracks phone verification attempts and status
  - `id` (uuid, primary key) - Verification ID
  - `user_id` (uuid, references profiles) - User requesting verification
  - `phone_number` (text) - Phone number to verify (E.164 format)
  - `otp_code` (text) - One-time password code (6 digits)
  - `otp_hash` (text) - Hashed OTP for security
  - `attempts` (integer) - Verification attempts count
  - `status` (text) - pending, verified, expired, failed
  - `expires_at` (timestamptz) - OTP expiration time (10 minutes)
  - `verified_at` (timestamptz) - Verification completion time
  - `created_at` (timestamptz) - Creation timestamp

  ### phone_verification_logs
  Audit log of all verification attempts
  - `id` (uuid, primary key) - Log entry ID
  - `verification_id` (uuid) - Related verification
  - `user_id` (uuid) - User making attempt
  - `phone_number` (text) - Phone number
  - `action` (text) - send_code, verify_code, resend_code
  - `success` (boolean) - Action success status
  - `error_message` (text) - Error details if failed
  - `ip_address` (text) - Request IP address
  - `user_agent` (text) - Request user agent
  - `created_at` (timestamptz) - Timestamp

  ## Security Features
  - Rate limiting: Max 3 SMS per hour per phone
  - OTP expiration: 10 minutes
  - Max verification attempts: 5 per OTP
  - Hashed OTP storage
  - Audit logging
  - IP tracking for fraud detection

  ## RLS Policies
  - Users can only create/view their own verifications
  - Users can only view their own logs
  - Admins can view all records
*/

-- Create phone verifications table
CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  otp_code text NOT NULL,
  otp_hash text NOT NULL,
  attempts integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'failed')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create phone verification logs table
CREATE TABLE IF NOT EXISTS phone_verification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid REFERENCES phone_verifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  action text NOT NULL CHECK (action IN ('send_code', 'verify_code', 'resend_code')),
  success boolean NOT NULL DEFAULT false,
  error_message text,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_number ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_status ON phone_verifications(status);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at ON phone_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_phone_verification_logs_user_id ON phone_verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verification_logs_phone_number ON phone_verification_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verification_logs_created_at ON phone_verification_logs(created_at);

-- Enable RLS
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_verification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for phone_verifications

-- Users can view their own verifications
CREATE POLICY "Users view own phone verifications"
ON phone_verifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create their own verifications
CREATE POLICY "Users create own phone verifications"
ON phone_verifications FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own verifications
CREATE POLICY "Users update own phone verifications"
ON phone_verifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can view all verifications
CREATE POLICY "Admins view all phone verifications"
ON phone_verifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'Admin'
  )
);

-- RLS Policies for phone_verification_logs

-- Users can view their own logs
CREATE POLICY "Users view own verification logs"
ON phone_verification_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create their own logs
CREATE POLICY "Users create own verification logs"
ON phone_verification_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can view all logs
CREATE POLICY "Admins view all verification logs"
ON phone_verification_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'Admin'
  )
);

-- Function to check rate limiting (max 3 SMS per hour per phone)
CREATE OR REPLACE FUNCTION check_phone_verification_rate_limit(
  p_phone_number text,
  p_user_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_count integer;
BEGIN
  -- Count SMS sent in last hour for this phone number
  SELECT COUNT(*)
  INTO v_count
  FROM phone_verification_logs
  WHERE phone_number = p_phone_number
    AND action IN ('send_code', 'resend_code')
    AND success = true
    AND created_at > now() - interval '1 hour';

  -- Return true if under limit
  RETURN v_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate OTP code
CREATE OR REPLACE FUNCTION generate_otp_code()
RETURNS text AS $$
BEGIN
  -- Generate 6-digit random code
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to hash OTP code
CREATE OR REPLACE FUNCTION hash_otp_code(otp text)
RETURNS text AS $$
BEGIN
  -- Hash using SHA256 with salt
  RETURN encode(digest(otp || 'dollarsmiley_otp_salt', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to verify OTP code
CREATE OR REPLACE FUNCTION verify_otp_code(
  p_verification_id uuid,
  p_otp_code text
)
RETURNS boolean AS $$
DECLARE
  v_verification record;
  v_hashed_input text;
BEGIN
  -- Get verification record
  SELECT * INTO v_verification
  FROM phone_verifications
  WHERE id = p_verification_id
    AND status = 'pending'
    AND expires_at > now();

  -- Check if verification exists and not expired
  IF v_verification IS NULL THEN
    RETURN false;
  END IF;

  -- Check max attempts
  IF v_verification.attempts >= 5 THEN
    UPDATE phone_verifications
    SET status = 'failed'
    WHERE id = p_verification_id;
    RETURN false;
  END IF;

  -- Hash input OTP
  v_hashed_input := hash_otp_code(p_otp_code);

  -- Increment attempts
  UPDATE phone_verifications
  SET attempts = attempts + 1
  WHERE id = p_verification_id;

  -- Compare hashed values
  IF v_hashed_input = v_verification.otp_hash THEN
    -- Mark as verified
    UPDATE phone_verifications
    SET
      status = 'verified',
      verified_at = now()
    WHERE id = p_verification_id;

    -- Update profile
    UPDATE profiles
    SET
      phone = v_verification.phone_number,
      phone_verified = true
    WHERE id = v_verification.user_id;

    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to expire old verifications
CREATE OR REPLACE FUNCTION expire_old_phone_verifications()
RETURNS trigger AS $$
BEGIN
  -- Mark expired verifications
  UPDATE phone_verifications
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (runs on insert to periodically clean up)
DROP TRIGGER IF EXISTS trigger_expire_phone_verifications ON phone_verifications;
CREATE TRIGGER trigger_expire_phone_verifications
  AFTER INSERT ON phone_verifications
  FOR EACH STATEMENT
  EXECUTE FUNCTION expire_old_phone_verifications();

-- Function to get verification statistics
CREATE OR REPLACE FUNCTION get_phone_verification_stats(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_verifications', COUNT(*),
    'successful_verifications', COUNT(*) FILTER (WHERE status = 'verified'),
    'failed_verifications', COUNT(*) FILTER (WHERE status = 'failed'),
    'pending_verifications', COUNT(*) FILTER (WHERE status = 'pending'),
    'last_verification_at', MAX(created_at),
    'phone_verified', (
      SELECT phone_verified
      FROM profiles
      WHERE id = p_user_id
    )
  )
  INTO v_stats
  FROM phone_verifications
  WHERE user_id = p_user_id;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_phone_verification_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION generate_otp_code TO authenticated;
GRANT EXECUTE ON FUNCTION hash_otp_code TO authenticated;
GRANT EXECUTE ON FUNCTION verify_otp_code TO authenticated;
GRANT EXECUTE ON FUNCTION get_phone_verification_stats TO authenticated;
