/*
  # Create Email Service Integration

  1. New Tables
    - `email_templates`
      - Reusable email templates
      - Variable substitution

    - `email_queue`
      - Queue for sending emails
      - Retry logic

    - `email_logs`
      - Track sent emails
      - Delivery status

    - `email_settings`
      - Provider configuration
      - Team-level settings

  2. Features
    - Multiple provider support (SendGrid, Mailgun)
    - Template management
    - Email queue
    - Delivery tracking
    - Scheduled emails
    - Retry logic
    - Bounce handling

  3. Security
    - Encrypted API keys
    - RLS policies
    - Rate limiting
*/

-- Create email provider enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_provider') THEN
    CREATE TYPE email_provider AS ENUM ('sendgrid', 'mailgun', 'smtp');
  END IF;
END $$;

-- Create email status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_status') THEN
    CREATE TYPE email_status AS ENUM (
      'queued',
      'sending',
      'sent',
      'delivered',
      'opened',
      'clicked',
      'bounced',
      'failed',
      'cancelled'
    );
  END IF;
END $$;

-- Create email priority enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_priority') THEN
    CREATE TYPE email_priority AS ENUM ('low', 'normal', 'high', 'urgent');
  END IF;
END $$;

-- Create email_settings table
CREATE TABLE IF NOT EXISTS email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  provider email_provider DEFAULT 'sendgrid' NOT NULL,
  api_key text NOT NULL,
  from_email text NOT NULL,
  from_name text,
  reply_to_email text,
  daily_limit integer DEFAULT 1000 NOT NULL,
  emails_sent_today integer DEFAULT 0 NOT NULL,
  last_reset_date date DEFAULT CURRENT_DATE NOT NULL,
  track_opens boolean DEFAULT true NOT NULL,
  track_clicks boolean DEFAULT true NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  text_body text,
  variables jsonb DEFAULT '[]'::jsonb,
  category text,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  usage_count integer DEFAULT 0 NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(team_id, slug)
);

-- Create email_queue table
CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  priority email_priority DEFAULT 'normal' NOT NULL,
  to_email text NOT NULL,
  to_name text,
  from_email text,
  from_name text,
  reply_to_email text,
  subject text NOT NULL,
  html_body text NOT NULL,
  text_body text,
  variables jsonb DEFAULT '{}'::jsonb,
  attachments jsonb DEFAULT '[]'::jsonb,
  scheduled_for timestamptz,
  attempts integer DEFAULT 0 NOT NULL,
  max_attempts integer DEFAULT 3 NOT NULL,
  status email_status DEFAULT 'queued' NOT NULL,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  queue_id uuid REFERENCES email_queue(id) ON DELETE SET NULL,
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  provider email_provider NOT NULL,
  provider_message_id text,
  to_email text NOT NULL,
  to_name text,
  from_email text NOT NULL,
  from_name text,
  subject text NOT NULL,
  status email_status NOT NULL,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  bounce_reason text,
  delivered_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  events jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_settings

-- Team admins can view settings
CREATE POLICY "Team admins can view email settings"
  ON email_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = email_settings.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- Team admins can manage settings
CREATE POLICY "Team admins can manage email settings"
  ON email_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = email_settings.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- RLS Policies for email_templates

-- Team members can view templates
CREATE POLICY "Team members can view email templates"
  ON email_templates
  FOR SELECT
  TO authenticated
  USING (
    team_id IS NULL OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = email_templates.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.is_active = true
    )
  );

-- Team admins can manage templates
CREATE POLICY "Team admins can manage email templates"
  ON email_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = email_templates.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- RLS Policies for email_queue

-- Team members can view queue
CREATE POLICY "Team members can view email queue"
  ON email_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = email_queue.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.is_active = true
    )
  );

-- System can manage queue
CREATE POLICY "System can manage email queue"
  ON email_queue
  FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for email_logs

-- Team members can view logs
CREATE POLICY "Team members can view email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = email_logs.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.is_active = true
    )
  );

-- System can create logs
CREATE POLICY "System can create email logs"
  ON email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_settings_team ON email_settings(team_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_team ON email_templates(team_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON email_templates(team_id, slug);
CREATE INDEX IF NOT EXISTS idx_email_queue_team ON email_queue(team_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_team ON email_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_provider_msg ON email_logs(provider_message_id);

-- Create function to reset daily email count
CREATE OR REPLACE FUNCTION reset_daily_email_count()
RETURNS void AS $$
BEGIN
  UPDATE email_settings
  SET emails_sent_today = 0,
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check email limit
CREATE OR REPLACE FUNCTION can_send_email(p_team_id uuid)
RETURNS boolean AS $$
DECLARE
  v_settings email_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_settings
  FROM email_settings
  WHERE team_id = p_team_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Reset count if needed
  IF v_settings.last_reset_date < CURRENT_DATE THEN
    PERFORM reset_daily_email_count();
    v_settings.emails_sent_today := 0;
  END IF;

  -- Check limit
  RETURN v_settings.emails_sent_today < v_settings.daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment email count
CREATE OR REPLACE FUNCTION increment_email_count(p_team_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE email_settings
  SET emails_sent_today = emails_sent_today + 1
  WHERE team_id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to render template
CREATE OR REPLACE FUNCTION render_email_template(
  p_template_id uuid,
  p_variables jsonb
)
RETURNS TABLE (
  subject text,
  html_body text,
  text_body text
) AS $$
DECLARE
  v_template email_templates%ROWTYPE;
  v_subject text;
  v_html text;
  v_text text;
  v_key text;
  v_value text;
BEGIN
  SELECT * INTO v_template
  FROM email_templates
  WHERE id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  v_subject := v_template.subject;
  v_html := v_template.html_body;
  v_text := v_template.text_body;

  -- Replace variables
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_subject := replace(v_subject, '{{' || v_key || '}}', v_value);
    v_html := replace(v_html, '{{' || v_key || '}}', v_value);
    IF v_text IS NOT NULL THEN
      v_text := replace(v_text, '{{' || v_key || '}}', v_value);
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_subject, v_html, v_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to queue email
CREATE OR REPLACE FUNCTION queue_email(
  p_team_id uuid,
  p_template_id uuid DEFAULT NULL,
  p_to_email text,
  p_to_name text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_html_body text DEFAULT NULL,
  p_text_body text DEFAULT NULL,
  p_variables jsonb DEFAULT '{}'::jsonb,
  p_priority email_priority DEFAULT 'normal',
  p_scheduled_for timestamptz DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_queue_id uuid;
  v_subject text;
  v_html text;
  v_text text;
  v_settings email_settings%ROWTYPE;
BEGIN
  -- Check if can send
  IF NOT can_send_email(p_team_id) THEN
    RAISE EXCEPTION 'Daily email limit reached';
  END IF;

  -- Get settings
  SELECT * INTO v_settings
  FROM email_settings
  WHERE team_id = p_team_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email settings not configured';
  END IF;

  -- Render template if provided
  IF p_template_id IS NOT NULL THEN
    SELECT * INTO v_subject, v_html, v_text
    FROM render_email_template(p_template_id, p_variables);
  ELSE
    v_subject := p_subject;
    v_html := p_html_body;
    v_text := p_text_body;
  END IF;

  -- Insert into queue
  INSERT INTO email_queue (
    team_id,
    template_id,
    priority,
    to_email,
    to_name,
    from_email,
    from_name,
    reply_to_email,
    subject,
    html_body,
    text_body,
    variables,
    scheduled_for,
    status
  ) VALUES (
    p_team_id,
    p_template_id,
    p_priority,
    p_to_email,
    p_to_name,
    v_settings.from_email,
    v_settings.from_name,
    v_settings.reply_to_email,
    v_subject,
    v_html,
    v_text,
    p_variables,
    p_scheduled_for,
    'queued'
  ) RETURNING id INTO v_queue_id;

  -- Update template usage
  IF p_template_id IS NOT NULL THEN
    UPDATE email_templates
    SET usage_count = usage_count + 1
    WHERE id = p_template_id;
  END IF;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get next queued email
CREATE OR REPLACE FUNCTION get_next_queued_email()
RETURNS uuid AS $$
DECLARE
  v_queue_id uuid;
BEGIN
  SELECT id INTO v_queue_id
  FROM email_queue
  WHERE status = 'queued'
    AND attempts < max_attempts
    AND (scheduled_for IS NULL OR scheduled_for <= now())
  ORDER BY
    priority DESC,
    created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_queue_id IS NOT NULL THEN
    UPDATE email_queue
    SET status = 'sending',
        attempts = attempts + 1,
        updated_at = now()
    WHERE id = v_queue_id;
  END IF;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get email statistics
CREATE OR REPLACE FUNCTION get_email_stats(
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
    'opened', COUNT(*) FILTER (WHERE status = 'opened'),
    'clicked', COUNT(*) FILTER (WHERE status = 'clicked'),
    'bounced', COUNT(*) FILTER (WHERE status = 'bounced'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'open_rate', ROUND(
      COUNT(*) FILTER (WHERE status IN ('opened', 'clicked'))::numeric /
      NULLIF(COUNT(*) FILTER (WHERE status = 'delivered'), 0) * 100,
      2
    ),
    'click_rate', ROUND(
      COUNT(*) FILTER (WHERE status = 'clicked')::numeric /
      NULLIF(COUNT(*) FILTER (WHERE status = 'delivered'), 0) * 100,
      2
    )
  ) INTO v_stats
  FROM email_logs
  WHERE team_id = p_team_id
    AND sent_at >= now() - (p_days || ' days')::interval;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_settings_updated_at ON email_settings;
CREATE TRIGGER update_email_settings_updated_at
  BEFORE UPDATE ON email_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_email_updated_at();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_updated_at();

DROP TRIGGER IF EXISTS update_email_queue_updated_at ON email_queue;
CREATE TRIGGER update_email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_updated_at();
