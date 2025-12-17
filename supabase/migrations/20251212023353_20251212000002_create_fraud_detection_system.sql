/*
  # Create Fraud Detection System

  Comprehensive fraud detection with rule-based analysis, behavioral patterns,
  risk scoring, and machine learning indicators.
*/

-- Create fraud_rules table
CREATE TABLE IF NOT EXISTS fraud_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  rule_type text NOT NULL CHECK (rule_type IN ('Transaction', 'User', 'Booking', 'Payment', 'Behavior')),
  condition jsonb NOT NULL DEFAULT '{}',
  risk_score int NOT NULL CHECK (risk_score BETWEEN 1 AND 100),
  action text NOT NULL DEFAULT 'Flag' CHECK (action IN ('Flag', 'Block', 'Review', 'Alert')),
  is_active boolean DEFAULT true,
  priority int DEFAULT 0,
  false_positive_rate numeric(5, 2) DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create fraud_alerts table
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN ('Suspicious', 'HighRisk', 'Fraud', 'FalsePositive')),
  severity text NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('User', 'Booking', 'Transaction', 'Payment')),
  entity_id uuid NOT NULL,
  risk_score int NOT NULL DEFAULT 0,
  triggered_rules jsonb DEFAULT '[]',
  status text DEFAULT 'Open' CHECK (status IN ('Open', 'UnderReview', 'Resolved', 'FalsePositive', 'Confirmed')),
  details jsonb DEFAULT '{}',
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now()
);

-- Create fraud_user_profiles table
CREATE TABLE IF NOT EXISTS fraud_user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  risk_score int DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 1000),
  risk_level text DEFAULT 'Low' CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
  total_flags int DEFAULT 0,
  confirmed_fraud_count int DEFAULT 0,
  false_positive_count int DEFAULT 0,
  last_flag_date timestamptz,
  account_age_days int DEFAULT 0,
  total_transactions int DEFAULT 0,
  total_transaction_volume numeric(10, 2) DEFAULT 0,
  failed_payment_count int DEFAULT 0,
  chargeback_count int DEFAULT 0,
  velocity_score int DEFAULT 0,
  behavioral_score int DEFAULT 0,
  trust_score int DEFAULT 100 CHECK (trust_score BETWEEN 0 AND 100),
  is_blocked boolean DEFAULT false,
  blocked_reason text,
  blocked_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create fraud_behavioral_patterns table
CREATE TABLE IF NOT EXISTS fraud_behavioral_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pattern_type text NOT NULL CHECK (pattern_type IN ('Login', 'Transaction', 'Booking', 'Navigation')),
  pattern_data jsonb DEFAULT '{}',
  anomaly_score numeric(5, 4) DEFAULT 0 CHECK (anomaly_score BETWEEN 0 AND 1),
  is_anomaly boolean DEFAULT false,
  detected_at timestamptz DEFAULT now()
);

-- Create fraud_device_fingerprints table
CREATE TABLE IF NOT EXISTS fraud_device_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  device_info jsonb DEFAULT '{}',
  ip_address text,
  geolocation jsonb DEFAULT '{}',
  is_suspicious boolean DEFAULT false,
  risk_factors text[] DEFAULT '{}',
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  usage_count int DEFAULT 1
);

-- Create fraud_blacklists table
CREATE TABLE IF NOT EXISTS fraud_blacklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_type text NOT NULL CHECK (list_type IN ('Email', 'Phone', 'IP', 'Device', 'Card', 'Address')),
  value text NOT NULL,
  reason text,
  severity text NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  source text DEFAULT 'Internal' CHECK (source IN ('Internal', 'External', 'Reported')),
  expires_at timestamptz,
  added_by uuid REFERENCES profiles(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(list_type, value)
);

-- Create fraud_velocity_checks table
CREATE TABLE IF NOT EXISTS fraud_velocity_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  check_type text NOT NULL CHECK (check_type IN ('LoginAttempts', 'Transactions', 'Bookings', 'Messages')),
  time_window text NOT NULL CHECK (time_window IN ('1min', '5min', '1hour', '1day')),
  action_count int DEFAULT 0,
  threshold int NOT NULL,
  is_exceeded boolean DEFAULT false,
  window_start timestamptz DEFAULT now(),
  window_end timestamptz DEFAULT now()
);

-- Create fraud_investigation_notes table
CREATE TABLE IF NOT EXISTS fraud_investigation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES fraud_alerts(id) ON DELETE CASCADE NOT NULL,
  investigator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  note text NOT NULL,
  action_taken text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE fraud_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_behavioral_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_blacklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_velocity_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_investigation_notes ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fraud_rules_active ON fraud_rules(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user ON fraud_alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status, severity);
CREATE INDEX IF NOT EXISTS idx_fraud_user_profiles_user ON fraud_user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_user_profiles_risk ON fraud_user_profiles(risk_level, risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_behavioral_patterns_user ON fraud_behavioral_patterns(user_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_device_fingerprints_hash ON fraud_device_fingerprints(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_fraud_device_fingerprints_ip ON fraud_device_fingerprints(ip_address);
CREATE INDEX IF NOT EXISTS idx_fraud_blacklists_type_value ON fraud_blacklists(list_type, value);
CREATE INDEX IF NOT EXISTS idx_fraud_velocity_checks_user ON fraud_velocity_checks(user_id, check_type);

-- Function to calculate risk level from score
CREATE OR REPLACE FUNCTION calculate_risk_level(score int)
RETURNS text AS $$
BEGIN
  IF score < 250 THEN
    RETURN 'Low';
  ELSIF score < 500 THEN
    RETURN 'Medium';
  ELSIF score < 750 THEN
    RETURN 'High';
  ELSE
    RETURN 'Critical';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update user risk profile
CREATE OR REPLACE FUNCTION update_user_risk_profile(
  user_id_param uuid,
  score_delta int DEFAULT 0,
  increment_flags boolean DEFAULT false
)
RETURNS void AS $$
DECLARE
  profile_record RECORD;
  new_risk_score int;
BEGIN
  SELECT * INTO profile_record
  FROM fraud_user_profiles
  WHERE user_id = user_id_param;

  IF profile_record IS NULL THEN
    INSERT INTO fraud_user_profiles (user_id, risk_score)
    VALUES (user_id_param, GREATEST(0, score_delta));
    RETURN;
  END IF;

  new_risk_score := GREATEST(0, LEAST(1000, profile_record.risk_score + score_delta));

  UPDATE fraud_user_profiles
  SET
    risk_score = new_risk_score,
    risk_level = calculate_risk_level(new_risk_score),
    total_flags = CASE WHEN increment_flags THEN total_flags + 1 ELSE total_flags END,
    last_flag_date = CASE WHEN increment_flags THEN now() ELSE last_flag_date END,
    updated_at = now()
  WHERE user_id = user_id_param;

  IF new_risk_score >= 750 THEN
    UPDATE fraud_user_profiles
    SET is_blocked = true,
        blocked_reason = 'Automatic block: Critical risk score',
        blocked_at = now()
    WHERE user_id = user_id_param AND is_blocked = false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check blacklist
CREATE OR REPLACE FUNCTION check_blacklist(
  list_type_param text,
  value_param text
)
RETURNS boolean AS $$
DECLARE
  blacklist_record RECORD;
BEGIN
  SELECT * INTO blacklist_record
  FROM fraud_blacklists
  WHERE list_type = list_type_param
  AND value = value_param
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now());

  RETURN blacklist_record IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to record velocity check
CREATE OR REPLACE FUNCTION check_velocity(
  user_id_param uuid,
  check_type_param text,
  time_window_param text,
  threshold_param int
)
RETURNS boolean AS $$
DECLARE
  window_interval interval;
  action_count int;
  is_exceeded boolean;
BEGIN
  CASE time_window_param
    WHEN '1min' THEN window_interval := '1 minute'::interval;
    WHEN '5min' THEN window_interval := '5 minutes'::interval;
    WHEN '1hour' THEN window_interval := '1 hour'::interval;
    WHEN '1day' THEN window_interval := '1 day'::interval;
    ELSE window_interval := '1 hour'::interval;
  END CASE;

  SELECT COUNT(*)::int INTO action_count
  FROM fraud_velocity_checks
  WHERE user_id = user_id_param
  AND check_type = check_type_param
  AND window_end > now() - window_interval;

  action_count := action_count + 1;
  is_exceeded := action_count > threshold_param;

  INSERT INTO fraud_velocity_checks (
    user_id,
    check_type,
    time_window,
    action_count,
    threshold,
    is_exceeded,
    window_start,
    window_end
  ) VALUES (
    user_id_param,
    check_type_param,
    time_window_param,
    action_count,
    threshold_param,
    is_exceeded,
    now() - window_interval,
    now()
  );

  RETURN is_exceeded;
END;
$$ LANGUAGE plpgsql;

-- Function to create fraud alert
CREATE OR REPLACE FUNCTION create_fraud_alert(
  alert_type_param text,
  severity_param text,
  user_id_param uuid,
  entity_type_param text,
  entity_id_param uuid,
  risk_score_param int,
  triggered_rules_param jsonb DEFAULT '[]',
  details_param jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  alert_id uuid;
BEGIN
  INSERT INTO fraud_alerts (
    alert_type,
    severity,
    user_id,
    entity_type,
    entity_id,
    risk_score,
    triggered_rules,
    details
  ) VALUES (
    alert_type_param,
    severity_param,
    user_id_param,
    entity_type_param,
    entity_id_param,
    risk_score_param,
    triggered_rules_param,
    details_param
  )
  RETURNING id INTO alert_id;

  PERFORM update_user_risk_profile(user_id_param, risk_score_param, true);

  RETURN alert_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default fraud rules
INSERT INTO fraud_rules (name, description, rule_type, condition, risk_score, action, priority) VALUES
  ('Multiple Failed Payments', 'User has 3+ failed payments in 24 hours', 'Payment', '{"failed_payments": {"count": 3, "window": "24h"}}', 50, 'Flag', 1),
  ('Rapid Account Creation', 'Multiple accounts from same device/IP', 'User', '{"accounts_from_device": {"count": 3}}', 75, 'Block', 2),
  ('High Transaction Volume', 'Unusually high transaction amount', 'Transaction', '{"amount": {"threshold": 5000}}', 30, 'Review', 3),
  ('Velocity: Rapid Bookings', '5+ bookings in 1 hour', 'Booking', '{"bookings": {"count": 5, "window": "1h"}}', 40, 'Flag', 4),
  ('Suspicious Login Pattern', 'Login from unusual location', 'Behavior', '{"location_change": {"distance_km": 500, "time_hours": 1}}', 25, 'Alert', 5),
  ('Card Testing Pattern', 'Multiple small transactions quickly', 'Payment', '{"transactions": {"count": 5, "amount_max": 1, "window": "5m"}}', 80, 'Block', 1),
  ('Chargeback History', 'User has previous chargebacks', 'User', '{"chargeback_count": {"min": 1}}', 60, 'Review', 2)
ON CONFLICT DO NOTHING;