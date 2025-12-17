/*
  # Admin Dashboard Schema

  1. New Tables
    - `admin_roles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles, unique)
      - `role` (text: 'SuperAdmin', 'Admin', 'Moderator')
      - `permissions` (jsonb array)
      - `assigned_by` (uuid, references profiles)
      - `assigned_at` (timestamptz)

    - `admin_actions`
      - `id` (uuid, primary key)
      - `admin_id` (uuid, references profiles)
      - `action_type` (text)
      - `target_type` (text)
      - `target_id` (uuid)
      - `details` (jsonb)
      - `created_at` (timestamptz)

    - `platform_metrics`
      - `id` (uuid, primary key)
      - `metric_date` (date, unique)
      - `total_users` (integer)
      - `active_users` (integer)
      - `new_users` (integer)
      - `total_listings` (integer)
      - `active_listings` (integer)
      - `total_bookings` (integer)
      - `completed_bookings` (integer)
      - `total_revenue` (numeric)
      - `platform_fees` (numeric)
      - `created_at` (timestamptz)

  2. Updates to Existing Tables
    - Add admin-specific fields to profiles

  3. Security
    - RLS policies for admin access
    - Admin-only functions

  4. Views
    - Analytics views for reporting
*/

-- Create admin_roles table
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'Moderator' CHECK (role IN ('SuperAdmin', 'Admin', 'Moderator')),
  permissions jsonb DEFAULT '[]'::jsonb,
  assigned_by uuid REFERENCES profiles(id),
  assigned_at timestamptz DEFAULT now()
);

-- Create admin_actions table
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN (
    'UserSuspend', 'UserActivate', 'ListingApprove', 'ListingReject', 
    'BookingCancel', 'VerificationApprove', 'VerificationReject',
    'PayoutApprove', 'PayoutReject', 'ContentModeration'
  )),
  target_type text NOT NULL CHECK (target_type IN (
    'User', 'Listing', 'Booking', 'Verification', 'Payout', 'Review'
  )),
  target_id uuid NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create platform_metrics table
CREATE TABLE IF NOT EXISTS platform_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,
  total_users integer DEFAULT 0,
  active_users integer DEFAULT 0,
  new_users integer DEFAULT 0,
  total_listings integer DEFAULT 0,
  active_listings integer DEFAULT 0,
  total_bookings integer DEFAULT 0,
  completed_bookings integer DEFAULT 0,
  total_revenue numeric(10, 2) DEFAULT 0.00,
  platform_fees numeric(10, 2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now()
);

-- Add admin fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_suspended'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_suspended boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'suspension_reason'
  ) THEN
    ALTER TABLE profiles ADD COLUMN suspension_reason text;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_date ON platform_metrics(metric_date DESC);

-- Enable RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_roles
CREATE POLICY "Admins can view all roles"
  ON admin_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
    )
  );

-- RLS Policies for admin_actions
CREATE POLICY "Admins can view all actions"
  ON admin_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create actions"
  ON admin_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
    )
  );

-- RLS Policies for platform_metrics
CREATE POLICY "Admins can view metrics"
  ON platform_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
    )
  );

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id uuid,
  p_action_type text,
  p_target_type text,
  p_target_id uuid,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_action_id uuid;
BEGIN
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'User is not an admin';
  END IF;

  INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
  VALUES (p_admin_id, p_action_type, p_target_type, p_target_id, p_details)
  RETURNING id INTO v_action_id;

  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate daily metrics
CREATE OR REPLACE FUNCTION calculate_daily_metrics(p_date date)
RETURNS void AS $$
DECLARE
  v_total_users integer;
  v_active_users integer;
  v_new_users integer;
  v_total_listings integer;
  v_active_listings integer;
  v_total_bookings integer;
  v_completed_bookings integer;
  v_total_revenue numeric;
  v_platform_fees numeric;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM profiles WHERE created_at::date <= p_date;
  
  SELECT COUNT(DISTINCT user_id) INTO v_active_users
  FROM user_preferences
  WHERE updated_at::date = p_date;
  
  SELECT COUNT(*) INTO v_new_users FROM profiles WHERE created_at::date = p_date;
  
  SELECT COUNT(*) INTO v_total_listings FROM service_listings WHERE created_at::date <= p_date;
  
  SELECT COUNT(*) INTO v_active_listings 
  FROM service_listings 
  WHERE status = 'Active' AND created_at::date <= p_date;
  
  SELECT COUNT(*) INTO v_total_bookings FROM bookings WHERE created_at::date <= p_date;
  
  SELECT COUNT(*) INTO v_completed_bookings 
  FROM bookings 
  WHERE status = 'Completed' AND completed_at::date = p_date;
  
  SELECT COALESCE(SUM(price), 0) INTO v_total_revenue
  FROM bookings
  WHERE status = 'Completed' AND completed_at::date = p_date;
  
  SELECT COALESCE(SUM(platform_fee), 0) INTO v_platform_fees
  FROM bookings
  WHERE status = 'Completed' AND completed_at::date = p_date;

  INSERT INTO platform_metrics (
    metric_date, total_users, active_users, new_users,
    total_listings, active_listings, total_bookings,
    completed_bookings, total_revenue, platform_fees
  )
  VALUES (
    p_date, v_total_users, v_active_users, v_new_users,
    v_total_listings, v_active_listings, v_total_bookings,
    v_completed_bookings, v_total_revenue, v_platform_fees
  )
  ON CONFLICT (metric_date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    new_users = EXCLUDED.new_users,
    total_listings = EXCLUDED.total_listings,
    active_listings = EXCLUDED.active_listings,
    total_bookings = EXCLUDED.total_bookings,
    completed_bookings = EXCLUDED.completed_bookings,
    total_revenue = EXCLUDED.total_revenue,
    platform_fees = EXCLUDED.platform_fees;
END;
$$ LANGUAGE plpgsql;

-- Create view for user statistics
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.user_type,
  p.subscription_plan,
  p.rating_average,
  p.total_bookings,
  p.is_verified,
  p.is_suspended,
  p.created_at,
  COUNT(DISTINCT sl.id) as total_listings,
  COUNT(DISTINCT b.id) as booking_count,
  COALESCE(SUM(CASE WHEN b.status = 'Completed' THEN b.price ELSE 0 END), 0) as total_earnings
FROM profiles p
LEFT JOIN service_listings sl ON sl.provider_id = p.id
LEFT JOIN bookings b ON b.provider_id = p.id
GROUP BY p.id;

-- Create view for listing statistics
CREATE OR REPLACE VIEW listing_statistics AS
SELECT 
  sl.id,
  sl.title,
  sl.status,
  sl.base_price,
  sl.view_count,
  sl.save_count,
  sl.booking_count,
  sl.created_at,
  p.full_name as provider_name,
  p.rating_average as provider_rating,
  c.name as category_name,
  COUNT(DISTINCT b.id) as total_bookings,
  AVG(r.rating) as avg_rating
FROM service_listings sl
LEFT JOIN profiles p ON p.id = sl.provider_id
LEFT JOIN categories c ON c.id = sl.category_id
LEFT JOIN bookings b ON b.listing_id = sl.id
LEFT JOIN reviews r ON r.booking_id = b.id
GROUP BY sl.id, p.full_name, p.rating_average, c.name;

-- Update profiles to set is_admin for existing admins if needed
UPDATE profiles SET is_admin = true
WHERE id IN (SELECT user_id FROM admin_roles);
