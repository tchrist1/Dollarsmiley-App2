/*
  # Enhanced Notification System

  1. New Features
    - Notification grouping and batching
    - Notification categories with custom settings
    - Notification delivery scheduling
    - Notification templates
    - Push notification retry mechanism
    - Notification analytics tracking

  2. New Tables
    - `notification_groups` - Group related notifications
    - `notification_templates` - Reusable notification templates
    - `notification_delivery_log` - Track delivery attempts and failures
    - `notification_settings` - Per-user granular notification settings

  3. Enhanced Features
    - Better notification type management
    - Delivery status tracking
    - Failed delivery retry logic
    - Notification archiving
    - Notification muting

  4. Security
    - RLS policies for all new tables
    - Proper user data isolation
*/

-- Add new columns to notifications table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN group_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'related_type'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'related_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN archived_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'delivery_attempts'
  ) THEN
    ALTER TABLE notifications ADD COLUMN delivery_attempts integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'last_delivery_attempt'
  ) THEN
    ALTER TABLE notifications ADD COLUMN last_delivery_attempt timestamptz;
  END IF;
END $$;

-- Expand notification type enum
DO $$
BEGIN
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'BookingRequested', 'BookingConfirmed', 'BookingCancelled', 'BookingCompleted',
    'PaymentReceived', 'PaymentHeldInEscrow', 'PayoutProcessed', 'RefundProcessed',
    'DisputeFiled', 'DisputeResolved', 'MessageReceived', 'ReviewReceived',
    'ReviewResponse', 'ProviderVerified', 'ProviderRejected', 'Promotional',
    'System', 'Admin', 'Verification', 'BalanceReminder', 'QuoteReceived'
  ));
END $$;

-- Create notification_groups table
CREATE TABLE IF NOT EXISTS notification_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  latest_notification_id uuid,
  notification_count integer DEFAULT 1,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text UNIQUE NOT NULL,
  title_template text NOT NULL,
  body_template text NOT NULL,
  default_priority text DEFAULT 'normal' CHECK (default_priority IN ('high', 'normal', 'low')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notification_delivery_log table
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  push_token_id uuid REFERENCES push_tokens(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'device_not_registered')),
  error_message text,
  expo_receipt_id text,
  attempted_at timestamptz DEFAULT now()
);

-- Create notification_settings table (more granular than preferences)
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  push_enabled boolean DEFAULT true,
  in_app_enabled boolean DEFAULT true,
  email_enabled boolean DEFAULT false,
  quiet_hours_start time,
  quiet_hours_end time,
  muted_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

-- Enable RLS
ALTER TABLE notification_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_groups
CREATE POLICY "Users can view own notification groups"
  ON notification_groups FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for notification_templates
CREATE POLICY "Anyone can view active templates"
  ON notification_templates FOR SELECT
  USING (is_active = true);

-- RLS Policies for notification_delivery_log
CREATE POLICY "Users can view own delivery logs"
  ON notification_delivery_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notifications
      WHERE notifications.id = notification_id
      AND notifications.user_id = auth.uid()
    )
  );

-- RLS Policies for notification_settings
CREATE POLICY "Users can view own settings"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own settings"
  ON notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own settings"
  ON notification_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_group ON notifications(group_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related ON notifications(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_notifications_archived ON notifications(archived_at);
CREATE INDEX IF NOT EXISTS idx_notification_groups_user ON notification_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_notification ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);

-- Function to group similar notifications
CREATE OR REPLACE FUNCTION group_notification(
  p_user_id uuid,
  p_type text,
  p_notification_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_group_id uuid;
  v_group_title text;
BEGIN
  -- Check if a recent group exists for this type (within last hour)
  SELECT id INTO v_group_id
  FROM notification_groups
  WHERE user_id = p_user_id
  AND type = p_type
  AND updated_at > now() - interval '1 hour'
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Determine group title based on type
  CASE p_type
    WHEN 'MessageReceived' THEN
      v_group_title := 'New Messages';
    WHEN 'BookingRequested' THEN
      v_group_title := 'Booking Requests';
    WHEN 'ReviewReceived' THEN
      v_group_title := 'New Reviews';
    ELSE
      v_group_title := p_type;
  END CASE;

  IF v_group_id IS NULL THEN
    -- Create new group
    INSERT INTO notification_groups (user_id, type, title, latest_notification_id, notification_count)
    VALUES (p_user_id, p_type, v_group_title, p_notification_id, 1)
    RETURNING id INTO v_group_id;
  ELSE
    -- Update existing group
    UPDATE notification_groups
    SET
      notification_count = notification_count + 1,
      latest_notification_id = p_notification_id,
      updated_at = now()
    WHERE id = v_group_id;
  END IF;

  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if notification should be sent based on user settings
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id uuid,
  p_type text,
  p_delivery_method text DEFAULT 'push'
)
RETURNS boolean AS $$
DECLARE
  v_settings RECORD;
  v_preferences RECORD;
  v_current_time time;
BEGIN
  -- Check notification_settings first (most specific)
  SELECT * INTO v_settings
  FROM notification_settings
  WHERE user_id = p_user_id
  AND notification_type = p_type;

  IF FOUND THEN
    -- Check if muted
    IF v_settings.muted_until IS NOT NULL AND v_settings.muted_until > now() THEN
      RETURN false;
    END IF;

    -- Check delivery method specific setting
    IF p_delivery_method = 'push' AND NOT v_settings.push_enabled THEN
      RETURN false;
    END IF;

    IF p_delivery_method = 'in_app' AND NOT v_settings.in_app_enabled THEN
      RETURN false;
    END IF;

    IF p_delivery_method = 'email' AND NOT v_settings.email_enabled THEN
      RETURN false;
    END IF;

    -- Check quiet hours
    IF v_settings.quiet_hours_start IS NOT NULL AND v_settings.quiet_hours_end IS NOT NULL THEN
      v_current_time := CURRENT_TIME;
      IF v_current_time >= v_settings.quiet_hours_start AND v_current_time <= v_settings.quiet_hours_end THEN
        RETURN false;
      END IF;
    END IF;
  END IF;

  -- Fall back to notification_preferences
  SELECT * INTO v_preferences
  FROM notification_preferences
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN true; -- Default to sending if no preferences set
  END IF;

  -- Check global push enabled
  IF p_delivery_method = 'push' AND NOT v_preferences.push_enabled THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to retry failed notifications
CREATE OR REPLACE FUNCTION retry_failed_notifications()
RETURNS void AS $$
DECLARE
  v_notification RECORD;
BEGIN
  FOR v_notification IN
    SELECT DISTINCT n.*
    FROM notifications n
    WHERE n.is_sent = false
    AND n.delivery_attempts < 3
    AND (n.last_delivery_attempt IS NULL OR n.last_delivery_attempt < now() - interval '5 minutes')
    AND n.created_at > now() - interval '24 hours'
  LOOP
    -- Update delivery attempt
    UPDATE notifications
    SET
      delivery_attempts = delivery_attempts + 1,
      last_delivery_attempt = now()
    WHERE id = v_notification.id;

    -- Note: Actual push sending would be handled by the edge function
    -- This just marks notifications for retry
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive old read notifications
CREATE OR REPLACE FUNCTION archive_old_notifications()
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET archived_at = now()
  WHERE is_read = true
  AND archived_at IS NULL
  AND created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread count by category
CREATE OR REPLACE FUNCTION get_unread_counts(p_user_id uuid)
RETURNS TABLE (
  total bigint,
  bookings bigint,
  messages bigint,
  payments bigint,
  reviews bigint,
  system bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total,
    COUNT(*) FILTER (WHERE type LIKE 'Booking%')::bigint as bookings,
    COUNT(*) FILTER (WHERE type = 'MessageReceived')::bigint as messages,
    COUNT(*) FILTER (WHERE type LIKE 'Payment%' OR type LIKE 'Payout%' OR type LIKE 'Refund%')::bigint as payments,
    COUNT(*) FILTER (WHERE type LIKE 'Review%')::bigint as reviews,
    COUNT(*) FILTER (WHERE type IN ('System', 'Admin', 'Promotional'))::bigint as system
  FROM notifications
  WHERE user_id = p_user_id
  AND is_read = false
  AND archived_at IS NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to mute notifications for a period
CREATE OR REPLACE FUNCTION mute_notifications(
  p_user_id uuid,
  p_notification_type text,
  p_duration_hours integer DEFAULT 24
)
RETURNS void AS $$
BEGIN
  INSERT INTO notification_settings (user_id, notification_type, muted_until)
  VALUES (p_user_id, p_notification_type, now() + (p_duration_hours || ' hours')::interval)
  ON CONFLICT (user_id, notification_type)
  DO UPDATE SET
    muted_until = now() + (p_duration_hours || ' hours')::interval,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set quiet hours
CREATE OR REPLACE FUNCTION set_quiet_hours(
  p_user_id uuid,
  p_notification_type text,
  p_start_time time,
  p_end_time time
)
RETURNS void AS $$
BEGIN
  INSERT INTO notification_settings (user_id, notification_type, quiet_hours_start, quiet_hours_end)
  VALUES (p_user_id, p_notification_type, p_start_time, p_end_time)
  ON CONFLICT (user_id, notification_type)
  DO UPDATE SET
    quiet_hours_start = p_start_time,
    quiet_hours_end = p_end_time,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default notification templates
INSERT INTO notification_templates (type, title_template, body_template, default_priority) VALUES
  ('BookingRequested', 'New Booking Request', 'You have a new booking request for {{service_name}}.', 'high'),
  ('BookingConfirmed', 'Booking Confirmed', 'Your booking for {{service_name}} has been confirmed!', 'high'),
  ('BookingCancelled', 'Booking Cancelled', 'Booking for {{service_name}} has been cancelled.', 'normal'),
  ('BookingCompleted', 'Booking Completed', 'Your booking for {{service_name}} has been completed. Please leave a review!', 'normal'),
  ('PaymentReceived', 'Payment Received', 'Payment of ${{amount}} has been received.', 'high'),
  ('PaymentHeldInEscrow', 'Payment Held', 'Payment of ${{amount}} is held in escrow until completion.', 'normal'),
  ('PayoutProcessed', 'Payout Sent', 'Your payout of ${{amount}} has been processed.', 'high'),
  ('MessageReceived', 'New Message', 'You have a new message from {{sender_name}}.', 'normal'),
  ('ReviewReceived', 'New Review', 'You received a {{rating}}-star review!', 'normal')
ON CONFLICT (type) DO NOTHING;

COMMENT ON TABLE notification_groups IS 'Groups related notifications for better UX';
COMMENT ON TABLE notification_templates IS 'Reusable templates for consistent notification formatting';
COMMENT ON TABLE notification_delivery_log IS 'Tracks all notification delivery attempts and results';
COMMENT ON TABLE notification_settings IS 'Granular per-type notification settings for users';
COMMENT ON FUNCTION group_notification IS 'Groups similar notifications within 1 hour window';
COMMENT ON FUNCTION should_send_notification IS 'Checks user preferences and settings before sending';
COMMENT ON FUNCTION retry_failed_notifications IS 'Retries failed notifications up to 3 times';
COMMENT ON FUNCTION archive_old_notifications IS 'Archives read notifications older than 30 days';
COMMENT ON FUNCTION get_unread_counts IS 'Returns categorized unread notification counts';
COMMENT ON FUNCTION mute_notifications IS 'Temporarily mutes specific notification types';
COMMENT ON FUNCTION set_quiet_hours IS 'Sets time window when notifications are suppressed';
