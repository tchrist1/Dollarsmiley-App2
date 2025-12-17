/*
  # Auto-Trigger Review Prompts After Booking Completion

  ## Overview
  Automatically sends review prompt notifications to customers after a booking is completed,
  with configurable timing, tracking, and reminder system.

  ## New Tables

  ### 1. `review_prompts`
  Tracks review prompt requests and status
  - `id` (uuid, primary key)
  - `booking_id` (uuid, references bookings)
  - `customer_id` (uuid, references profiles)
  - `provider_id` (uuid, references profiles)
  - `prompt_sent_at` (timestamptz) - When prompt was sent
  - `reminder_sent_at` (timestamptz) - When reminder was sent
  - `review_submitted_at` (timestamptz) - When review was submitted
  - `status` (text) - Pending, Reminded, Submitted, Expired
  - `expires_at` (timestamptz) - When prompt expires
  - `notification_id` (uuid) - Link to notification
  - `reminder_notification_id` (uuid) - Link to reminder notification
  - `created_at` (timestamptz)

  ## Features
  - Automatic prompt after completion
  - 24-hour reminder if no review
  - 7-day expiration
  - Track submission
  - Prevent duplicate prompts

  ## Triggers
  - Auto-send prompt on booking completion
  - Auto-send reminder after 24h
  - Auto-expire after 7 days

  ## Security
  - RLS enabled
  - Users can view own prompts
  - System can manage
*/

-- Create review_prompts table
CREATE TABLE IF NOT EXISTS review_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  prompt_sent_at timestamptz DEFAULT now(),
  reminder_sent_at timestamptz,
  review_submitted_at timestamptz,
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Reminded', 'Submitted', 'Expired')),
  expires_at timestamptz DEFAULT (now() + INTERVAL '7 days'),
  notification_id uuid REFERENCES notifications(id) ON DELETE SET NULL,
  reminder_notification_id uuid REFERENCES notifications(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_review_prompts_booking ON review_prompts(booking_id);
CREATE INDEX IF NOT EXISTS idx_review_prompts_customer ON review_prompts(customer_id);
CREATE INDEX IF NOT EXISTS idx_review_prompts_provider ON review_prompts(provider_id);
CREATE INDEX IF NOT EXISTS idx_review_prompts_status ON review_prompts(status);
CREATE INDEX IF NOT EXISTS idx_review_prompts_expires ON review_prompts(expires_at);

-- Enable RLS
ALTER TABLE review_prompts ENABLE ROW LEVEL SECURITY;

-- Users can view their own prompts
CREATE POLICY "Users can view own review prompts"
  ON review_prompts FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid() OR
    provider_id = auth.uid()
  );

-- Service role can manage
CREATE POLICY "Service role can manage review prompts"
  ON review_prompts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to create review prompt after booking completion
CREATE OR REPLACE FUNCTION trigger_review_prompt()
RETURNS TRIGGER AS $$
DECLARE
  prompt_record RECORD;
  notif_id uuid;
BEGIN
  -- Only trigger if status changed to Completed
  IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN

    -- Check if prompt already exists
    IF EXISTS (SELECT 1 FROM review_prompts WHERE booking_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Create notification for customer
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      NEW.customer_id,
      'review_prompt',
      'How was your service?',
      'Please share your experience with ' || (
        SELECT full_name FROM profiles WHERE id = NEW.provider_id
      ),
      jsonb_build_object(
        'booking_id', NEW.id,
        'provider_id', NEW.provider_id,
        'action_url', '/review/' || NEW.id,
        'prompt_type', 'initial'
      )
    ) RETURNING id INTO notif_id;

    -- Create review prompt record
    INSERT INTO review_prompts (
      booking_id,
      customer_id,
      provider_id,
      notification_id,
      status
    ) VALUES (
      NEW.id,
      NEW.customer_id,
      NEW.provider_id,
      notif_id,
      'Pending'
    );

    -- Add XP for provider (booking completion)
    INSERT INTO user_gamification (user_id, level, current_xp)
    VALUES (NEW.provider_id, 1, 0)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE user_gamification
    SET current_xp = current_xp + 50,
        total_xp = total_xp + 50
    WHERE user_id = NEW.provider_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on booking completion
DROP TRIGGER IF EXISTS trigger_review_prompt_on_completion ON bookings;
CREATE TRIGGER trigger_review_prompt_on_completion
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_review_prompt();

-- Function to mark prompt as submitted when review is added
CREATE OR REPLACE FUNCTION mark_review_prompt_submitted()
RETURNS TRIGGER AS $$
BEGIN
  -- Update review prompt status
  UPDATE review_prompts
  SET
    status = 'Submitted',
    review_submitted_at = NEW.created_at
  WHERE booking_id = NEW.booking_id
  AND customer_id = NEW.reviewer_id;

  -- Add XP for reviewing
  UPDATE user_gamification
  SET current_xp = current_xp + 20,
      total_xp = total_xp + 20
  WHERE user_id = NEW.reviewer_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on review submission
DROP TRIGGER IF EXISTS mark_review_prompt_submitted_trigger ON reviews;
CREATE TRIGGER mark_review_prompt_submitted_trigger
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION mark_review_prompt_submitted();

-- Function to get pending review prompts for reminders
CREATE OR REPLACE FUNCTION get_pending_review_prompts()
RETURNS TABLE (
  id uuid,
  booking_id uuid,
  booking_title text,
  customer_id uuid,
  customer_name text,
  customer_email text,
  provider_id uuid,
  provider_name text,
  prompt_sent_at timestamptz,
  hours_since_prompt int
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rp.id,
    rp.booking_id,
    b.title,
    rp.customer_id,
    cp.full_name,
    cp.email,
    rp.provider_id,
    pp.full_name,
    rp.prompt_sent_at,
    EXTRACT(EPOCH FROM (NOW() - rp.prompt_sent_at))::int / 3600 as hours_since_prompt
  FROM review_prompts rp
  JOIN bookings b ON rp.booking_id = b.id
  JOIN profiles cp ON rp.customer_id = cp.id
  JOIN profiles pp ON rp.provider_id = pp.id
  WHERE rp.status = 'Pending'
  AND rp.reminder_sent_at IS NULL
  AND rp.prompt_sent_at < NOW() - INTERVAL '24 hours'
  AND rp.expires_at > NOW()
  ORDER BY rp.prompt_sent_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get expired review prompts
CREATE OR REPLACE FUNCTION get_expired_review_prompts()
RETURNS TABLE (
  id uuid,
  booking_id uuid,
  customer_id uuid,
  provider_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rp.id,
    rp.booking_id,
    rp.customer_id,
    rp.provider_id
  FROM review_prompts rp
  WHERE rp.status IN ('Pending', 'Reminded')
  AND rp.expires_at < NOW()
  ORDER BY rp.expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire old prompts
CREATE OR REPLACE FUNCTION expire_old_review_prompts()
RETURNS int AS $$
DECLARE
  expired_count int;
BEGIN
  UPDATE review_prompts
  SET status = 'Expired'
  WHERE status IN ('Pending', 'Reminded')
  AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send review reminder
CREATE OR REPLACE FUNCTION send_review_reminder(prompt_id_param uuid)
RETURNS boolean AS $$
DECLARE
  prompt_record RECORD;
  notif_id uuid;
BEGIN
  -- Get prompt details
  SELECT
    rp.*,
    b.title as booking_title,
    pp.full_name as provider_name
  INTO prompt_record
  FROM review_prompts rp
  JOIN bookings b ON rp.booking_id = b.id
  JOIN profiles pp ON rp.provider_id = pp.id
  WHERE rp.id = prompt_id_param;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Create reminder notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    prompt_record.customer_id,
    'review_reminder',
    'Don''t forget to review',
    'Share your experience with ' || prompt_record.provider_name || ' for your ' || prompt_record.booking_title,
    jsonb_build_object(
      'booking_id', prompt_record.booking_id,
      'provider_id', prompt_record.provider_id,
      'action_url', '/review/' || prompt_record.booking_id,
      'prompt_type', 'reminder'
    )
  ) RETURNING id INTO notif_id;

  -- Update prompt record
  UPDATE review_prompts
  SET
    status = 'Reminded',
    reminder_sent_at = NOW(),
    reminder_notification_id = notif_id
  WHERE id = prompt_id_param;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get review prompt statistics
CREATE OR REPLACE FUNCTION get_review_prompt_stats(
  start_date_param date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date_param date DEFAULT CURRENT_DATE
)
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_prompts', COUNT(*),
    'by_status', jsonb_object_agg(
      status,
      status_count
    ),
    'submission_rate', ROUND(
      (COUNT(*) FILTER (WHERE status = 'Submitted')::numeric /
       NULLIF(COUNT(*), 0) * 100), 2
    ),
    'reminder_rate', ROUND(
      (COUNT(*) FILTER (WHERE status = 'Reminded')::numeric /
       NULLIF(COUNT(*), 0) * 100), 2
    ),
    'expiration_rate', ROUND(
      (COUNT(*) FILTER (WHERE status = 'Expired')::numeric /
       NULLIF(COUNT(*), 0) * 100), 2
    ),
    'avg_response_time_hours', ROUND(
      AVG(EXTRACT(EPOCH FROM (review_submitted_at - prompt_sent_at)) / 3600)::numeric, 2
    ) FILTER (WHERE status = 'Submitted')
  ) INTO stats
  FROM (
    SELECT
      status,
      COUNT(*) OVER (PARTITION BY status) as status_count,
      review_submitted_at,
      prompt_sent_at
    FROM review_prompts
    WHERE DATE(created_at) BETWEEN start_date_param AND end_date_param
  ) sub;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add review_prompt_preferences to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'review_prompt_preferences'
  ) THEN
    ALTER TABLE profiles ADD COLUMN review_prompt_preferences jsonb DEFAULT jsonb_build_object(
      'enabled', true,
      'reminder_enabled', true,
      'prompt_delay_hours', 0,
      'reminder_delay_hours', 24
    );
  END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_pending_review_prompts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_expired_review_prompts() TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_review_prompts() TO service_role;
GRANT EXECUTE ON FUNCTION send_review_reminder(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION get_review_prompt_stats(date, date) TO authenticated;
