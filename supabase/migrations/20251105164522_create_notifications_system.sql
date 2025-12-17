/*
  # Notifications System

  ## Overview
  Comprehensive notification system supporting push notifications, in-app notifications,
  and notification preferences for booking events, payments, and platform updates.

  ## New Tables
  
  ### 1. `push_tokens`
  Stores Expo push notification tokens for each user device
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles) - token owner
  - `token` (text, unique) - Expo push token
  - `device_type` (text) - ios, android, web
  - `device_name` (text) - optional device identifier
  - `is_active` (boolean) - token validity status
  - `last_used` (timestamptz) - last successful notification
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 2. `notifications`
  Stores all notifications sent to users
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles) - notification recipient
  - `type` (text) - BookingConfirmed, BookingCancelled, PaymentReceived, etc.
  - `title` (text) - notification title
  - `body` (text) - notification message
  - `data` (jsonb) - additional data (booking_id, amount, etc.)
  - `is_read` (boolean) - read status
  - `is_sent` (boolean) - push notification sent
  - `sent_at` (timestamptz) - when push was sent
  - `read_at` (timestamptz) - when user read it
  - `action_url` (text) - deep link to relevant screen
  - `priority` (text) - high, normal, low
  - `created_at` (timestamptz)
  
  ### 3. `notification_preferences`
  User preferences for different notification types
  - `id` (uuid, primary key)
  - `user_id` (uuid, unique, references profiles)
  - `booking_confirmed` (boolean) - notify on booking confirmation
  - `booking_cancelled` (boolean) - notify on cancellation
  - `booking_completed` (boolean) - notify on completion
  - `payment_received` (boolean) - notify on payment
  - `payout_processed` (boolean) - notify on payout
  - `dispute_filed` (boolean) - notify on dispute
  - `dispute_resolved` (boolean) - notify on resolution
  - `message_received` (boolean) - notify on new message
  - `review_received` (boolean) - notify on new review
  - `promotional` (boolean) - marketing notifications
  - `push_enabled` (boolean) - master switch for push
  - `email_enabled` (boolean) - email notifications (future)
  - `sms_enabled` (boolean) - SMS notifications (future)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Notification Types
  Supported notification types:
  - `BookingRequested` - New booking request (provider)
  - `BookingConfirmed` - Booking confirmed after payment (customer & provider)
  - `BookingCancelled` - Booking cancelled (both parties)
  - `BookingCompleted` - Booking marked complete (both parties)
  - `PaymentReceived` - Payment confirmed (customer)
  - `PaymentHeldInEscrow` - Payment held in escrow (provider)
  - `PayoutProcessed` - Payout transferred (provider)
  - `RefundProcessed` - Refund issued (customer)
  - `DisputeFiled` - Dispute created (both parties)
  - `DisputeResolved` - Dispute resolved (both parties)
  - `MessageReceived` - New chat message
  - `ReviewReceived` - New review posted
  - `ProviderVerified` - Verification approved
  - `ProviderRejected` - Verification rejected
  - `Promotional` - Marketing/promotional content

  ## Security
  - Enable RLS on all tables
  - Users can only view/manage their own tokens and notifications
  - Users can only update their own preferences
  - Push tokens are private and scoped to user

  ## Important Notes
  - Push tokens expire and need refresh
  - Notifications are created even if push fails (in-app fallback)
  - Users have granular control over notification types
  - Default preferences enable all critical notifications
  - Promotional notifications default to false
*/

-- Create push_tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  device_type text CHECK (device_type IN ('ios', 'android', 'web')),
  device_name text,
  is_active boolean DEFAULT true,
  last_used timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN (
    'BookingRequested', 'BookingConfirmed', 'BookingCancelled', 'BookingCompleted',
    'PaymentReceived', 'PaymentHeldInEscrow', 'PayoutProcessed', 'RefundProcessed',
    'DisputeFiled', 'DisputeResolved', 'MessageReceived', 'ReviewReceived',
    'ProviderVerified', 'ProviderRejected', 'Promotional'
  )),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  is_sent boolean DEFAULT false,
  sent_at timestamptz,
  read_at timestamptz,
  action_url text,
  priority text DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  created_at timestamptz DEFAULT now()
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  booking_requested boolean DEFAULT true,
  booking_confirmed boolean DEFAULT true,
  booking_cancelled boolean DEFAULT true,
  booking_completed boolean DEFAULT true,
  payment_received boolean DEFAULT true,
  payout_processed boolean DEFAULT true,
  dispute_filed boolean DEFAULT true,
  dispute_resolved boolean DEFAULT true,
  message_received boolean DEFAULT true,
  review_received boolean DEFAULT true,
  promotional boolean DEFAULT false,
  push_enabled boolean DEFAULT true,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_tokens
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own push tokens"
  ON push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- Function to auto-create notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences on profile creation
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON profiles;
CREATE TRIGGER trigger_create_notification_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();