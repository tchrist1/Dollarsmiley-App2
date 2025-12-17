/*
  # Crisis & Safe Mode - Remaining Tables

  1. New Tables
    - safe_mode_sessions
    - location_sharing
    - panic_button_activations
    - safety_incidents
    - checkin_schedules
*/

-- Safe Mode Sessions
CREATE TABLE IF NOT EXISTS safe_mode_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  activated_reason text,
  activation_method text,

  new_bookings_disabled boolean DEFAULT true,
  messaging_restricted boolean DEFAULT true,
  profile_visibility_limited boolean DEFAULT true,
  payment_methods_locked boolean DEFAULT true,

  allow_existing_bookings boolean DEFAULT true,
  allow_trusted_contacts_only boolean DEFAULT true,

  status text DEFAULT 'active',

  activated_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  auto_end_at timestamptz,

  end_reason text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Location Sharing
CREATE TABLE IF NOT EXISTS location_sharing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,

  shared_with_type text NOT NULL,
  shared_with_users uuid[],
  shared_with_contacts text[],

  current_location_lat numeric NOT NULL,
  current_location_lng numeric NOT NULL,
  location_accuracy_meters numeric,
  altitude_meters numeric,
  heading_degrees numeric,
  speed_mps numeric,

  is_active boolean DEFAULT true,
  sharing_started_at timestamptz DEFAULT now(),
  sharing_ends_at timestamptz,

  last_updated_at timestamptz DEFAULT now(),
  update_frequency_seconds integer DEFAULT 30,

  device_battery_percentage integer,
  low_battery_alert_sent boolean DEFAULT false,

  created_at timestamptz DEFAULT now()
);

-- Panic Button Activations
CREATE TABLE IF NOT EXISTS panic_button_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,

  activation_location_lat numeric NOT NULL,
  activation_location_lng numeric NOT NULL,
  location_accuracy_meters numeric,

  activation_context jsonb,

  emergency_contacts_notified boolean DEFAULT false,
  trusted_contacts_notified boolean DEFAULT false,
  authorities_contacted boolean DEFAULT false,
  admin_alerted boolean DEFAULT false,

  status text DEFAULT 'active',

  acknowledged_at timestamptz,
  resolved_at timestamptz,

  is_false_alarm boolean DEFAULT false,
  false_alarm_reason text,

  activated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Safety Incidents
CREATE TABLE IF NOT EXISTS safety_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  reported_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,

  involved_user_ids uuid[],
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,

  incident_type text NOT NULL,
  incident_severity text NOT NULL,
  incident_description text NOT NULL,
  incident_occurred_at timestamptz NOT NULL,

  incident_location_lat numeric,
  incident_location_lng numeric,
  incident_location_description text,

  evidence_urls text[],
  witness_contact_info jsonb,

  status text DEFAULT 'reported',

  assigned_to uuid REFERENCES profiles(id),
  assigned_at timestamptz,
  investigation_notes text,

  resolved_at timestamptz,
  resolution_action text,
  resolution_notes text,

  user_warned boolean DEFAULT false,
  user_suspended boolean DEFAULT false,
  authorities_contacted boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Check-in Schedules
CREATE TABLE IF NOT EXISTS checkin_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  checkin_time timestamptz NOT NULL,
  reminder_sent boolean DEFAULT false,
  reminder_sent_at timestamptz,

  is_completed boolean DEFAULT false,
  completed_at timestamptz,

  overdue_alert_sent boolean DEFAULT false,
  overdue_alert_minutes integer DEFAULT 15,

  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_safe_mode_user ON safe_mode_sessions(user_id);
CREATE INDEX idx_safe_mode_status ON safe_mode_sessions(status);
CREATE INDEX idx_safe_mode_active ON safe_mode_sessions(status) WHERE status = 'active';
CREATE INDEX idx_location_sharing_user ON location_sharing(user_id);
CREATE INDEX idx_location_sharing_booking ON location_sharing(booking_id);
CREATE INDEX idx_location_sharing_active ON location_sharing(is_active) WHERE is_active = true;
CREATE INDEX idx_panic_activations_user ON panic_button_activations(user_id);
CREATE INDEX idx_panic_activations_status ON panic_button_activations(status);
CREATE INDEX idx_panic_activations_activated ON panic_button_activations(activated_at DESC);
CREATE INDEX idx_safety_incidents_reporter ON safety_incidents(reported_by_user_id);
CREATE INDEX idx_safety_incidents_booking ON safety_incidents(booking_id);
CREATE INDEX idx_safety_incidents_status ON safety_incidents(status);
CREATE INDEX idx_safety_incidents_severity ON safety_incidents(incident_severity);
CREATE INDEX idx_checkin_schedules_booking ON checkin_schedules(booking_id);
CREATE INDEX idx_checkin_schedules_time ON checkin_schedules(checkin_time);
CREATE INDEX idx_checkin_schedules_pending ON checkin_schedules(is_completed) WHERE is_completed = false;

-- Enable RLS
ALTER TABLE safe_mode_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE panic_button_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own safe mode sessions"
  ON safe_mode_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own safe mode"
  ON safe_mode_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own location sharing"
  ON location_sharing FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own location sharing"
  ON location_sharing FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own panic activations"
  ON panic_button_activations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create panic activations"
  ON panic_button_activations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can report safety incidents"
  ON safety_incidents FOR INSERT
  TO authenticated
  WITH CHECK (reported_by_user_id = auth.uid());

CREATE POLICY "Users can view incidents they reported"
  ON safety_incidents FOR SELECT
  TO authenticated
  USING (reported_by_user_id = auth.uid());

-- Functions
CREATE OR REPLACE FUNCTION activate_crisis_mode(
  reason_param text,
  notify_contacts_param boolean DEFAULT true
)
RETURNS uuid AS $$
DECLARE
  session_id uuid;
BEGIN
  INSERT INTO crisis_mode_sessions (
    user_id, activated_reason, activation_method,
    location_sharing_enabled, emergency_contacts_notified,
    booking_paused, profile_hidden, auto_end_at
  ) VALUES (
    auth.uid(), reason_param, 'manual',
    true, notify_contacts_param,
    true, true, now() + interval '24 hours'
  )
  RETURNING id INTO session_id;

  INSERT INTO safety_alerts (
    triggered_by_user_id, alert_type, severity, alert_message
  ) VALUES (
    auth.uid(), 'crisis_mode', 'high',
    'User has activated crisis mode: ' || reason_param
  );

  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION activate_safe_mode(
  reason_param text DEFAULT NULL,
  duration_hours_param integer DEFAULT 24
)
RETURNS uuid AS $$
DECLARE
  session_id uuid;
BEGIN
  INSERT INTO safe_mode_sessions (
    user_id, activated_reason, activation_method,
    new_bookings_disabled, messaging_restricted,
    profile_visibility_limited, payment_methods_locked,
    auto_end_at
  ) VALUES (
    auth.uid(), reason_param, 'manual',
    true, true, true, true,
    now() + (duration_hours_param || ' hours')::interval
  )
  RETURNING id INTO session_id;

  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION activate_panic_button(
  booking_id_param uuid DEFAULT NULL,
  location_lat_param numeric DEFAULT NULL,
  location_lng_param numeric DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  activation_id uuid;
BEGIN
  INSERT INTO panic_button_activations (
    user_id, booking_id,
    activation_location_lat, activation_location_lng,
    emergency_contacts_notified, trusted_contacts_notified, admin_alerted
  ) VALUES (
    auth.uid(), booking_id_param,
    location_lat_param, location_lng_param,
    true, true, true
  )
  RETURNING id INTO activation_id;

  INSERT INTO safety_alerts (
    triggered_by_user_id, alert_type, severity, alert_message,
    booking_id, location_lat, location_lng,
    emergency_contacts_notified, admin_notified
  ) VALUES (
    auth.uid(), 'panic_button', 'critical',
    'PANIC BUTTON ACTIVATED - Immediate assistance needed',
    booking_id_param, location_lat_param, location_lng_param,
    ARRAY[]::text[], true
  );

  PERFORM activate_crisis_mode('Panic button activated', true);

  RETURN activation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION activate_crisis_mode TO authenticated;
GRANT EXECUTE ON FUNCTION activate_safe_mode TO authenticated;
GRANT EXECUTE ON FUNCTION activate_panic_button TO authenticated;
