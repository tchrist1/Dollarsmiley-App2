/*
  # Platform Announcements System

  1. New Tables
    - platform_announcements - Store announcements
    - announcement_reads - Track which users have read announcements

  2. Features
    - Create and manage platform-wide announcements
    - Target specific user types or all users
    - Schedule announcements for future publishing
    - Track read status per user
    - Support different announcement types and priorities
    - Dismiss and hide announcements

  3. Security
    - RLS policies for admins and users
    - Admins can create/update announcements
    - Users can only view active announcements
*/

-- Create announcement types enum
DO $$ BEGIN
  CREATE TYPE announcement_type AS ENUM (
    'info',
    'warning',
    'success',
    'error',
    'maintenance',
    'feature',
    'update'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create priority levels enum
DO $$ BEGIN
  CREATE TYPE announcement_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create platform_announcements table
CREATE TABLE IF NOT EXISTS platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  type announcement_type DEFAULT 'info',
  priority announcement_priority DEFAULT 'medium',
  icon text,

  -- Targeting
  target_audience text DEFAULT 'all' CHECK (target_audience IN (
    'all', 'providers', 'customers', 'verified', 'premium'
  )),

  -- Scheduling
  published_at timestamptz,
  expires_at timestamptz,

  -- Display settings
  is_dismissible boolean DEFAULT true,
  show_in_banner boolean DEFAULT true,
  show_in_notifications boolean DEFAULT false,
  require_acknowledgment boolean DEFAULT false,

  -- Action button
  action_text text,
  action_url text,

  -- Metadata
  created_by uuid NOT NULL REFERENCES profiles(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create announcement_reads table
CREATE TABLE IF NOT EXISTS announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES platform_announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  dismissed boolean DEFAULT false,
  acknowledged boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_announcements_active ON platform_announcements(is_active, published_at DESC)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_announcements_published ON platform_announcements(published_at)
  WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_expires ON platform_announcements(expires_at)
  WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_target ON platform_announcements(target_audience);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id, read_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON announcement_reads(announcement_id);

-- Enable RLS
ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_announcements
CREATE POLICY "Anyone can view active published announcements"
  ON platform_announcements FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (published_at IS NULL OR published_at <= NOW())
    AND (expires_at IS NULL OR expires_at > NOW())
  );

CREATE POLICY "Admins can view all announcements"
  ON platform_announcements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can create announcements"
  ON platform_announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update announcements"
  ON platform_announcements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete announcements"
  ON platform_announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for announcement_reads
CREATE POLICY "Users can view own read records"
  ON announcement_reads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own read records"
  ON announcement_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own read records"
  ON announcement_reads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all read records"
  ON announcement_reads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to get active announcements for a user
CREATE OR REPLACE FUNCTION get_user_announcements(p_user_id uuid)
RETURNS TABLE (
  announcement_id uuid,
  title text,
  content text,
  type announcement_type,
  priority announcement_priority,
  icon text,
  published_at timestamptz,
  expires_at timestamptz,
  is_dismissible boolean,
  show_in_banner boolean,
  action_text text,
  action_url text,
  is_read boolean,
  is_dismissed boolean,
  is_acknowledged boolean,
  read_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.content,
    a.type,
    a.priority,
    a.icon,
    a.published_at,
    a.expires_at,
    a.is_dismissible,
    a.show_in_banner,
    a.action_text,
    a.action_url,
    COALESCE(ar.user_id IS NOT NULL, false) as is_read,
    COALESCE(ar.dismissed, false) as is_dismissed,
    COALESCE(ar.acknowledged, false) as is_acknowledged,
    ar.read_at
  FROM platform_announcements a
  LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = p_user_id
  WHERE a.is_active = true
    AND (a.published_at IS NULL OR a.published_at <= NOW())
    AND (a.expires_at IS NULL OR a.expires_at > NOW())
    AND (
      a.target_audience = 'all'
      OR (a.target_audience = 'providers' AND EXISTS (
        SELECT 1 FROM profiles WHERE id = p_user_id AND user_type = 'provider'
      ))
      OR (a.target_audience = 'customers' AND EXISTS (
        SELECT 1 FROM profiles WHERE id = p_user_id AND user_type = 'customer'
      ))
      OR (a.target_audience = 'verified' AND EXISTS (
        SELECT 1 FROM profiles WHERE id = p_user_id AND is_verified = true
      ))
      OR (a.target_audience = 'premium' AND EXISTS (
        SELECT 1 FROM profiles WHERE id = p_user_id AND subscription_tier = 'premium'
      ))
    )
  ORDER BY
    CASE a.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    a.published_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark announcement as read
CREATE OR REPLACE FUNCTION mark_announcement_read(
  p_announcement_id uuid,
  p_dismissed boolean DEFAULT false,
  p_acknowledged boolean DEFAULT false
)
RETURNS uuid AS $$
DECLARE
  v_read_id uuid;
BEGIN
  INSERT INTO announcement_reads (
    announcement_id, user_id, dismissed, acknowledged
  ) VALUES (
    p_announcement_id, auth.uid(), p_dismissed, p_acknowledged
  )
  ON CONFLICT (announcement_id, user_id)
  DO UPDATE SET
    dismissed = EXCLUDED.dismissed OR announcement_reads.dismissed,
    acknowledged = EXCLUDED.acknowledged OR announcement_reads.acknowledged,
    read_at = NOW()
  RETURNING id INTO v_read_id;

  RETURN v_read_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get announcement statistics
CREATE OR REPLACE FUNCTION get_announcement_stats(p_announcement_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_reads', COUNT(*),
    'dismissed_count', COUNT(*) FILTER (WHERE dismissed = true),
    'acknowledged_count', COUNT(*) FILTER (WHERE acknowledged = true),
    'unique_readers', COUNT(DISTINCT user_id)
  ) INTO v_stats
  FROM announcement_reads
  WHERE announcement_id = p_announcement_id;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-expire old announcements
CREATE OR REPLACE FUNCTION auto_expire_announcements()
RETURNS void AS $$
BEGIN
  UPDATE platform_announcements
  SET is_active = false
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_announcement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_announcement_timestamp ON platform_announcements;
CREATE TRIGGER trigger_update_announcement_timestamp
  BEFORE UPDATE ON platform_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcement_updated_at();

COMMENT ON TABLE platform_announcements IS 'Platform-wide announcements and notifications';
COMMENT ON TABLE announcement_reads IS 'Tracks which users have read/dismissed announcements';
COMMENT ON FUNCTION get_user_announcements IS 'Get all active announcements for a specific user';
COMMENT ON FUNCTION mark_announcement_read IS 'Mark an announcement as read/dismissed/acknowledged';
COMMENT ON FUNCTION get_announcement_stats IS 'Get engagement statistics for an announcement';
COMMENT ON FUNCTION auto_expire_announcements IS 'Automatically expire announcements past their expiry date';
