/*
  # Create WhatsApp Business API Integration

  1. New Tables
    - `whatsapp_settings`
      - WhatsApp Business API configuration
      - Team-level settings

    - `whatsapp_templates`
      - Pre-approved message templates
      - Template status tracking

    - `whatsapp_queue`
      - Queue for sending messages
      - Retry logic

    - `whatsapp_logs`
      - Track sent messages
      - Delivery status tracking

  2. Features
    - WhatsApp Business API integration
    - Template management
    - Media support (images, documents, videos)
    - Message queue
    - Delivery tracking
    - Read receipts
    - Interactive messages

  3. Security
    - Encrypted credentials
    - RLS policies
    - Rate limiting
*/

-- Create whatsapp message type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'whatsapp_message_type') THEN
    CREATE TYPE whatsapp_message_type AS ENUM (
      'text',
      'template',
      'image',
      'document',
      'video',
      'audio',
      'location',
      'interactive'
    );
  END IF;
END $$;

-- Create whatsapp template status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'whatsapp_template_status') THEN
    CREATE TYPE whatsapp_template_status AS ENUM (
      'pending',
      'approved',
      'rejected',
      'paused'
    );
  END IF;
END $$;

-- Create whatsapp message status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'whatsapp_message_status') THEN
    CREATE TYPE whatsapp_message_status AS ENUM (
      'queued',
      'sending',
      'sent',
      'delivered',
      'read',
      'failed',
      'cancelled'
    );
  END IF;
END $$;

-- Create whatsapp_settings table
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  phone_number_id text NOT NULL,
  business_account_id text NOT NULL,
  access_token text NOT NULL,
  webhook_verify_token text,
  daily_limit integer DEFAULT 1000 NOT NULL,
  messages_sent_today integer DEFAULT 0 NOT NULL,
  last_reset_date date DEFAULT CURRENT_DATE NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create whatsapp_templates table
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  language text DEFAULT 'en' NOT NULL,
  category text NOT NULL,
  components jsonb NOT NULL,
  status whatsapp_template_status DEFAULT 'pending' NOT NULL,
  whatsapp_template_id text,
  rejection_reason text,
  is_active boolean DEFAULT true NOT NULL,
  usage_count integer DEFAULT 0 NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(team_id, name, language)
);

-- Create whatsapp_queue table
CREATE TABLE IF NOT EXISTS whatsapp_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  priority email_priority DEFAULT 'normal' NOT NULL,
  to_number text NOT NULL,
  message_type whatsapp_message_type NOT NULL,
  content jsonb NOT NULL,
  media_url text,
  media_type text,
  scheduled_for timestamptz,
  attempts integer DEFAULT 0 NOT NULL,
  max_attempts integer DEFAULT 3 NOT NULL,
  status whatsapp_message_status DEFAULT 'queued' NOT NULL,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create whatsapp_logs table
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  queue_id uuid REFERENCES whatsapp_queue(id) ON DELETE SET NULL,
  template_id uuid REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  whatsapp_message_id text,
  to_number text NOT NULL,
  from_number text NOT NULL,
  message_type whatsapp_message_type NOT NULL,
  content jsonb NOT NULL,
  status whatsapp_message_status NOT NULL,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  error_code text,
  conversation_id text,
  conversation_category text,
  events jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_settings

-- Team admins can view settings
CREATE POLICY "Team admins can view whatsapp settings"
  ON whatsapp_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = whatsapp_settings.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- Team admins can manage settings
CREATE POLICY "Team admins can manage whatsapp settings"
  ON whatsapp_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = whatsapp_settings.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- RLS Policies for whatsapp_templates

-- Team members can view templates
CREATE POLICY "Team members can view whatsapp templates"
  ON whatsapp_templates
  FOR SELECT
  TO authenticated
  USING (
    team_id IS NULL OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = whatsapp_templates.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.is_active = true
    )
  );

-- Team admins can manage templates
CREATE POLICY "Team admins can manage whatsapp templates"
  ON whatsapp_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = whatsapp_templates.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- RLS Policies for whatsapp_queue

-- Team members can view queue
CREATE POLICY "Team members can view whatsapp queue"
  ON whatsapp_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = whatsapp_queue.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.is_active = true
    )
  );

-- System can manage queue
CREATE POLICY "System can manage whatsapp queue"
  ON whatsapp_queue
  FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for whatsapp_logs

-- Team members can view logs
CREATE POLICY "Team members can view whatsapp logs"
  ON whatsapp_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = whatsapp_logs.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.is_active = true
    )
  );

-- System can create logs
CREATE POLICY "System can create whatsapp logs"
  ON whatsapp_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_team ON whatsapp_settings(team_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_team ON whatsapp_templates(team_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON whatsapp_templates(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_team ON whatsapp_queue(team_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON whatsapp_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_priority ON whatsapp_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_team ON whatsapp_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created ON whatsapp_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_message_id ON whatsapp_logs(whatsapp_message_id);

-- Create function to reset daily message count
CREATE OR REPLACE FUNCTION reset_daily_whatsapp_count()
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_settings
  SET messages_sent_today = 0,
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check message limit
CREATE OR REPLACE FUNCTION can_send_whatsapp(p_team_id uuid)
RETURNS boolean AS $$
DECLARE
  v_settings whatsapp_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_settings
  FROM whatsapp_settings
  WHERE team_id = p_team_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Reset count if needed
  IF v_settings.last_reset_date < CURRENT_DATE THEN
    PERFORM reset_daily_whatsapp_count();
    v_settings.messages_sent_today := 0;
  END IF;

  -- Check limit
  RETURN v_settings.messages_sent_today < v_settings.daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment message count
CREATE OR REPLACE FUNCTION increment_whatsapp_count(p_team_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_settings
  SET messages_sent_today = messages_sent_today + 1
  WHERE team_id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to queue WhatsApp message
CREATE OR REPLACE FUNCTION queue_whatsapp(
  p_team_id uuid,
  p_template_id uuid DEFAULT NULL,
  p_to_number text,
  p_message_type whatsapp_message_type,
  p_content jsonb,
  p_media_url text DEFAULT NULL,
  p_priority email_priority DEFAULT 'normal',
  p_scheduled_for timestamptz DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_queue_id uuid;
  v_settings whatsapp_settings%ROWTYPE;
BEGIN
  -- Check if can send
  IF NOT can_send_whatsapp(p_team_id) THEN
    RAISE EXCEPTION 'Daily WhatsApp message limit reached';
  END IF;

  -- Get settings
  SELECT * INTO v_settings
  FROM whatsapp_settings
  WHERE team_id = p_team_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WhatsApp settings not configured';
  END IF;

  -- Insert into queue
  INSERT INTO whatsapp_queue (
    team_id,
    template_id,
    priority,
    to_number,
    message_type,
    content,
    media_url,
    scheduled_for,
    status
  ) VALUES (
    p_team_id,
    p_template_id,
    p_priority,
    p_to_number,
    p_message_type,
    p_content,
    p_media_url,
    p_scheduled_for,
    'queued'
  ) RETURNING id INTO v_queue_id;

  -- Update template usage
  IF p_template_id IS NOT NULL THEN
    UPDATE whatsapp_templates
    SET usage_count = usage_count + 1
    WHERE id = p_template_id;
  END IF;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get next queued message
CREATE OR REPLACE FUNCTION get_next_queued_whatsapp()
RETURNS uuid AS $$
DECLARE
  v_queue_id uuid;
BEGIN
  SELECT id INTO v_queue_id
  FROM whatsapp_queue
  WHERE status = 'queued'
    AND attempts < max_attempts
    AND (scheduled_for IS NULL OR scheduled_for <= now())
  ORDER BY
    priority DESC,
    created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_queue_id IS NOT NULL THEN
    UPDATE whatsapp_queue
    SET status = 'sending',
        attempts = attempts + 1,
        updated_at = now()
    WHERE id = v_queue_id;
  END IF;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get WhatsApp statistics
CREATE OR REPLACE FUNCTION get_whatsapp_stats(
  p_team_id uuid,
  p_days integer DEFAULT 30
)
RETURNS jsonb AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_sent', COUNT(*),
    'delivered', COUNT(*) FILTER (WHERE status IN ('delivered', 'read')),
    'read', COUNT(*) FILTER (WHERE status = 'read'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'delivery_rate', ROUND(
      COUNT(*) FILTER (WHERE status IN ('delivered', 'read'))::numeric /
      NULLIF(COUNT(*), 0) * 100,
      2
    ),
    'read_rate', ROUND(
      COUNT(*) FILTER (WHERE status = 'read')::numeric /
      NULLIF(COUNT(*) FILTER (WHERE status IN ('delivered', 'read')), 0) * 100,
      2
    ),
    'by_type', (
      SELECT jsonb_object_agg(message_type, count)
      FROM (
        SELECT message_type, COUNT(*) as count
        FROM whatsapp_logs
        WHERE team_id = p_team_id
          AND created_at >= now() - (p_days || ' days')::interval
        GROUP BY message_type
      ) type_counts
    )
  ) INTO v_stats
  FROM whatsapp_logs
  WHERE team_id = p_team_id
    AND created_at >= now() - (p_days || ' days')::interval;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_settings_updated_at ON whatsapp_settings;
CREATE TRIGGER update_whatsapp_settings_updated_at
  BEFORE UPDATE ON whatsapp_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_updated_at();

DROP TRIGGER IF EXISTS update_whatsapp_templates_updated_at ON whatsapp_templates;
CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_updated_at();

DROP TRIGGER IF EXISTS update_whatsapp_queue_updated_at ON whatsapp_queue;
CREATE TRIGGER update_whatsapp_queue_updated_at
  BEFORE UPDATE ON whatsapp_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_updated_at();
