/*
  # Add Stripe Customer ID to Profiles

  1. Changes
    - Add stripe_customer_id column to profiles table
    - Add push_token column for mobile notifications
    - Add notification_preferences column for notification settings

  2. Security
    - Column is nullable
    - Users can only update their own profile
*/

-- Add stripe_customer_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_customer_id text UNIQUE;
  END IF;
END $$;

-- Add push_token column for mobile notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'push_token'
  ) THEN
    ALTER TABLE profiles ADD COLUMN push_token text;
  END IF;
END $$;

-- Add notification_preferences column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_preferences jsonb DEFAULT '{
      "search_alerts": true,
      "new_matches": true,
      "price_alerts": true,
      "availability_alerts": true,
      "trending_alerts": false,
      "instant_notifications": true,
      "daily_digest": false,
      "weekly_digest": false
    }'::jsonb;
  END IF;
END $$;

-- Create index on stripe_customer_id
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Create index on push_token
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token);
