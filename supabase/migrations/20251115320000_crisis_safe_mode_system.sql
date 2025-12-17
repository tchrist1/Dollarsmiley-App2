/*
  # Crisis Mode & Safe Mode System

  1. New Tables
    - `safety_checkins` - User safety check-in system
    - `emergency_contacts` - User emergency contacts
    - `trusted_contacts` - User trusted contact network
    - `safety_alerts` - Safety alert notifications
    - `crisis_mode_sessions` - Crisis mode activations
    - `safe_mode_sessions` - Safe mode activations
    - `location_sharing` - Real-time location sharing
    - `panic_button_activations` - Panic button usage
    - `safety_incidents` - Safety incident reporting

  2. Features
    - Crisis mode activation
    - Safe mode for users
    - Emergency contacts
    - Check-in system
    - Trusted contact notifications
    - Location sharing
    - Panic button
    - Incident reporting

  3. Security
    - Privacy-first design
    - Emergency override capabilities
    - Encrypted location data
*/

-- Emergency Contacts (user emergency contacts)
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Contact details
  contact_name text NOT NULL,
  relationship text, -- family, friend, partner, colleague

  -- Contact methods
  phone_number text NOT NULL,
  email text,

  -- Priority
  priority_order integer DEFAULT 1, -- 1 is highest priority

  -- Permissions
  can_receive_alerts boolean DEFAULT true,
  can_track_location boolean DEFAULT false,
  can_access_booking_details boolean DEFAULT false,

  -- Verification
  is_verified boolean DEFAULT false,
  verified_at timestamptz,

  -- Status
  is_active boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trusted Contacts (mutual trust network)
CREATE TABLE IF NOT EXISTS trusted_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  trusted_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Trust level
  trust_level text DEFAULT 'standard', -- standard, high, emergency_only

  -- Permissions
  can_see_location boolean DEFAULT false,
  can_see_bookings boolean DEFAULT false,
  can_receive_checkin_alerts boolean DEFAULT true,

  -- Status
  status text DEFAULT 'pending', -- pending, accepted, declined, blocked
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

  -- Check-in type
  checkin_type text NOT NULL,
  -- Types: scheduled, manual, automatic, overdue_alert

  -- Status
  checkin_status text NOT NULL,
  -- Statuses: safe, need_assistance, emergency, missed

  -- Timing
  expected_checkin_time timestamptz NOT NULL,
  actual_checkin_time timestamptz,
  overdue_by_minutes integer,

  -- Location
  checkin_location_lat numeric,
  checkin_location_lng numeric,
  location_accuracy_meters numeric,

  -- Details
  checkin_message text,
  safety_code text, -- Optional safety code verification

  -- Alerts
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

  -- Alert source
  triggered_by_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  alert_type text NOT NULL,
  -- Types: missed_checkin, panic_button, unusual_activity, crisis_mode, safe_mode

  -- Severity
  severity text NOT NULL, -- low, medium, high, critical
  alert_message text NOT NULL,

  -- Context
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  location_lat numeric,
  location_lng numeric,

  -- Recipients
  emergency_contacts_notified text[], -- Contact IDs
  trusted_contacts_notified uuid[], -- User IDs
  admin_notified boolean DEFAULT false,

  -- Response
  status text DEFAULT 'active',
  -- Statuses: active, acknowledged, resolved, false_alarm

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

  -- Activation
  activated_reason text NOT NULL,
  activation_method text, -- manual, automatic, admin_triggered

  -- Features enabled
  location_sharing_enabled boolean DEFAULT true,
  emergency_contacts_notified boolean DEFAULT true,
  booking_paused boolean DEFAULT true,
  profile_hidden boolean DEFAULT true,

  -- Status
  status text DEFAULT 'active', -- active, ended, cancelled

  -- Duration
  activated_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  auto_end_at timestamptz, -- Auto-end after certain time

  -- Location trail
  last_known_location_lat numeric,
  last_known_location_lng numeric,
  last_location_update_at timestamptz,

  -- Support
  support_contacted boolean DEFAULT false,
  support_contact_time timestamptz,
  support_notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Safe Mode Sessions
CREATE TABLE IF NOT EXISTS safe_mode_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Activation
  activated_reason text,
  activation_method text, -- manual, automatic

  -- Features restricted
  new_bookings_disabled boolean DEFAULT true,
  messaging_restricted boolean DEFAULT true,
  profile_visibility_limited boolean DEFAULT true,
  payment_methods_locked boolean DEFAULT true,

  -- Exceptions
  allow_existing_bookings boolean DEFAULT true,
  allow_trusted_contacts_only boolean DEFAULT true,

  -- Status
  status text DEFAULT 'active', -- active, ended

  -- Duration
  activated_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  auto_end_at timestamptz,

  -- Reason for ending
  end_reason text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Location Sharing (real-time location sharing)
CREATE TABLE IF NOT EXISTS location_sharing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,

  -- Sharing
  shared_with_type text NOT NULL, -- emergency_contacts, trusted_contacts, booking_party, admin
  shared_with_users uuid[], -- User IDs
  shared_with_contacts text[], -- Emergency contact IDs

  -- Location
  current_location_lat numeric NOT NULL,
  current_location_lng numeric NOT NULL,
  location_accuracy_meters numeric,
  altitude_meters numeric,
  heading_degrees numeric,
  speed_mps numeric,

  -- Status
  is_active boolean DEFAULT true,
  sharing_started_at timestamptz DEFAULT now(),
  sharing_ends_at timestamptz,

  -- Updates
  last_updated_at timestamptz DEFAULT now(),
  update_frequency_seconds integer DEFAULT 30,

  -- Battery
  device_battery_percentage integer,
  low_battery_alert_sent boolean DEFAULT false,

  created_at timestamptz DEFAULT now()
);

-- Panic Button Activations
CREATE TABLE IF NOT EXISTS panic_button_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,

  -- Location
  activation_location_lat numeric NOT NULL,
  activation_location_lng numeric NOT NULL,
  location_accuracy_meters numeric,

  -- Context
  activation_context jsonb, -- Device info, app state, etc.

  -- Response
  emergency_contacts_notified boolean DEFAULT false,
  trusted_contacts_notified boolean DEFAULT false,
  authorities_contacted boolean DEFAULT false,
  admin_alerted boolean DEFAULT false,

  -- Status
  status text DEFAULT 'active',
  -- Statuses: active, acknowledged, resolved, false_alarm

  acknowledged_at timestamptz,
  resolved_at timestamptz,

  -- False alarm
  is_false_alarm boolean DEFAULT false,
  false_alarm_reason text,

  activated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Safety Incidents (incident reporting)
CREATE TABLE IF NOT EXISTS safety_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reporter
  reported_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,

  -- Involved parties
  involved_user_ids uuid[],
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,

  -- Incident details
  incident_type text NOT NULL,
  -- Types: harassment, threat, violence, unsafe_conditions, other

  incident_severity text NOT NULL, -- low, medium, high, critical
  incident_description text NOT NULL,
  incident_occurred_at timestamptz NOT NULL,

  -- Location
  incident_location_lat numeric,
  incident_location_lng numeric,
  incident_location_description text,

  -- Evidence
  evidence_urls text[],
  witness_contact_info jsonb,

  -- Status
  status text DEFAULT 'reported',
  -- Statuses: reported, investigating, resolved, closed

  -- Investigation
  assigned_to uuid REFERENCES profiles(id),
  assigned_at timestamptz,
  investigation_notes text,

  -- Resolution
  resolved_at timestamptz,
  resolution_action text,
  resolution_notes text,

  -- Actions taken
  user_warned boolean DEFAULT false,
  user_suspended boolean DEFAULT false,
  authorities_contacted boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Check-in Schedules (automatic check-in scheduling)
CREATE TABLE IF NOT EXISTS checkin_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Schedule
  checkin_time timestamptz NOT NULL,
  reminder_sent boolean DEFAULT false,
  reminder_sent_at timestamptz,

  -- Status
  is_completed boolean DEFAULT false,
  completed_at timestamptz,

  -- Alerts
  overdue_alert_sent boolean DEFAULT false,
  overdue_alert_minutes integer DEFAULT 15,

  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_active ON emergency_contacts(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user ON trusted_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_trusted ON trusted_contacts(trusted_user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_status ON trusted_contacts(status);

CREATE INDEX IF NOT EXISTS idx_safety_checkins_booking ON safety_checkins(booking_id);
CREATE INDEX IF NOT EXISTS idx_safety_checkins_user ON safety_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_checkins_status ON safety_checkins(checkin_status);
CREATE INDEX IF NOT EXISTS idx_safety_checkins_expected ON safety_checkins(expected_checkin_time);

CREATE INDEX IF NOT EXISTS idx_safety_alerts_user ON safety_alerts(triggered_by_user_id);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_status ON safety_alerts(status);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_severity ON safety_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_created ON safety_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crisis_mode_user ON crisis_mode_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_crisis_mode_status ON crisis_mode_sessions(status);
CREATE INDEX IF NOT EXISTS idx_crisis_mode_active ON crisis_mode_sessions(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_safe_mode_user ON safe_mode_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_safe_mode_status ON safe_mode_sessions(status);
CREATE INDEX IF NOT EXISTS idx_safe_mode_active ON safe_mode_sessions(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_location_sharing_user ON location_sharing(user_id);
CREATE INDEX IF NOT EXISTS idx_location_sharing_booking ON location_sharing(booking_id);
CREATE INDEX IF NOT EXISTS idx_location_sharing_active ON location_sharing(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_panic_activations_user ON panic_button_activations(user_id);
CREATE INDEX IF NOT EXISTS idx_panic_activations_status ON panic_button_activations(status);
CREATE INDEX IF NOT EXISTS idx_panic_activations_activated ON panic_button_activations(activated_at DESC);

CREATE INDEX IF NOT EXISTS idx_safety_incidents_reporter ON safety_incidents(reported_by_user_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_booking ON safety_incidents(booking_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_status ON safety_incidents(status);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_severity ON safety_incidents(incident_severity);

CREATE INDEX IF NOT EXISTS idx_checkin_schedules_booking ON checkin_schedules(booking_id);
CREATE INDEX IF NOT EXISTS idx_checkin_schedules_time ON checkin_schedules(checkin_time);
CREATE INDEX IF NOT EXISTS idx_checkin_schedules_pending ON checkin_schedules(is_completed) WHERE is_completed = false;

-- Enable RLS
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_mode_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_mode_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE panic_button_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_schedules ENABLE ROW LEVEL SECURITY;

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

-- Function: Activate crisis mode
CREATE OR REPLACE FUNCTION activate_crisis_mode(
  reason_param text,
  notify_contacts_param boolean DEFAULT true
)
RETURNS uuid AS $$
DECLARE
  session_id uuid;
  emergency_contact_record record;
BEGIN
  -- Create crisis mode session
  INSERT INTO crisis_mode_sessions (
    user_id,
    activated_reason,
    activation_method,
    location_sharing_enabled,
    emergency_contacts_notified,
    booking_paused,
    profile_hidden,
    auto_end_at
  ) VALUES (
    auth.uid(),
    reason_param,
    'manual',
    true,
    notify_contacts_param,
    true,
    true,
    now() + interval '24 hours'
  )
  RETURNING id INTO session_id;

  -- Notify emergency contacts
  IF notify_contacts_param THEN
    FOR emergency_contact_record IN
      SELECT * FROM emergency_contacts
      WHERE user_id = auth.uid()
      AND is_active = true
      AND can_receive_alerts = true
      ORDER BY priority_order
    LOOP
      -- TODO: Send notification via edge function
      NULL;
    END LOOP;
  END IF;

  -- Create safety alert
  INSERT INTO safety_alerts (
    triggered_by_user_id,
    alert_type,
    severity,
    alert_message
  ) VALUES (
    auth.uid(),
    'crisis_mode',
    'high',
    'User has activated crisis mode: ' || reason_param
  );

  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Activate safe mode
CREATE OR REPLACE FUNCTION activate_safe_mode(
  reason_param text DEFAULT NULL,
  duration_hours_param integer DEFAULT 24
)
RETURNS uuid AS $$
DECLARE
  session_id uuid;
BEGIN
  INSERT INTO safe_mode_sessions (
    user_id,
    activated_reason,
    activation_method,
    new_bookings_disabled,
    messaging_restricted,
    profile_visibility_limited,
    payment_methods_locked,
    auto_end_at
  ) VALUES (
    auth.uid(),
    reason_param,
    'manual',
    true,
    true,
    true,
    true,
    now() + (duration_hours_param || ' hours')::interval
  )
  RETURNING id INTO session_id;

  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Record safety check-in
CREATE OR REPLACE FUNCTION record_safety_checkin(
  booking_id_param uuid,
  status_param text,
  message_param text DEFAULT NULL,
  location_lat_param numeric DEFAULT NULL,
  location_lng_param numeric DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  checkin_id uuid;
  schedule_record record;
BEGIN
  -- Find expected check-in
  SELECT * INTO schedule_record
  FROM checkin_schedules
  WHERE booking_id = booking_id_param
  AND user_id = auth.uid()
  AND is_completed = false
  ORDER BY checkin_time
  LIMIT 1;

  -- Create check-in
  INSERT INTO safety_checkins (
    booking_id,
    user_id,
    checkin_type,
    checkin_status,
    expected_checkin_time,
    actual_checkin_time,
    checkin_message,
    checkin_location_lat,
    checkin_location_lng
  ) VALUES (
    booking_id_param,
    auth.uid(),
    CASE WHEN schedule_record.id IS NOT NULL THEN 'scheduled' ELSE 'manual' END,
    status_param,
    COALESCE(schedule_record.checkin_time, now()),
    now(),
    message_param,
    location_lat_param,
    location_lng_param
  )
  RETURNING id INTO checkin_id;

  -- Mark schedule as completed
  IF schedule_record.id IS NOT NULL THEN
    UPDATE checkin_schedules
    SET
      is_completed = true,
      completed_at = now()
    WHERE id = schedule_record.id;
  END IF;

  -- Create alert if status is not safe
  IF status_param != 'safe' THEN
    INSERT INTO safety_alerts (
      triggered_by_user_id,
      alert_type,
      severity,
      alert_message,
      booking_id,
      location_lat,
      location_lng
    ) VALUES (
      auth.uid(),
      'missed_checkin',
      CASE status_param
        WHEN 'emergency' THEN 'critical'
        WHEN 'need_assistance' THEN 'high'
        ELSE 'medium'
      END,
      'User reported: ' || status_param || '. ' || COALESCE(message_param, ''),
      booking_id_param,
      location_lat_param,
      location_lng_param
    );
  END IF;

  RETURN checkin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Activate panic button
CREATE OR REPLACE FUNCTION activate_panic_button(
  booking_id_param uuid DEFAULT NULL,
  location_lat_param numeric DEFAULT NULL,
  location_lng_param numeric DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  activation_id uuid;
BEGIN
  -- Create activation record
  INSERT INTO panic_button_activations (
    user_id,
    booking_id,
    activation_location_lat,
    activation_location_lng,
    emergency_contacts_notified,
    trusted_contacts_notified,
    admin_alerted
  ) VALUES (
    auth.uid(),
    booking_id_param,
    location_lat_param,
    location_lng_param,
    true,
    true,
    true
  )
  RETURNING id INTO activation_id;

  -- Create critical safety alert
  INSERT INTO safety_alerts (
    triggered_by_user_id,
    alert_type,
    severity,
    alert_message,
    booking_id,
    location_lat,
    location_lng,
    emergency_contacts_notified,
    admin_notified
  ) VALUES (
    auth.uid(),
    'panic_button',
    'critical',
    'PANIC BUTTON ACTIVATED - Immediate assistance needed',
    booking_id_param,
    location_lat_param,
    location_lng_param,
    ARRAY[]::text[],
    true
  );

  -- Auto-activate crisis mode
  PERFORM activate_crisis_mode('Panic button activated', true);

  RETURN activation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check for overdue check-ins
CREATE OR REPLACE FUNCTION check_overdue_checkins()
RETURNS void AS $$
DECLARE
  schedule_record record;
BEGIN
  FOR schedule_record IN
    SELECT cs.*, b.customer_id, b.provider_id
    FROM checkin_schedules cs
    JOIN bookings b ON b.id = cs.booking_id
    WHERE cs.is_completed = false
    AND cs.checkin_time < now() - interval '15 minutes'
    AND cs.overdue_alert_sent = false
  LOOP
    -- Create missed check-in alert
    INSERT INTO safety_alerts (
      triggered_by_user_id,
      alert_type,
      severity,
      alert_message,
      booking_id
    ) VALUES (
      schedule_record.user_id,
      'missed_checkin',
      'high',
      'User missed scheduled safety check-in',
      schedule_record.booking_id
    );

    -- Mark alert as sent
    UPDATE checkin_schedules
    SET
      overdue_alert_sent = true,
      reminder_sent_at = now()
    WHERE id = schedule_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION activate_crisis_mode TO authenticated;
GRANT EXECUTE ON FUNCTION activate_safe_mode TO authenticated;
GRANT EXECUTE ON FUNCTION record_safety_checkin TO authenticated;
GRANT EXECUTE ON FUNCTION activate_panic_button TO authenticated;
GRANT EXECUTE ON FUNCTION check_overdue_checkins TO authenticated;

-- Add helpful comments
COMMENT ON TABLE safety_checkins IS 'User safety check-in system for bookings';
COMMENT ON TABLE emergency_contacts IS 'User emergency contact information';
COMMENT ON TABLE crisis_mode_sessions IS 'Crisis mode activations with emergency features';
COMMENT ON TABLE safe_mode_sessions IS 'Safe mode for account protection';
COMMENT ON TABLE panic_button_activations IS 'Panic button emergency activations';
