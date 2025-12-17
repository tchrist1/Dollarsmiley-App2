/*
  # Enhanced 24-Hour Booking Reminders

  ## Overview
  Adds tracking for sent reminders, prevents duplicate notifications, and enhances the reminder system with better scheduling and delivery confirmation.

  ## New Tables

  ### 1. `booking_reminders`
  Tracks sent reminders to prevent duplicates
  - `id` (uuid, primary key)
  - `booking_id` (uuid, references bookings)
  - `reminder_type` (text) - 24_hour, 1_hour, day_of
  - `sent_to` (uuid, references profiles) - Recipient
  - `sent_at` (timestamptz) - When sent
  - `delivery_status` (text) - Sent, Delivered, Read, Failed
  - `notification_id` (uuid) - Link to notification
  - `created_at` (timestamptz)

  ## Features
  - Track all sent reminders
  - Prevent duplicate reminders
  - Support multiple reminder types
  - Delivery confirmation
  - Read receipts
  - Failed delivery tracking

  ## Security
  - RLS enabled
  - Users can view own reminders
  - System can create/update
*/

-- Create booking_reminders table
CREATE TABLE IF NOT EXISTS booking_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('24_hour', '1_hour', 'day_of', 'custom')),
  sent_to uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  sent_at timestamptz DEFAULT now(),
  delivery_status text DEFAULT 'Sent' CHECK (delivery_status IN ('Sent', 'Delivered', 'Read', 'Failed')),
  notification_id uuid REFERENCES notifications(id) ON DELETE SET NULL,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_booking_reminders_booking ON booking_reminders(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_sent_to ON booking_reminders(sent_to);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_type ON booking_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_status ON booking_reminders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_sent_at ON booking_reminders(sent_at);

-- Create composite index for duplicate check
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_reminders_unique
  ON booking_reminders(booking_id, reminder_type, sent_to, DATE(sent_at));

-- Enable RLS
ALTER TABLE booking_reminders ENABLE ROW LEVEL SECURITY;

-- Users can view their own reminders
CREATE POLICY "Users can view own reminders"
  ON booking_reminders FOR SELECT
  TO authenticated
  USING (sent_to = auth.uid());

-- System can create reminders (via service role)
CREATE POLICY "Service role can manage reminders"
  ON booking_reminders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to check if reminder was already sent
CREATE OR REPLACE FUNCTION check_reminder_sent(
  booking_id_param uuid,
  reminder_type_param text,
  user_id_param uuid
)
RETURNS boolean AS $$
DECLARE
  reminder_exists boolean;
BEGIN
  -- Check if reminder was sent today
  SELECT EXISTS (
    SELECT 1 FROM booking_reminders
    WHERE booking_id = booking_id_param
    AND reminder_type = reminder_type_param
    AND sent_to = user_id_param
    AND DATE(sent_at) = CURRENT_DATE
  ) INTO reminder_exists;

  RETURN reminder_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to get bookings needing reminders
CREATE OR REPLACE FUNCTION get_bookings_needing_reminders(
  reminder_type_param text DEFAULT '24_hour'
)
RETURNS TABLE (
  booking_id uuid,
  title text,
  scheduled_date date,
  scheduled_time text,
  location text,
  price numeric,
  customer_id uuid,
  customer_name text,
  customer_email text,
  provider_id uuid,
  provider_name text,
  provider_email text,
  hours_until int
) AS $$
BEGIN
  IF reminder_type_param = '24_hour' THEN
    RETURN QUERY
    SELECT
      b.id,
      b.title,
      b.scheduled_date,
      b.scheduled_time,
      b.location,
      b.price,
      b.customer_id,
      cp.full_name,
      cp.email,
      b.provider_id,
      pp.full_name,
      pp.email,
      EXTRACT(EPOCH FROM (
        (b.scheduled_date + b.scheduled_time::time) - NOW()
      ))::int / 3600 as hours_until
    FROM bookings b
    JOIN profiles cp ON b.customer_id = cp.id
    JOIN profiles pp ON b.provider_id = pp.id
    WHERE b.status IN ('Confirmed', 'Accepted')
    AND b.scheduled_date = CURRENT_DATE + INTERVAL '1 day'
    AND NOT EXISTS (
      SELECT 1 FROM booking_reminders br
      WHERE br.booking_id = b.id
      AND br.reminder_type = '24_hour'
      AND DATE(br.sent_at) = CURRENT_DATE
    );
  ELSIF reminder_type_param = '1_hour' THEN
    RETURN QUERY
    SELECT
      b.id,
      b.title,
      b.scheduled_date,
      b.scheduled_time,
      b.location,
      b.price,
      b.customer_id,
      cp.full_name,
      cp.email,
      b.provider_id,
      pp.full_name,
      pp.email,
      EXTRACT(EPOCH FROM (
        (b.scheduled_date + b.scheduled_time::time) - NOW()
      ))::int / 3600 as hours_until
    FROM bookings b
    JOIN profiles cp ON b.customer_id = cp.id
    JOIN profiles pp ON b.provider_id = pp.id
    WHERE b.status IN ('Confirmed', 'Accepted')
    AND (b.scheduled_date + b.scheduled_time::time) BETWEEN NOW() AND NOW() + INTERVAL '2 hours'
    AND NOT EXISTS (
      SELECT 1 FROM booking_reminders br
      WHERE br.booking_id = b.id
      AND br.reminder_type = '1_hour'
      AND br.sent_at > NOW() - INTERVAL '2 hours'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to mark reminder as delivered
CREATE OR REPLACE FUNCTION mark_reminder_delivered(
  reminder_id_param uuid
)
RETURNS boolean AS $$
BEGIN
  UPDATE booking_reminders
  SET delivery_status = 'Delivered'
  WHERE id = reminder_id_param
  AND delivery_status = 'Sent';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to mark reminder as read
CREATE OR REPLACE FUNCTION mark_reminder_read(
  reminder_id_param uuid
)
RETURNS boolean AS $$
BEGIN
  UPDATE booking_reminders
  SET delivery_status = 'Read'
  WHERE id = reminder_id_param
  AND delivery_status IN ('Sent', 'Delivered');

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get reminder statistics
CREATE OR REPLACE FUNCTION get_reminder_stats(
  start_date_param date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date_param date DEFAULT CURRENT_DATE
)
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_sent', COUNT(*),
    'by_type', jsonb_object_agg(
      reminder_type,
      type_count
    ),
    'by_status', jsonb_object_agg(
      delivery_status,
      status_count
    ),
    'delivery_rate', ROUND(
      (COUNT(*) FILTER (WHERE delivery_status IN ('Delivered', 'Read'))::numeric /
       NULLIF(COUNT(*), 0) * 100), 2
    ),
    'read_rate', ROUND(
      (COUNT(*) FILTER (WHERE delivery_status = 'Read')::numeric /
       NULLIF(COUNT(*), 0) * 100), 2
    )
  ) INTO stats
  FROM (
    SELECT
      reminder_type,
      delivery_status,
      COUNT(*) OVER (PARTITION BY reminder_type) as type_count,
      COUNT(*) OVER (PARTITION BY delivery_status) as status_count
    FROM booking_reminders
    WHERE DATE(sent_at) BETWEEN start_date_param AND end_date_param
  ) sub;

  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Add reminder preferences to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'reminder_preferences'
  ) THEN
    ALTER TABLE profiles ADD COLUMN reminder_preferences jsonb DEFAULT jsonb_build_object(
      '24_hour_reminder', true,
      '1_hour_reminder', true,
      'day_of_reminder', true,
      'email_reminders', true,
      'push_reminders', true,
      'sms_reminders', false
    );
  END IF;
END $$;

-- Function to check user's reminder preferences
CREATE OR REPLACE FUNCTION should_send_reminder(
  user_id_param uuid,
  reminder_type_param text
)
RETURNS boolean AS $$
DECLARE
  preferences jsonb;
  should_send boolean;
BEGIN
  -- Get user preferences
  SELECT reminder_preferences INTO preferences
  FROM profiles
  WHERE id = user_id_param;

  -- Default to true if no preferences set
  IF preferences IS NULL THEN
    RETURN true;
  END IF;

  -- Check specific reminder type preference
  should_send := COALESCE(
    (preferences->>reminder_type_param)::boolean,
    true
  );

  RETURN should_send;
END;
$$ LANGUAGE plpgsql;

-- Create view for upcoming bookings with reminder status
CREATE OR REPLACE VIEW upcoming_bookings_with_reminders AS
SELECT
  b.id,
  b.title,
  b.scheduled_date,
  b.scheduled_time,
  b.location,
  b.status,
  b.customer_id,
  b.provider_id,
  cp.full_name as customer_name,
  pp.full_name as provider_name,
  EXTRACT(EPOCH FROM (
    (b.scheduled_date + b.scheduled_time::time) - NOW()
  ))::int / 3600 as hours_until,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'type', br.reminder_type,
        'sent_at', br.sent_at,
        'status', br.delivery_status,
        'sent_to', br.sent_to
      )
    )
    FROM booking_reminders br
    WHERE br.booking_id = b.id
  ) as reminders_sent
FROM bookings b
JOIN profiles cp ON b.customer_id = cp.id
JOIN profiles pp ON b.provider_id = pp.id
WHERE b.status IN ('Confirmed', 'Accepted')
AND b.scheduled_date >= CURRENT_DATE
ORDER BY b.scheduled_date, b.scheduled_time;
