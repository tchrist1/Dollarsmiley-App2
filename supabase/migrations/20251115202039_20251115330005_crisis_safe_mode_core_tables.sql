/*
  # Crisis Mode & Safe Mode System - Core Tables

  1. New Tables (Part 1)
    - emergency_contacts
    - trusted_contacts
    - safety_checkins
    - safety_alerts
    - crisis_mode_sessions
*/

-- Emergency Contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  contact_name text NOT NULL,
  relationship text,

  phone_number text NOT NULL,
  email text,

  priority_order integer DEFAULT 1,

  can_receive_alerts boolean DEFAULT true,
  can_track_location boolean DEFAULT false,
  can_access_booking_details boolean DEFAULT false,

  is_verified boolean DEFAULT false,
  verified_at timestamptz,

  is_active boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trusted Contacts
CREATE TABLE IF NOT EXISTS trusted_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  trusted_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  trust_level text DEFAULT 'standard',

  can_see_location boolean DEFAULT false,
  can_see_bookings boolean DEFAULT false,
  can_receive_checkin_alerts boolean DEFAULT true,

  status text DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  accepted_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, trusted_user_id)
);

-- Safety Check-ins
CREATE TABLE IF NOT EXISTS safety_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  checkin_type text NOT NULL,
  checkin_status text NOT NULL,

  expected_checkin_time timestamptz NOT NULL,
  actual_checkin_time timestamptz,
  overdue_by_minutes integer,

  checkin_location_lat numeric,
  checkin_location_lng numeric,
  location_accuracy_meters numeric,

  checkin_message text,
  safety_code text,

  emergency_contacts_notified boolean DEFAULT false,
  trusted_contacts_notified boolean DEFAULT false,
  authorities_notified boolean DEFAULT false,
  notification_sent_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Safety Alerts
CREATE TABLE IF NOT EXISTS safety_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  triggered_by_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  alert_type text NOT NULL,

  severity text NOT NULL,
  alert_message text NOT NULL,

  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  location_lat numeric,
  location_lng numeric,

  emergency_contacts_notified text[],
  trusted_contacts_notified uuid[],
  admin_notified boolean DEFAULT false,

  status text DEFAULT 'active',

  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  resolution_notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crisis Mode Sessions
CREATE TABLE IF NOT EXISTS crisis_mode_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  activated_reason text NOT NULL,
  activation_method text,

  location_sharing_enabled boolean DEFAULT true,
  emergency_contacts_notified boolean DEFAULT true,
  booking_paused boolean DEFAULT true,
  profile_hidden boolean DEFAULT true,

  status text DEFAULT 'active',

  activated_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  auto_end_at timestamptz,

  last_known_location_lat numeric,
  last_known_location_lng numeric,
  last_location_update_at timestamptz,

  support_contacted boolean DEFAULT false,
  support_contact_time timestamptz,
  support_notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_emergency_contacts_user ON emergency_contacts(user_id);
CREATE INDEX idx_emergency_contacts_active ON emergency_contacts(is_active) WHERE is_active = true;
CREATE INDEX idx_trusted_contacts_user ON trusted_contacts(user_id);
CREATE INDEX idx_trusted_contacts_trusted ON trusted_contacts(trusted_user_id);
CREATE INDEX idx_trusted_contacts_status ON trusted_contacts(status);
CREATE INDEX idx_safety_checkins_booking ON safety_checkins(booking_id);
CREATE INDEX idx_safety_checkins_user ON safety_checkins(user_id);
CREATE INDEX idx_safety_checkins_status ON safety_checkins(checkin_status);
CREATE INDEX idx_safety_checkins_expected ON safety_checkins(expected_checkin_time);
CREATE INDEX idx_safety_alerts_user ON safety_alerts(triggered_by_user_id);
CREATE INDEX idx_safety_alerts_status ON safety_alerts(status);
CREATE INDEX idx_safety_alerts_severity ON safety_alerts(severity);
CREATE INDEX idx_safety_alerts_created ON safety_alerts(created_at DESC);
CREATE INDEX idx_crisis_mode_user ON crisis_mode_sessions(user_id);
CREATE INDEX idx_crisis_mode_status ON crisis_mode_sessions(status);
CREATE INDEX idx_crisis_mode_active ON crisis_mode_sessions(status) WHERE status = 'active';

-- Enable RLS
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_mode_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own emergency contacts"
  ON emergency_contacts FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own trusted contacts"
  ON trusted_contacts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR trusted_user_id = auth.uid());

CREATE POLICY "Users can manage sent trust requests"
  ON trusted_contacts FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own check-ins"
  ON safety_checkins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own check-ins"
  ON safety_checkins FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view alerts they triggered"
  ON safety_alerts FOR SELECT
  TO authenticated
  USING (triggered_by_user_id = auth.uid());

CREATE POLICY "Users can view own crisis mode sessions"
  ON crisis_mode_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own crisis mode"
  ON crisis_mode_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
