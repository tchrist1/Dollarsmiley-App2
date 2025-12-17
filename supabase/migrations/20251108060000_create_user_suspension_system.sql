/*
  # User Suspension & Ban System

  1. New Tables
    - user_suspensions - Track all suspension/ban actions
    - suspension_appeals - User appeals for suspensions

  2. Updates
    - Add suspension fields to profiles table

  3. Features
    - Temporary suspensions with expiration
    - Permanent bans
    - Appeal system
    - Suspension history tracking
    - Auto-expiration of temporary suspensions

  4. Security
    - RLS policies for admins and suspended users
    - Audit trail for all suspension actions
*/

-- Create user_suspensions table
CREATE TABLE IF NOT EXISTS user_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  suspended_by uuid NOT NULL REFERENCES profiles(id),
  suspension_type text NOT NULL CHECK (suspension_type IN ('temporary', 'permanent')),
  reason text NOT NULL,
  details text,
  severity text NOT NULL CHECK (severity IN ('warning', 'minor', 'moderate', 'severe', 'critical')),
  suspended_at timestamptz DEFAULT now(),
  expires_at timestamptz, -- NULL for permanent bans
  is_active boolean DEFAULT true,
  lifted_at timestamptz,
  lifted_by uuid REFERENCES profiles(id),
  lift_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create suspension_appeals table
CREATE TABLE IF NOT EXISTS suspension_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suspension_id uuid NOT NULL REFERENCES user_suspensions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  appeal_text text NOT NULL,
  evidence_urls jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES profiles(id),
  review_notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(suspension_id, user_id)
);

-- Add suspension fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_suspended'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_suspended boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'suspension_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN suspension_id uuid REFERENCES user_suspensions(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'suspension_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN suspension_expires_at timestamptz;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user ON user_suspensions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_active ON user_suspensions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_suspended_by ON user_suspensions(suspended_by);
CREATE INDEX IF NOT EXISTS idx_suspension_appeals_status ON suspension_appeals(status, created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON profiles(is_suspended) WHERE is_suspended = true;

-- Enable RLS
ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspension_appeals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_suspensions
CREATE POLICY "Users can view own suspension records"
  ON user_suspensions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all suspension records"
  ON user_suspensions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can create suspensions"
  ON user_suspensions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = suspended_by AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update suspensions"
  ON user_suspensions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for suspension_appeals
CREATE POLICY "Users can create appeals for own suspensions"
  ON suspension_appeals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own appeals"
  ON suspension_appeals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all appeals"
  ON suspension_appeals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update appeals"
  ON suspension_appeals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to suspend a user
CREATE OR REPLACE FUNCTION suspend_user(
  p_user_id uuid,
  p_suspension_type text,
  p_reason text,
  p_details text,
  p_severity text,
  p_duration_days integer DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_suspension_id uuid;
  v_expires_at timestamptz;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can suspend users';
  END IF;

  -- Calculate expiration date for temporary suspensions
  IF p_suspension_type = 'temporary' AND p_duration_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_duration_days || ' days')::interval;
  ELSE
    v_expires_at := NULL;
  END IF;

  -- Create suspension record
  INSERT INTO user_suspensions (
    user_id, suspended_by, suspension_type,
    reason, details, severity, expires_at
  ) VALUES (
    p_user_id, auth.uid(), p_suspension_type,
    p_reason, p_details, p_severity, v_expires_at
  ) RETURNING id INTO v_suspension_id;

  -- Update user profile
  UPDATE profiles SET
    is_suspended = true,
    suspension_id = v_suspension_id,
    suspension_expires_at = v_expires_at
  WHERE id = p_user_id;

  -- Log admin action
  INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
  VALUES (
    auth.uid(), 'UserSuspend', 'User', p_user_id,
    jsonb_build_object(
      'suspension_id', v_suspension_id,
      'suspension_type', p_suspension_type,
      'reason', p_reason,
      'severity', p_severity,
      'expires_at', v_expires_at
    )
  );

  RETURN v_suspension_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to lift a suspension
CREATE OR REPLACE FUNCTION lift_suspension(
  p_suspension_id uuid,
  p_reason text
)
RETURNS boolean AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can lift suspensions';
  END IF;

  -- Get user_id from suspension
  SELECT user_id INTO v_user_id
  FROM user_suspensions
  WHERE id = p_suspension_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Suspension not found';
  END IF;

  -- Update suspension record
  UPDATE user_suspensions SET
    is_active = false,
    lifted_at = NOW(),
    lifted_by = auth.uid(),
    lift_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_suspension_id;

  -- Check if user has any other active suspensions
  IF NOT EXISTS (
    SELECT 1 FROM user_suspensions
    WHERE user_id = v_user_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  ) THEN
    -- No other active suspensions, unsuspend user
    UPDATE profiles SET
      is_suspended = false,
      suspension_id = NULL,
      suspension_expires_at = NULL
    WHERE id = v_user_id;
  END IF;

  -- Log admin action
  INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
  VALUES (
    auth.uid(), 'UserActivate', 'User', v_user_id,
    jsonb_build_object(
      'suspension_id', p_suspension_id,
      'lift_reason', p_reason
    )
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-expire temporary suspensions
CREATE OR REPLACE FUNCTION auto_expire_suspensions()
RETURNS void AS $$
BEGIN
  -- Mark expired suspensions as inactive
  UPDATE user_suspensions SET
    is_active = false,
    updated_at = NOW()
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at <= NOW();

  -- Update user profiles for expired suspensions
  UPDATE profiles SET
    is_suspended = false,
    suspension_id = NULL,
    suspension_expires_at = NULL
  WHERE is_suspended = true
    AND suspension_expires_at IS NOT NULL
    AND suspension_expires_at <= NOW()
    AND NOT EXISTS (
      SELECT 1 FROM user_suspensions
      WHERE user_id = profiles.id
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to submit suspension appeal
CREATE OR REPLACE FUNCTION submit_suspension_appeal(
  p_suspension_id uuid,
  p_appeal_text text,
  p_evidence_urls jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_appeal_id uuid;
  v_user_id uuid;
BEGIN
  -- Get user_id from suspension
  SELECT user_id INTO v_user_id
  FROM user_suspensions
  WHERE id = p_suspension_id;

  -- Verify caller owns the suspension
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only appeal your own suspensions';
  END IF;

  -- Check if appeal already exists
  IF EXISTS (
    SELECT 1 FROM suspension_appeals
    WHERE suspension_id = p_suspension_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Appeal already submitted for this suspension';
  END IF;

  -- Create appeal
  INSERT INTO suspension_appeals (
    suspension_id, user_id, appeal_text, evidence_urls
  ) VALUES (
    p_suspension_id, auth.uid(), p_appeal_text, p_evidence_urls
  ) RETURNING id INTO v_appeal_id;

  RETURN v_appeal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user suspension details
CREATE OR REPLACE FUNCTION get_user_suspension_details(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'is_suspended', p.is_suspended,
    'suspension', CASE
      WHEN p.is_suspended THEN
        (SELECT row_to_json(s.*) FROM user_suspensions s WHERE s.id = p.suspension_id)
      ELSE NULL
    END,
    'appeals', CASE
      WHEN p.is_suspended THEN
        (SELECT jsonb_agg(a.*) FROM suspension_appeals a
         WHERE a.suspension_id = p.suspension_id)
      ELSE '[]'::jsonb
    END,
    'suspension_history', (
      SELECT jsonb_agg(h.*)
      FROM user_suspensions h
      WHERE h.user_id = p_user_id
      ORDER BY h.created_at DESC
      LIMIT 10
    )
  ) INTO v_result
  FROM profiles p
  WHERE p.id = p_user_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE user_suspensions IS 'Tracks all user suspension and ban actions';
COMMENT ON TABLE suspension_appeals IS 'User appeals against suspensions';
COMMENT ON FUNCTION suspend_user IS 'Suspend or ban a user account';
COMMENT ON FUNCTION lift_suspension IS 'Remove an active suspension';
COMMENT ON FUNCTION auto_expire_suspensions IS 'Automatically expire temporary suspensions (run via cron)';
COMMENT ON FUNCTION submit_suspension_appeal IS 'Submit an appeal for a suspension';
COMMENT ON FUNCTION get_user_suspension_details IS 'Get complete suspension information for a user';
