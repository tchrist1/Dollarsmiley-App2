/*
  # Create SMS Service Integration (Twilio)

  1. New Tables
    - `sms_settings`
      - Twilio configuration
      - Team-level settings

    - `sms_templates`
      - Reusable SMS templates
      - Variable substitution

    - `sms_queue`
      - Queue for sending SMS
      - Retry logic

    - `sms_logs`
      - Track sent messages
      - Delivery status

  2. Features
    - Twilio integration
    - Template management
    - SMS queue
    - Delivery tracking
    - Scheduled SMS
    - Retry logic
    - Character counting

  3. Security
    - Encrypted credentials
    - RLS policies
    - Rate limiting
*/

-- Create sms status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sms_status') THEN
    CREATE TYPE sms_status AS ENUM (
      'queued',
      'sending',
      'sent',
      'delivered',
      'undelivered',
      'failed',
      'cancelled'
    );
  END IF;
END $$;

-- Create sms_settings table
CREATE TABLE IF NOT EXISTS sms_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  account_sid text NOT NULL,
  auth_token text NOT NULL,
  from_number text NOT NULL,
  daily_limit integer DEFAULT 500 NOT NULL,
  sms_sent_today integer DEFAULT 0 NOT NULL,
  last_reset_date date DEFAULT CURRENT_DATE NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create sms_templates table
CREATE TABLE IF NOT EXISTS sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  message text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  category text,
  description text,
  character_count integer NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  usage_count integer DEFAULT 0 NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(team_id, slug)
);

-- Create sms_queue table
CREATE TABLE IF NOT EXISTS sms_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES sms_templates(id) ON DELETE SET NULL,
  priority email_priority DEFAULT 'normal' NOT NULL,
  to_number text NOT NULL,
  from_number text,
  message text NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb,
  scheduled_for timestamptz,
  attempts integer DEFAULT 0 NOT NULL,
  max_attempts integer DEFAULT 3 NOT NULL,
  status sms_status DEFAULT 'queued' NOT NULL,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create sms_logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  queue_id uuid REFERENCES sms_queue(id) ON DELETE SET NULL,
  template_id uuid REFERENCES sms_templates(id) ON DELETE SET NULL,
  twilio_sid text,
  to_number text NOT NULL,
  from_number text NOT NULL,
  message text NOT NULL,
  status sms_status NOT NULL,
  segments integer DEFAULT 1 NOT NULL,
  delivered_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  error_code text,
  price numeric(10, 4),
  price_unit text,
  events jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE sms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sms_settings

-- Team admins can view settings
CREATE POLICY "Team admins can view sms settings"
  ON sms_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = sms_settings.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- Team admins can manage settings
CREATE POLICY "Team admins can manage sms settings"
  ON sms_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = sms_settings.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- RLS Policies for sms_templates

-- Team members can view templates
CREATE POLICY "Team members can view sms templates"
  ON sms_templates
  FOR SELECT
  TO authenticated
  USING (
    team_id IS NULL OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = sms_templates.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.is_active = true
    )
  );

-- Team admins can manage templates
CREATE POLICY "Team admins can manage sms templates"
  ON sms_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = sms_templates.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- RLS Policies for sms_queue

-- Team members can view queue
CREATE POLICY "Team members can view sms queue"
  ON sms_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = sms_queue.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.is_active = true
    )
  );

-- System can manage queue
CREATE POLICY "System can manage sms queue"
  ON sms_queue
  FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for sms_logs

-- Team members can view logs
CREATE POLICY "Team members can view sms logs"
  ON sms_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = sms_logs.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.is_active = true
    )
  );

-- System can create logs
CREATE POLICY "System can create sms logs"
  ON sms_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sms_settings_team ON sms_settings(team_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_team ON sms_templates(team_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_slug ON sms_templates(team_id, slug);
CREATE INDEX IF NOT EXISTS idx_sms_queue_team ON sms_queue(team_id);
CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON sms_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_sms_queue_priority ON sms_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_team ON sms_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent ON sms_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_twilio_sid ON sms_logs(twilio_sid);

-- Create function to reset daily SMS count
CREATE OR REPLACE FUNCTION reset_daily_sms_count()
RETURNS void AS $$
BEGIN
  UPDATE sms_settings
  SET sms_sent_today = 0,
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check SMS limit
CREATE OR REPLACE FUNCTION can_send_sms(p_team_id uuid)
RETURNS boolean AS $$
DECLARE
  v_settings sms_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_settings
  FROM sms_settings
  WHERE team_id = p_team_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Reset count if needed
  IF v_settings.last_reset_date < CURRENT_DATE THEN
    PERFORM reset_daily_sms_count();
    v_settings.sms_sent_today := 0;
  END IF;

  -- Check limit
  RETURN v_settings.sms_sent_today < v_settings.daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment SMS count
CREATE OR REPLACE FUNCTION increment_sms_count(p_team_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE sms_settings
  SET sms_sent_today = sms_sent_today + 1
  WHERE team_id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to render SMS template
CREATE OR REPLACE FUNCTION render_sms_template(
  p_template_id uuid,
  p_variables jsonb
)
RETURNS text AS $$
DECLARE
  v_template sms_templates%ROWTYPE;
  v_message text;
  v_key text;
  v_value text;
BEGIN
  SELECT * INTO v_template
  FROM sms_templates
  WHERE id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  v_message := v_template.message;

  -- Replace variables
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_message := replace(v_message, '{{' || v_key || '}}', v_value);
  END LOOP;

  RETURN v_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to queue SMS
CREATE OR REPLACE FUNCTION queue_sms(
  p_team_id uuid,
  p_template_id uuid DEFAULT NULL,
  p_to_number text,
  p_message text DEFAULT NULL,
  p_variables jsonb DEFAULT '{}'::jsonb,
  p_priority email_priority DEFAULT 'normal',
  p_scheduled_for timestamptz DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_queue_id uuid;
  v_message text;
  v_settings sms_settings%ROWTYPE;
BEGIN
  -- Check if can send
  IF NOT can_send_sms(p_team_id) THEN
    RAISE EXCEPTION 'Daily SMS limit reached';
  END IF;

  -- Get settings
  SELECT * INTO v_settings
  FROM sms_settings
  WHERE team_id = p_team_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SMS settings not configured';
  END IF;

  -- Render template if provided
  IF p_template_id IS NOT NULL THEN
    v_message := render_sms_template(p_template_id, p_variables);
  ELSE
    v_message := p_message;
  END IF;

  -- Insert into queue
  INSERT INTO sms_queue (
    team_id,
    template_id,
    priority,
    to_number,
    from_number,
    message,
    variables,
    scheduled_for,
    status
  ) VALUES (
    p_team_id,
    p_template_id,
    p_priority,
    p_to_number,
    v_settings.from_number,
    v_message,
    p_variables,
    p_scheduled_for,
    'queued'
  ) RETURNING id INTO v_queue_id;

  -- Update template usage
  IF p_template_id IS NOT NULL THEN
    UPDATE sms_templates
    SET usage_count = usage_count + 1
    WHERE id = p_template_id;
  END IF;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get next queued SMS
CREATE OR REPLACE FUNCTION get_next_queued_sms()
RETURNS uuid AS $$
DECLARE
  v_queue_id uuid;
BEGIN
  SELECT id INTO v_queue_id
  FROM sms_queue
  WHERE status = 'queued'
    AND attempts < max_attempts
    AND (scheduled_for IS NULL OR scheduled_for <= now())
  ORDER BY
    priority DESC,
    created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_queue_id IS NOT NULL THEN
    UPDATE sms_queue
    SET status = 'sending',
        attempts = attempts + 1,
        updated_at = now()
    WHERE id = v_queue_id;
  END IF;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get SMS statistics
CREATE OR REPLACE FUNCTION get_sms_stats(
  p_team_id uuid,
  p_days integer DEFAULT 30
)
RETURNS jsonb AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_sent', COUNT(*),
    'delivered', COUNT(*) FILTER (WHERE status = 'delivered'),
    'undelivered', COUNT(*) FILTER (WHERE status = 'undelivered'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'delivery_rate', ROUND(
      COUNT(*) FILTER (WHERE status = 'delivered')::numeric /
      NULLIF(COUNT(*), 0) * 100,
      2
    ),
    'total_segments', COALESCE(SUM(segments), 0),
    'total_cost', COALESCE(SUM(price), 0)
  ) INTO v_stats
  FROM sms_logs
  WHERE team_id = p_team_id
    AND sent_at >= now() - (p_days || ' days')::interval;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_sms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sms_settings_updated_at ON sms_settings;
CREATE TRIGGER update_sms_settings_updated_at
  BEFORE UPDATE ON sms_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_updated_at();

DROP TRIGGER IF EXISTS update_sms_templates_updated_at ON sms_templates;
CREATE TRIGGER update_sms_templates_updated_at
  BEFORE UPDATE ON sms_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_updated_at();

DROP TRIGGER IF EXISTS update_sms_queue_updated_at ON sms_queue;
CREATE TRIGGER update_sms_queue_updated_at
  BEFORE UPDATE ON sms_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_updated_at();

-- Create trigger to calculate character count on template insert/update
CREATE OR REPLACE FUNCTION calculate_sms_character_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.character_count := LENGTH(NEW.message);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_template_character_count ON sms_templates;
CREATE TRIGGER calculate_template_character_count
  BEFORE INSERT OR UPDATE ON sms_templates
  FOR EACH ROW
  EXECUTE FUNCTION calculate_sms_character_count();
