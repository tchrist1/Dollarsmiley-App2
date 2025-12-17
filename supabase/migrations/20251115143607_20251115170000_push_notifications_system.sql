/*
  # Push Notifications System

  1. New Tables
    - `push_tokens` - Store user device push tokens
    - `notification_queue` - Queued notifications
    - `notification_batches` - Grouped notifications

  2. Security
    - Enable RLS on all tables
*/

CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  device_type text CHECK (device_type IN ('ios', 'android', 'web')),
  device_name text,
  is_active boolean DEFAULT true,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_tokens' AND policyname = 'Users can manage own push tokens'
  ) THEN
    CREATE POLICY "Users can manage own push tokens"
      ON push_tokens FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_id uuid REFERENCES notifications(id) ON DELETE SET NULL,
  push_token text,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  scheduled_for timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  sent_at timestamptz,
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_queue_user ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_queue_notification ON notification_queue(notification_id);

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notification_queue' AND policyname = 'Users can view own queued notifications'
  ) THEN
    CREATE POLICY "Users can view own queued notifications"
      ON notification_queue FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS notification_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  batch_type text NOT NULL,
  notification_ids uuid[],
  title text NOT NULL,
  summary text NOT NULL,
  notification_count integer DEFAULT 0,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_batches_user ON notification_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_batches_type ON notification_batches(batch_type);
CREATE INDEX IF NOT EXISTS idx_batches_sent ON notification_batches(sent_at);

ALTER TABLE notification_batches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notification_batches' AND policyname = 'Users can view own notification batches'
  ) THEN
    CREATE POLICY "Users can view own notification batches"
      ON notification_batches FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION register_push_token(
  user_id_param uuid,
  token_param text,
  device_type_param text,
  device_name_param text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_id uuid;
BEGIN
  INSERT INTO push_tokens (
    user_id,
    token,
    device_type,
    device_name,
    is_active,
    last_used_at
  ) VALUES (
    user_id_param,
    token_param,
    device_type_param,
    device_name_param,
    true,
    now()
  )
  ON CONFLICT (token)
  DO UPDATE SET
    is_active = true,
    last_used_at = now(),
    updated_at = now()
  RETURNING id INTO token_id;
  
  RETURN token_id;
END;
$$;

CREATE OR REPLACE FUNCTION queue_push_notification(
  user_id_param uuid,
  title_param text,
  body_param text,
  data_param jsonb DEFAULT '{}'::jsonb,
  scheduled_for_param timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  queue_id uuid;
  user_token RECORD;
BEGIN
  FOR user_token IN 
    SELECT token FROM push_tokens
    WHERE user_id = user_id_param AND is_active = true
  LOOP
    INSERT INTO notification_queue (
      user_id,
      push_token,
      title,
      body,
      data,
      scheduled_for,
      status
    ) VALUES (
      user_id_param,
      user_token.token,
      title_param,
      body_param,
      data_param,
      scheduled_for_param,
      'pending'
    ) RETURNING id INTO queue_id;
  END LOOP;
  
  RETURN queue_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_pending_push_notifications(limit_param integer DEFAULT 100)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  push_token text,
  title text,
  body text,
  data jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE notification_queue
  SET status = 'sending'
  WHERE notification_queue.id IN (
    SELECT notification_queue.id
    FROM notification_queue
    WHERE status = 'pending'
      AND scheduled_for <= now()
    ORDER BY scheduled_for
    LIMIT limit_param
    FOR UPDATE SKIP LOCKED
  )
  RETURNING 
    notification_queue.id,
    notification_queue.user_id,
    notification_queue.push_token,
    notification_queue.title,
    notification_queue.body,
    notification_queue.data;
END;
$$;

CREATE OR REPLACE FUNCTION mark_notification_sent(
  queue_id_param uuid,
  success_param boolean,
  error_message_param text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF success_param THEN
    UPDATE notification_queue
    SET 
      status = 'sent',
      sent_at = now()
    WHERE id = queue_id_param;
  ELSE
    UPDATE notification_queue
    SET 
      status = CASE 
        WHEN retry_count >= 3 THEN 'failed'
        ELSE 'pending'
      END,
      retry_count = retry_count + 1,
      error_message = error_message_param,
      scheduled_for = CASE
        WHEN retry_count >= 3 THEN scheduled_for
        ELSE now() + (retry_count + 1) * interval '5 minutes'
      END
    WHERE id = queue_id_param;
  END IF;
END;
$$;