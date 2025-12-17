/*
  # Integrate Stripe Identity SDK for Provider Verification

  ## Overview
  Adds Stripe Identity verification for providers, enabling secure KYC through
  Stripe's verification system with document scanning and facial recognition.

  ## New Tables

  ### 1. `stripe_identity_verifications`
  Stores Stripe Identity verification sessions
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `stripe_verification_session_id` (text, unique)
  - `stripe_verification_report_id` (text)
  - `status` (text) - requires_input, processing, verified, canceled
  - `type` (text) - document, id_number
  - `client_secret` (text) - For mobile SDK initialization
  - `verification_url` (text) - Web verification URL
  - `last_error` (jsonb) - Error details if verification failed
  - `verified_data` (jsonb) - Verified information from Stripe
  - `document_front_id` (text) - Stripe file ID
  - `document_back_id` (text) - Stripe file ID
  - `selfie_id` (text) - Stripe file ID
  - `submitted_at` (timestamptz)
  - `verified_at` (timestamptz)
  - `expires_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Features
  - Stripe Identity session creation
  - Document verification
  - Selfie verification
  - Real-time status updates
  - Automatic profile verification
  - Webhook handling

  ## Triggers
  - Auto-verify profile on success
  - Award XP for verification
  - Create verification badge

  ## Security
  - RLS enabled
  - Users can only view own verifications
  - Admins can view all
*/

-- Create stripe_identity_verifications table
CREATE TABLE IF NOT EXISTS stripe_identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_verification_session_id text UNIQUE NOT NULL,
  stripe_verification_report_id text,
  status text NOT NULL CHECK (status IN ('requires_input', 'processing', 'verified', 'canceled')),
  type text DEFAULT 'document' CHECK (type IN ('document', 'id_number')),
  client_secret text NOT NULL,
  verification_url text,
  last_error jsonb,
  verified_data jsonb,
  document_front_id text,
  document_back_id text,
  selfie_id text,
  submitted_at timestamptz,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stripe_identity_user ON stripe_identity_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_identity_session ON stripe_identity_verifications(stripe_verification_session_id);
CREATE INDEX IF NOT EXISTS idx_stripe_identity_status ON stripe_identity_verifications(status);
CREATE INDEX IF NOT EXISTS idx_stripe_identity_created ON stripe_identity_verifications(created_at DESC);

-- Enable RLS
ALTER TABLE stripe_identity_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own verifications
CREATE POLICY "Users can view own identity verifications"
  ON stripe_identity_verifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own verifications
CREATE POLICY "Users can create own identity verifications"
  ON stripe_identity_verifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can view all verifications
CREATE POLICY "Admins can view all identity verifications"
  ON stripe_identity_verifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type = 'Admin'
    )
  );

-- Function to create identity verification record
CREATE OR REPLACE FUNCTION create_identity_verification_record(
  stripe_session_id_param text,
  client_secret_param text,
  verification_url_param text,
  expires_at_param timestamptz
)
RETURNS uuid AS $$
DECLARE
  verification_id uuid;
BEGIN
  -- Insert verification record
  INSERT INTO stripe_identity_verifications (
    user_id,
    stripe_verification_session_id,
    status,
    client_secret,
    verification_url,
    expires_at
  ) VALUES (
    auth.uid(),
    stripe_session_id_param,
    'requires_input',
    client_secret_param,
    verification_url_param,
    expires_at_param
  ) RETURNING id INTO verification_id;

  RETURN verification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update identity verification status
CREATE OR REPLACE FUNCTION update_identity_verification_status(
  session_id_param text,
  status_param text,
  report_id_param text DEFAULT NULL,
  verified_data_param jsonb DEFAULT NULL,
  last_error_param jsonb DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  verification_record RECORD;
  user_profile_id uuid;
BEGIN
  -- Get verification record
  SELECT * INTO verification_record
  FROM stripe_identity_verifications
  WHERE stripe_verification_session_id = session_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification session not found';
  END IF;

  user_profile_id := verification_record.user_id;

  -- Update verification record
  UPDATE stripe_identity_verifications
  SET
    status = status_param,
    stripe_verification_report_id = COALESCE(report_id_param, stripe_verification_report_id),
    verified_data = COALESCE(verified_data_param, verified_data),
    last_error = last_error_param,
    submitted_at = CASE WHEN status_param = 'processing' THEN NOW() ELSE submitted_at END,
    verified_at = CASE WHEN status_param = 'verified' THEN NOW() ELSE verified_at END
  WHERE stripe_verification_session_id = session_id_param;

  -- If verified, update profile and award benefits
  IF status_param = 'verified' THEN
    -- Update profile verification status
    UPDATE profiles
    SET
      is_verified = true,
      verified_at = NOW()
    WHERE id = user_profile_id;

    -- Create verification badge
    INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, earned_at)
    VALUES (
      user_profile_id,
      'verification',
      'Identity Verified',
      'Verified identity through Stripe Identity',
      NOW()
    )
    ON CONFLICT (user_id, badge_type) DO NOTHING;

    -- Award XP for verification
    UPDATE user_gamification
    SET
      current_xp = current_xp + 100,
      total_xp = total_xp + 100
    WHERE user_id = user_profile_id;

    -- Create notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      user_profile_id,
      'verification_approved',
      'Identity Verified',
      'Your identity has been successfully verified! You now have the verified badge.',
      jsonb_build_object(
        'verification_type', 'stripe_identity',
        'xp_earned', 100
      )
    );
  END IF;

  -- If canceled or failed, notify user
  IF status_param IN ('canceled') THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      user_profile_id,
      'verification_failed',
      'Verification Incomplete',
      'Your identity verification was not completed. You can try again anytime.',
      jsonb_build_object(
        'verification_type', 'stripe_identity',
        'status', status_param,
        'error', last_error_param
      )
    );
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's latest verification
CREATE OR REPLACE FUNCTION get_user_latest_identity_verification(user_id_param uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  stripe_verification_session_id text,
  status text,
  type text,
  client_secret text,
  verification_url text,
  verified_data jsonb,
  last_error jsonb,
  submitted_at timestamptz,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz
) AS $$
DECLARE
  target_user uuid;
BEGIN
  target_user := COALESCE(user_id_param, auth.uid());

  RETURN QUERY
  SELECT
    siv.id,
    siv.stripe_verification_session_id,
    siv.status,
    siv.type,
    siv.client_secret,
    siv.verification_url,
    siv.verified_data,
    siv.last_error,
    siv.submitted_at,
    siv.verified_at,
    siv.expires_at,
    siv.created_at
  FROM stripe_identity_verifications siv
  WHERE siv.user_id = target_user
  ORDER BY siv.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get identity verification statistics
CREATE OR REPLACE FUNCTION get_identity_verification_stats()
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_verifications', COUNT(*),
    'by_status', jsonb_object_agg(
      status,
      status_count
    ),
    'verified_count', COUNT(*) FILTER (WHERE status = 'verified'),
    'pending_count', COUNT(*) FILTER (WHERE status IN ('requires_input', 'processing')),
    'verification_rate', ROUND(
      (COUNT(*) FILTER (WHERE status = 'verified')::numeric / NULLIF(COUNT(*), 0) * 100), 2
    ),
    'avg_time_to_verify_hours', ROUND(
      AVG(EXTRACT(EPOCH FROM (verified_at - created_at)) / 3600) FILTER (WHERE verified_at IS NOT NULL)::numeric, 2
    )
  ) INTO stats
  FROM (
    SELECT
      status,
      verified_at,
      created_at,
      COUNT(*) OVER (PARTITION BY status) as status_count
    FROM stripe_identity_verifications
  ) sub;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if verification is expired
CREATE OR REPLACE FUNCTION is_verification_expired(session_id_param text)
RETURNS boolean AS $$
DECLARE
  expiry timestamptz;
BEGIN
  SELECT expires_at INTO expiry
  FROM stripe_identity_verifications
  WHERE stripe_verification_session_id = session_id_param;

  IF NOT FOUND THEN
    RETURN true;
  END IF;

  RETURN expiry < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for verification status
CREATE OR REPLACE VIEW user_verification_status AS
SELECT
  p.id as user_id,
  p.full_name,
  p.email,
  p.is_verified,
  p.verified_at as profile_verified_at,
  siv.id as verification_id,
  siv.stripe_verification_session_id,
  siv.status as verification_status,
  siv.type as verification_type,
  siv.verified_at as stripe_verified_at,
  siv.submitted_at,
  siv.created_at as verification_created_at,
  CASE
    WHEN siv.status = 'verified' THEN 'verified'
    WHEN siv.status = 'processing' THEN 'pending'
    WHEN siv.status = 'requires_input' THEN 'incomplete'
    WHEN siv.status = 'canceled' THEN 'failed'
    WHEN p.is_verified THEN 'verified'
    ELSE 'unverified'
  END as overall_status
FROM profiles p
LEFT JOIN LATERAL (
  SELECT *
  FROM stripe_identity_verifications
  WHERE user_id = p.id
  ORDER BY created_at DESC
  LIMIT 1
) siv ON true;

-- Add verification method column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verification_method'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verification_method text;
  END IF;
END $$;

-- Update verification method when verified via Stripe
CREATE OR REPLACE FUNCTION update_verification_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'verified' AND OLD.status != 'verified' THEN
    UPDATE profiles
    SET verification_method = 'stripe_identity'
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update verification method
DROP TRIGGER IF EXISTS update_verification_method_trigger ON stripe_identity_verifications;
CREATE TRIGGER update_verification_method_trigger
  AFTER UPDATE ON stripe_identity_verifications
  FOR EACH ROW
  WHEN (NEW.status = 'verified' AND OLD.status IS DISTINCT FROM 'verified')
  EXECUTE FUNCTION update_verification_method();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_identity_verification_record(text, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION update_identity_verification_status(text, text, text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_latest_identity_verification(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_identity_verification_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION is_verification_expired(text) TO authenticated;

-- Grant access to view
GRANT SELECT ON user_verification_status TO authenticated;
