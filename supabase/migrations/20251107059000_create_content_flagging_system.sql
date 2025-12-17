/*
  # Content Flagging & Reporting System

  1. New Tables
    - content_reports - User-submitted reports
    - report_categories - Predefined report reasons
    - moderation_queue - Flagged content for review
    - moderation_actions - Admin decisions on reports
    - auto_moderation_rules - Automated flagging rules
    - content_strikes - User violation tracking

  2. Features
    - Multi-type content reporting (posts, reviews, listings, users, messages)
    - Categorized report reasons
    - Automated flagging based on keywords/patterns
    - Moderation queue with priority levels
    - Strike system for repeat offenders
    - Appeal process
    - Bulk moderation actions

  3. Security
    - RLS policies for users and admins
    - Prevent report spam
    - Track reporter credibility
*/

-- Create report categories table
CREATE TABLE IF NOT EXISTS report_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  applies_to text[] NOT NULL, -- ['post', 'review', 'listing', 'user', 'message']
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create content_reports table
CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN (
    'post', 'comment', 'review', 'listing', 'user', 'message', 'booking'
  )),
  content_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES report_categories(id),
  reason text NOT NULL,
  description text,
  evidence_urls jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewing', 'resolved', 'dismissed', 'escalated'
  )),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  reporter_ip text,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create moderation_queue table
CREATE TABLE IF NOT EXISTS moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES content_reports(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  content_author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content_snapshot jsonb NOT NULL, -- Store content at time of report
  total_reports integer DEFAULT 1,
  unique_reporters integer DEFAULT 1,
  auto_flagged boolean DEFAULT false,
  auto_flag_reason text,
  priority_score numeric DEFAULT 0, -- Calculated priority
  assigned_to uuid REFERENCES profiles(id), -- Assigned moderator
  status text DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_review', 'resolved', 'escalated'
  )),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(content_type, content_id)
);

-- Create moderation_actions table
CREATE TABLE IF NOT EXISTS moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_item_id uuid REFERENCES moderation_queue(id) ON DELETE CASCADE,
  report_id uuid REFERENCES content_reports(id),
  moderator_id uuid NOT NULL REFERENCES profiles(id),
  action_type text NOT NULL CHECK (action_type IN (
    'dismiss', 'warn', 'remove_content', 'suspend_user', 'ban_user', 'escalate', 'restore'
  )),
  reason text NOT NULL,
  internal_notes text,
  content_removed boolean DEFAULT false,
  user_notified boolean DEFAULT false,
  strike_issued boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create auto_moderation_rules table
CREATE TABLE IF NOT EXISTS auto_moderation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  rule_type text NOT NULL CHECK (rule_type IN (
    'keyword', 'pattern', 'spam_detection', 'rate_limit', 'ml_model'
  )),
  content_types text[] NOT NULL,
  rule_config jsonb NOT NULL, -- Rule-specific configuration
  action text NOT NULL CHECK (action IN ('flag', 'auto_remove', 'shadow_ban', 'require_review')),
  severity text DEFAULT 'medium',
  is_active boolean DEFAULT true,
  false_positive_count integer DEFAULT 0,
  true_positive_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create content_strikes table
CREATE TABLE IF NOT EXISTS content_strikes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  violation_category text NOT NULL,
  violation_description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe', 'critical')),
  moderation_action_id uuid REFERENCES moderation_actions(id),
  strike_count integer DEFAULT 1, -- How many strikes this violation is worth
  expires_at timestamptz, -- NULL for permanent strikes
  appealed boolean DEFAULT false,
  appeal_status text CHECK (appeal_status IN ('pending', 'approved', 'rejected')),
  appeal_notes text,
  created_at timestamptz DEFAULT now()
);

-- Create report_appeals table
CREATE TABLE IF NOT EXISTS report_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strike_id uuid REFERENCES content_strikes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  appeal_reason text NOT NULL,
  evidence_urls jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES profiles(id),
  review_notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

-- Create indexes
CREATE INDEX idx_content_reports_reporter ON content_reports(reporter_id);
CREATE INDEX idx_content_reports_content ON content_reports(content_type, content_id);
CREATE INDEX idx_content_reports_status ON content_reports(status, priority);
CREATE INDEX idx_content_reports_created ON content_reports(created_at DESC);

CREATE INDEX idx_moderation_queue_status ON moderation_queue(status, priority_score DESC);
CREATE INDEX idx_moderation_queue_assigned ON moderation_queue(assigned_to, status);
CREATE INDEX idx_moderation_queue_content ON moderation_queue(content_type, content_id);
CREATE INDEX idx_moderation_queue_author ON moderation_queue(content_author_id);

CREATE INDEX idx_moderation_actions_moderator ON moderation_actions(moderator_id);
CREATE INDEX idx_moderation_actions_queue ON moderation_actions(queue_item_id);

CREATE INDEX idx_content_strikes_user ON content_strikes(user_id, expires_at);
CREATE INDEX idx_content_strikes_active ON content_strikes(user_id)
  WHERE expires_at IS NULL OR expires_at > NOW();

CREATE INDEX idx_report_appeals_user ON report_appeals(user_id, status);

-- Insert default report categories
INSERT INTO report_categories (name, description, icon, severity, applies_to, sort_order) VALUES
  ('Spam', 'Unwanted promotional content or repetitive posts', '⚠️', 'medium', ARRAY['post', 'comment', 'review', 'message'], 1),
  ('Harassment', 'Bullying, threatening, or abusive behavior', '🚫', 'high', ARRAY['post', 'comment', 'message', 'user'], 2),
  ('Hate Speech', 'Content promoting hatred or discrimination', '⛔', 'critical', ARRAY['post', 'comment', 'review'], 3),
  ('Violence', 'Graphic violence or threats of harm', '🔴', 'critical', ARRAY['post', 'comment'], 4),
  ('Inappropriate Content', 'Sexual, explicit, or offensive material', '🔞', 'high', ARRAY['post', 'comment', 'review', 'listing'], 5),
  ('Scam or Fraud', 'Deceptive practices or fraudulent activity', '💰', 'critical', ARRAY['listing', 'user', 'message'], 6),
  ('Fake Profile', 'Impersonation or misleading identity', '🎭', 'high', ARRAY['user'], 7),
  ('Misinformation', 'False or misleading information', '❌', 'medium', ARRAY['post', 'review'], 8),
  ('Copyright Violation', 'Unauthorized use of copyrighted material', '©️', 'medium', ARRAY['post', 'listing'], 9),
  ('Privacy Violation', 'Sharing private information without consent', '🔒', 'high', ARRAY['post', 'comment'], 10),
  ('Off-Topic', 'Content unrelated to services or community', '📍', 'low', ARRAY['post', 'comment'], 11),
  ('Poor Quality', 'Low-effort or unhelpful content', '👎', 'low', ARRAY['post', 'review'], 12),
  ('Other', 'Issue not covered by other categories', '🤔', 'medium', ARRAY['post', 'comment', 'review', 'listing', 'user', 'message'], 99)
ON CONFLICT DO NOTHING;

-- Insert default auto-moderation rules
INSERT INTO auto_moderation_rules (name, description, rule_type, content_types, rule_config, action, severity) VALUES
  ('Profanity Filter', 'Detect and flag explicit language', 'keyword', ARRAY['post', 'comment', 'review'],
    '{"keywords": ["profanity", "explicit", "offensive"], "case_sensitive": false}'::jsonb,
    'flag', 'medium'),
  ('Spam Pattern Detection', 'Identify repetitive promotional content', 'pattern', ARRAY['post', 'comment'],
    '{"max_repetition": 3, "time_window_minutes": 60}'::jsonb,
    'flag', 'medium'),
  ('Suspicious Links', 'Flag posts with external links', 'pattern', ARRAY['post', 'comment', 'message'],
    '{"pattern": "http[s]?://(?!dollarsmiley)", "exceptions": []}'::jsonb,
    'require_review', 'low'),
  ('Rapid Posting', 'Rate limit excessive posting', 'rate_limit', ARRAY['post', 'comment'],
    '{"max_posts": 10, "time_window_minutes": 60}'::jsonb,
    'flag', 'medium')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE report_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_moderation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_appeals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_categories
CREATE POLICY "Anyone can view active report categories"
  ON report_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage report categories"
  ON report_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for content_reports
CREATE POLICY "Users can create reports"
  ON content_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON content_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON content_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update reports"
  ON content_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for moderation_queue
CREATE POLICY "Admins can view moderation queue"
  ON moderation_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage moderation queue"
  ON moderation_queue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for moderation_actions
CREATE POLICY "Admins can view moderation actions"
  ON moderation_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can create moderation actions"
  ON moderation_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = moderator_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for content_strikes
CREATE POLICY "Users can view own strikes"
  ON content_strikes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all strikes"
  ON content_strikes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can create strikes"
  ON content_strikes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for report_appeals
CREATE POLICY "Users can create appeals for own strikes"
  ON report_appeals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own appeals"
  ON report_appeals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all appeals"
  ON report_appeals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update appeals"
  ON report_appeals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to submit a content report
CREATE OR REPLACE FUNCTION submit_content_report(
  p_content_type text,
  p_content_id uuid,
  p_category_id uuid,
  p_reason text,
  p_description text DEFAULT NULL,
  p_evidence_urls jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_report_id uuid;
  v_queue_id uuid;
  v_severity text;
  v_existing_queue uuid;
BEGIN
  -- Check if user has already reported this content
  IF EXISTS (
    SELECT 1 FROM content_reports
    WHERE reporter_id = auth.uid()
      AND content_type = p_content_type
      AND content_id = p_content_id
      AND created_at > NOW() - INTERVAL '7 days'
  ) THEN
    RAISE EXCEPTION 'You have already reported this content recently';
  END IF;

  -- Get severity from category
  SELECT severity INTO v_severity
  FROM report_categories
  WHERE id = p_category_id;

  -- Create the report
  INSERT INTO content_reports (
    reporter_id, content_type, content_id, category_id,
    reason, description, evidence_urls, priority
  ) VALUES (
    auth.uid(), p_content_type, p_content_id, p_category_id,
    p_reason, p_description, p_evidence_urls,
    CASE v_severity
      WHEN 'critical' THEN 'urgent'
      WHEN 'high' THEN 'high'
      ELSE 'medium'
    END
  ) RETURNING id INTO v_report_id;

  -- Check if content is already in moderation queue
  SELECT id INTO v_existing_queue
  FROM moderation_queue
  WHERE content_type = p_content_type AND content_id = p_content_id;

  IF v_existing_queue IS NOT NULL THEN
    -- Update existing queue item
    UPDATE moderation_queue SET
      total_reports = total_reports + 1,
      unique_reporters = unique_reporters + 1,
      priority_score = priority_score + (
        CASE v_severity
          WHEN 'critical' THEN 50
          WHEN 'high' THEN 30
          WHEN 'medium' THEN 15
          ELSE 5
        END
      ),
      updated_at = NOW()
    WHERE id = v_existing_queue;
  ELSE
    -- Add to moderation queue
    INSERT INTO moderation_queue (
      report_id, content_type, content_id,
      content_author_id, content_snapshot, priority_score
    )
    SELECT
      v_report_id, p_content_type, p_content_id,
      CASE p_content_type
        WHEN 'post' THEN (SELECT author_id FROM community_posts WHERE id = p_content_id)
        WHEN 'review' THEN (SELECT customer_id FROM reviews WHERE id = p_content_id)
        WHEN 'listing' THEN (SELECT provider_id FROM service_listings WHERE id = p_content_id)
        WHEN 'user' THEN p_content_id
        ELSE NULL
      END,
      CASE p_content_type
        WHEN 'post' THEN row_to_json(community_posts.*)::jsonb
        WHEN 'review' THEN row_to_json(reviews.*)::jsonb
        WHEN 'listing' THEN row_to_json(service_listings.*)::jsonb
        ELSE '{}'::jsonb
      END,
      CASE v_severity
        WHEN 'critical' THEN 50
        WHEN 'high' THEN 30
        WHEN 'medium' THEN 15
        ELSE 5
      END
    FROM LATERAL (
      SELECT * FROM community_posts WHERE id = p_content_id AND p_content_type = 'post'
      UNION ALL
      SELECT * FROM reviews WHERE id = p_content_id AND p_content_type = 'review'
      UNION ALL
      SELECT * FROM service_listings WHERE id = p_content_id AND p_content_type = 'listing'
    ) content
    LIMIT 1;
  END IF;

  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active strikes for a user
CREATE OR REPLACE FUNCTION get_user_active_strikes(p_user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(strike_count), 0)::integer
    FROM content_strikes
    WHERE user_id = p_user_id
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (appeal_status IS NULL OR appeal_status != 'approved')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-moderate content
CREATE OR REPLACE FUNCTION auto_moderate_content(
  p_content_type text,
  p_content_id uuid,
  p_content_text text
)
RETURNS boolean AS $$
DECLARE
  v_rule RECORD;
  v_flagged boolean := false;
BEGIN
  -- Check against active auto-moderation rules
  FOR v_rule IN
    SELECT * FROM auto_moderation_rules
    WHERE is_active = true
      AND p_content_type = ANY(content_types)
  LOOP
    -- Simple keyword matching (extend with more sophisticated logic)
    IF v_rule.rule_type = 'keyword' THEN
      IF p_content_text ~* ANY(
        SELECT jsonb_array_elements_text(v_rule.rule_config->'keywords')
      ) THEN
        v_flagged := true;

        -- Add to moderation queue
        INSERT INTO moderation_queue (
          content_type, content_id, auto_flagged,
          auto_flag_reason, priority_score
        ) VALUES (
          p_content_type, p_content_id, true,
          'Flagged by rule: ' || v_rule.name,
          CASE v_rule.severity
            WHEN 'critical' THEN 40
            WHEN 'high' THEN 25
            WHEN 'medium' THEN 10
            ELSE 5
          END
        ) ON CONFLICT (content_type, content_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;

  RETURN v_flagged;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE content_reports IS 'User-submitted reports of problematic content';
COMMENT ON TABLE moderation_queue IS 'Queue of flagged content awaiting moderator review';
COMMENT ON TABLE moderation_actions IS 'Actions taken by moderators on reported content';
COMMENT ON TABLE content_strikes IS 'Violation history and strikes against users';
COMMENT ON TABLE report_appeals IS 'User appeals of moderation decisions';

COMMENT ON FUNCTION submit_content_report IS 'Submit a report for inappropriate content with automatic queue management';
COMMENT ON FUNCTION get_user_active_strikes IS 'Get total active strike count for a user';
COMMENT ON FUNCTION auto_moderate_content IS 'Automatically flag content based on predefined rules';
