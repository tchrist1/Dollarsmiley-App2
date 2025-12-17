/*
  # Create Smart Notification System

  1. New Tables
    - `notification_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `channel_preferences` (jsonb) - Email, push, SMS preferences
      - `frequency_preference` (text) - Instant, hourly, daily, weekly
      - `quiet_hours_start` (time)
      - `quiet_hours_end` (time)
      - `categories_enabled` (text[]) - Which categories to notify about
      - `smart_suggestions_enabled` (boolean)
      - `updated_at` (timestamptz)

    - `notification_templates`
      - `id` (uuid, primary key)
      - `category` (text) - booking, message, review, recommendation, etc.
      - `type` (text) - instant, digest, reminder, suggestion
      - `priority` (text) - low, medium, high, urgent
      - `title_template` (text)
      - `body_template` (text)
      - `action_url_template` (text)
      - `icon` (text)
      - `enabled` (boolean)
      - `created_at` (timestamptz)

    - `notification_suggestions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `suggestion_type` (text) - re_engagement, abandoned_booking, review_reminder, etc.
      - `priority_score` (numeric) - 0-100
      - `context_data` (jsonb) - Data used for suggestion
      - `notification_template_id` (uuid, references notification_templates)
      - `status` (text) - pending, sent, dismissed, expired
      - `suggested_send_time` (timestamptz)
      - `sent_at` (timestamptz)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `notification_engagement_metrics`
      - `id` (uuid, primary key)
      - `notification_id` (uuid, references notifications)
      - `user_id` (uuid, references profiles)
      - `opened` (boolean)
      - `clicked` (boolean)
      - `dismissed` (boolean)
      - `action_taken` (text)
      - `time_to_open_seconds` (integer)
      - `opened_at` (timestamptz)
      - `clicked_at` (timestamptz)
      - `dismissed_at` (timestamptz)
      - `created_at` (timestamptz)

    - `notification_digest_queue`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `digest_type` (text) - hourly, daily, weekly
      - `notifications` (jsonb[]) - Array of queued notifications
      - `scheduled_send_time` (timestamptz)
      - `sent` (boolean)
      - `sent_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can manage their own preferences
    - Users can view their own suggestions
    - System can manage templates and suggestions

  3. Indexes
    - Index on user preferences
    - Index on suggestion status and send time
    - Index on engagement metrics
    - Index on digest queue schedule
*/

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Channel preferences
  channel_preferences jsonb DEFAULT '{
    "email": true,
    "push": true,
    "sms": false,
    "in_app": true
  }'::jsonb,

  -- Frequency settings
  frequency_preference text DEFAULT 'instant' CHECK (
    frequency_preference IN ('instant', 'hourly', 'daily', 'weekly', 'custom')
  ),

  -- Quiet hours
  quiet_hours_start time,
  quiet_hours_end time,

  -- Category filters
  categories_enabled text[] DEFAULT ARRAY[
    'booking', 'message', 'payment', 'review', 'recommendation', 'promotion'
  ],

  -- Smart features
  smart_suggestions_enabled boolean DEFAULT true,

  updated_at timestamptz DEFAULT now(),

  CONSTRAINT unique_user_notification_prefs UNIQUE (user_id)
);

-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  category text NOT NULL CHECK (category IN (
    'booking', 'message', 'payment', 'review', 'recommendation',
    'promotion', 'system', 'social', 'achievement'
  )),
  type text NOT NULL CHECK (type IN (
    'instant', 'digest', 'reminder', 'suggestion', 'alert'
  )),
  priority text NOT NULL CHECK (priority IN (
    'low', 'medium', 'high', 'urgent'
  )),

  -- Template content
  title_template text NOT NULL,
  body_template text NOT NULL,
  action_url_template text,
  icon text,

  -- Metadata
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create notification_suggestions table
CREATE TABLE IF NOT EXISTS notification_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Suggestion details
  suggestion_type text NOT NULL CHECK (suggestion_type IN (
    're_engagement',
    'abandoned_booking',
    'review_reminder',
    'price_drop',
    'new_match',
    'inactive_booking',
    'provider_available',
    'trending_nearby',
    'achievement_unlock',
    'referral_opportunity'
  )),

  priority_score numeric NOT NULL CHECK (priority_score >= 0 AND priority_score <= 100),
  context_data jsonb DEFAULT '{}'::jsonb,
  notification_template_id uuid REFERENCES notification_templates(id),

  -- Status tracking
  status text DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'dismissed', 'expired', 'cancelled'
  )),

  -- Timing
  suggested_send_time timestamptz NOT NULL,
  sent_at timestamptz,
  expires_at timestamptz NOT NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notification_engagement_metrics table
CREATE TABLE IF NOT EXISTS notification_engagement_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES notifications(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Engagement flags
  opened boolean DEFAULT false,
  clicked boolean DEFAULT false,
  dismissed boolean DEFAULT false,
  action_taken text,

  -- Timing metrics
  time_to_open_seconds integer,
  opened_at timestamptz,
  clicked_at timestamptz,
  dismissed_at timestamptz,

  created_at timestamptz DEFAULT now()
);

-- Create notification_digest_queue table
CREATE TABLE IF NOT EXISTS notification_digest_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  digest_type text NOT NULL CHECK (digest_type IN ('hourly', 'daily', 'weekly')),
  notifications jsonb[] DEFAULT ARRAY[]::jsonb[],

  scheduled_send_time timestamptz NOT NULL,
  sent boolean DEFAULT false,
  sent_at timestamptz,

  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user
  ON notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_templates_category
  ON notification_templates(category, type);

CREATE INDEX IF NOT EXISTS idx_notification_suggestions_user
  ON notification_suggestions(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_suggestions_status
  ON notification_suggestions(status, suggested_send_time);

CREATE INDEX IF NOT EXISTS idx_notification_suggestions_score
  ON notification_suggestions(priority_score DESC);

CREATE INDEX IF NOT EXISTS idx_engagement_metrics_notification
  ON notification_engagement_metrics(notification_id);

CREATE INDEX IF NOT EXISTS idx_engagement_metrics_user
  ON notification_engagement_metrics(user_id);

CREATE INDEX IF NOT EXISTS idx_digest_queue_schedule
  ON notification_digest_queue(scheduled_send_time, sent);

CREATE INDEX IF NOT EXISTS idx_digest_queue_user
  ON notification_digest_queue(user_id);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_digest_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences

-- Users can manage their own preferences
CREATE POLICY "Users can manage own preferences"
  ON notification_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for notification_templates

-- Anyone can view enabled templates
CREATE POLICY "Anyone can view enabled templates"
  ON notification_templates
  FOR SELECT
  TO authenticated
  USING (enabled = true);

-- Admins can manage templates
CREATE POLICY "Admins can manage templates"
  ON notification_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- RLS Policies for notification_suggestions

-- Users can view their own suggestions
CREATE POLICY "Users can view own suggestions"
  ON notification_suggestions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own suggestions
CREATE POLICY "Users can update own suggestions"
  ON notification_suggestions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System can manage suggestions
CREATE POLICY "System can manage suggestions"
  ON notification_suggestions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for notification_engagement_metrics

-- Users can view their own metrics
CREATE POLICY "Users can view own engagement metrics"
  ON notification_engagement_metrics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can manage metrics
CREATE POLICY "System can manage engagement metrics"
  ON notification_engagement_metrics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for notification_digest_queue

-- Users can view their own digest queue
CREATE POLICY "Users can view own digest queue"
  ON notification_digest_queue
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can manage digest queue
CREATE POLICY "System can manage digest queue"
  ON notification_digest_queue
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to calculate notification priority score
CREATE OR REPLACE FUNCTION calculate_notification_priority(
  p_suggestion_type text,
  p_user_id uuid,
  p_context_data jsonb
)
RETURNS numeric AS $$
DECLARE
  v_base_score numeric := 50;
  v_score numeric := v_base_score;
  v_user_engagement numeric;
  v_time_sensitivity numeric;
BEGIN
  -- Base priority by type
  v_score := CASE p_suggestion_type
    WHEN 'abandoned_booking' THEN 80
    WHEN 'review_reminder' THEN 70
    WHEN 'inactive_booking' THEN 85
    WHEN 're_engagement' THEN 60
    WHEN 'price_drop' THEN 75
    WHEN 'new_match' THEN 65
    WHEN 'provider_available' THEN 70
    WHEN 'trending_nearby' THEN 55
    WHEN 'achievement_unlock' THEN 50
    WHEN 'referral_opportunity' THEN 45
    ELSE 50
  END;

  -- Adjust for user engagement level
  SELECT AVG(engagement_score) INTO v_user_engagement
  FROM user_engagement_metrics
  WHERE user_id = p_user_id
  AND date >= CURRENT_DATE - INTERVAL '7 days';

  IF v_user_engagement IS NOT NULL THEN
    -- Higher engagement users get lower priority for promotions
    IF p_suggestion_type IN ('referral_opportunity', 'trending_nearby') THEN
      v_score := v_score - (v_user_engagement / 10);
    ELSE
      v_score := v_score + (v_user_engagement / 10);
    END IF;
  END IF;

  -- Time sensitivity adjustment
  IF p_context_data ? 'hours_since_action' THEN
    v_time_sensitivity := (p_context_data->>'hours_since_action')::numeric;
    IF v_time_sensitivity > 72 THEN
      v_score := v_score + 10; -- More urgent after 3 days
    ELSIF v_time_sensitivity < 24 THEN
      v_score := v_score - 5; -- Less urgent if very recent
    END IF;
  END IF;

  -- Cap at 0-100
  v_score := GREATEST(0, LEAST(100, v_score));

  RETURN ROUND(v_score, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create smart notification suggestion
CREATE OR REPLACE FUNCTION create_notification_suggestion(
  p_user_id uuid,
  p_suggestion_type text,
  p_context_data jsonb,
  p_template_id uuid DEFAULT NULL,
  p_expires_in_hours integer DEFAULT 24
)
RETURNS uuid AS $$
DECLARE
  v_suggestion_id uuid;
  v_priority_score numeric;
  v_send_time timestamptz;
  v_expires_at timestamptz;
BEGIN
  -- Calculate priority score
  v_priority_score := calculate_notification_priority(
    p_suggestion_type,
    p_user_id,
    p_context_data
  );

  -- Determine optimal send time based on user preferences and behavior
  SELECT suggested_send_time INTO v_send_time
  FROM calculate_optimal_send_time(p_user_id, v_priority_score);

  v_expires_at := now() + (p_expires_in_hours || ' hours')::interval;

  -- Insert suggestion
  INSERT INTO notification_suggestions (
    user_id,
    suggestion_type,
    priority_score,
    context_data,
    notification_template_id,
    suggested_send_time,
    expires_at
  ) VALUES (
    p_user_id,
    p_suggestion_type,
    v_priority_score,
    p_context_data,
    p_template_id,
    v_send_time,
    v_expires_at
  )
  RETURNING id INTO v_suggestion_id;

  RETURN v_suggestion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate optimal send time
CREATE OR REPLACE FUNCTION calculate_optimal_send_time(
  p_user_id uuid,
  p_priority numeric
)
RETURNS TABLE (suggested_send_time timestamptz) AS $$
DECLARE
  v_quiet_start time;
  v_quiet_end time;
  v_peak_hour integer;
  v_send_time timestamptz;
BEGIN
  -- Get user preferences
  SELECT quiet_hours_start, quiet_hours_end INTO v_quiet_start, v_quiet_end
  FROM notification_preferences
  WHERE user_id = p_user_id;

  -- Get user's peak activity hour
  SELECT peak_activity_hour INTO v_peak_hour
  FROM user_engagement_metrics
  WHERE user_id = p_user_id
  ORDER BY date DESC
  LIMIT 1;

  -- Calculate send time
  IF p_priority >= 80 THEN
    -- High priority: send immediately
    v_send_time := now();
  ELSIF v_peak_hour IS NOT NULL THEN
    -- Send during peak activity hour
    v_send_time := date_trunc('hour', now()) + (v_peak_hour || ' hours')::interval;
    IF v_send_time < now() THEN
      v_send_time := v_send_time + INTERVAL '1 day';
    END IF;
  ELSE
    -- Default: send in 1 hour
    v_send_time := now() + INTERVAL '1 hour';
  END IF;

  -- Respect quiet hours
  IF v_quiet_start IS NOT NULL AND v_quiet_end IS NOT NULL THEN
    IF v_send_time::time BETWEEN v_quiet_start AND v_quiet_end THEN
      v_send_time := date_trunc('day', v_send_time) + v_quiet_end::interval;
    END IF;
  END IF;

  RETURN QUERY SELECT v_send_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record notification engagement
CREATE OR REPLACE FUNCTION record_notification_engagement(
  p_notification_id uuid,
  p_user_id uuid,
  p_action text
)
RETURNS void AS $$
DECLARE
  v_created_at timestamptz;
  v_time_to_open integer;
BEGIN
  -- Get notification creation time
  SELECT created_at INTO v_created_at
  FROM notifications
  WHERE id = p_notification_id;

  IF v_created_at IS NOT NULL THEN
    v_time_to_open := EXTRACT(EPOCH FROM (now() - v_created_at))::integer;
  END IF;

  -- Insert or update engagement metrics
  INSERT INTO notification_engagement_metrics (
    notification_id,
    user_id,
    opened,
    clicked,
    dismissed,
    action_taken,
    time_to_open_seconds,
    opened_at,
    clicked_at,
    dismissed_at
  ) VALUES (
    p_notification_id,
    p_user_id,
    p_action = 'open',
    p_action = 'click',
    p_action = 'dismiss',
    p_action,
    CASE WHEN p_action = 'open' THEN v_time_to_open ELSE NULL END,
    CASE WHEN p_action = 'open' THEN now() ELSE NULL END,
    CASE WHEN p_action = 'click' THEN now() ELSE NULL END,
    CASE WHEN p_action = 'dismiss' THEN now() ELSE NULL END
  )
  ON CONFLICT (notification_id, user_id)
  DO UPDATE SET
    opened = CASE WHEN p_action = 'open' THEN true ELSE notification_engagement_metrics.opened END,
    clicked = CASE WHEN p_action = 'click' THEN true ELSE notification_engagement_metrics.clicked END,
    dismissed = CASE WHEN p_action = 'dismiss' THEN true ELSE notification_engagement_metrics.dismissed END,
    action_taken = p_action,
    opened_at = CASE WHEN p_action = 'open' AND notification_engagement_metrics.opened_at IS NULL THEN now() ELSE notification_engagement_metrics.opened_at END,
    clicked_at = CASE WHEN p_action = 'click' AND notification_engagement_metrics.clicked_at IS NULL THEN now() ELSE notification_engagement_metrics.clicked_at END,
    dismissed_at = CASE WHEN p_action = 'dismiss' AND notification_engagement_metrics.dismissed_at IS NULL THEN now() ELSE notification_engagement_metrics.dismissed_at END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending notification suggestions
CREATE OR REPLACE FUNCTION get_pending_notification_suggestions(
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  suggestion_type text,
  priority_score numeric,
  context_data jsonb,
  suggested_send_time timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ns.id,
    ns.user_id,
    ns.suggestion_type,
    ns.priority_score,
    ns.context_data,
    ns.suggested_send_time
  FROM notification_suggestions ns
  INNER JOIN notification_preferences np ON np.user_id = ns.user_id
  WHERE ns.status = 'pending'
  AND ns.suggested_send_time <= now()
  AND ns.expires_at > now()
  AND np.smart_suggestions_enabled = true
  ORDER BY ns.priority_score DESC, ns.suggested_send_time ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired suggestions
CREATE OR REPLACE FUNCTION clean_expired_notification_suggestions()
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE notification_suggestions
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
  AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
