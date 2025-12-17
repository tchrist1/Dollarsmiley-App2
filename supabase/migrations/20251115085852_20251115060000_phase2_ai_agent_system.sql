/*
  # Phase 2: AI Agent System

  1. New Tables
    - `ai_agents` - AI agent configurations
      - `id` (uuid, primary key)
      - `name` (text)
      - `agent_type` (text) - recommendation, moderation, pricing, support
      - `model` (text) - AI model used
      - `configuration` (jsonb) - Agent settings
      - `is_active` (boolean)
      - `performance_metrics` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `ai_agent_actions` - Track AI agent actions
      - `id` (uuid, primary key)
      - `agent_id` (uuid, references ai_agents)
      - `action_type` (text)
      - `input_data` (jsonb)
      - `output_data` (jsonb)
      - `confidence_score` (numeric)
      - `execution_time_ms` (integer)
      - `status` (text) - success, failed, pending
      - `error_message` (text)
      - `created_at` (timestamptz)
    
    - `ai_recommendations` - AI-generated recommendations
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `recommendation_type` (text) - provider, service, product
      - `recommended_item_id` (uuid)
      - `recommended_item_type` (text)
      - `reasoning` (text)
      - `confidence_score` (numeric)
      - `metadata` (jsonb)
      - `is_accepted` (boolean)
      - `feedback` (text)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz)
    
    - `ai_content_moderation` - AI moderation results
      - `id` (uuid, primary key)
      - `content_id` (uuid)
      - `content_type` (text) - post, comment, listing, message
      - `moderation_result` (text) - safe, review, block
      - `flagged_categories` (text[])
      - `confidence_scores` (jsonb)
      - `human_reviewed` (boolean)
      - `final_decision` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can view their own recommendations
    - Admins have full access to agent management
*/

-- AI Agents Table
CREATE TABLE IF NOT EXISTS ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  agent_type text NOT NULL CHECK (agent_type IN (
    'recommendation',
    'moderation',
    'pricing',
    'support',
    'matching',
    'forecasting'
  )),
  model text NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  performance_metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_agents_type ON ai_agents(agent_type);
CREATE INDEX idx_ai_agents_active ON ai_agents(is_active);

ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI agents"
  ON ai_agents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Anyone can view active agents"
  ON ai_agents FOR SELECT
  TO authenticated
  USING (is_active = true);

-- AI Agent Actions Table
CREATE TABLE IF NOT EXISTS ai_agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  input_data jsonb NOT NULL,
  output_data jsonb,
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  execution_time_ms integer,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_agent_actions_agent ON ai_agent_actions(agent_id);
CREATE INDEX idx_ai_agent_actions_type ON ai_agent_actions(action_type);
CREATE INDEX idx_ai_agent_actions_created ON ai_agent_actions(created_at DESC);
CREATE INDEX idx_ai_agent_actions_status ON ai_agent_actions(status);

ALTER TABLE ai_agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all agent actions"
  ON ai_agent_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- AI Recommendations Table
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL CHECK (recommendation_type IN (
    'provider',
    'service',
    'listing',
    'connection'
  )),
  recommended_item_id uuid NOT NULL,
  recommended_item_type text NOT NULL,
  reasoning text,
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  metadata jsonb DEFAULT '{}'::jsonb,
  is_accepted boolean,
  feedback text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_ai_recommendations_user ON ai_recommendations(user_id);
CREATE INDEX idx_ai_recommendations_type ON ai_recommendations(recommendation_type);
CREATE INDEX idx_ai_recommendations_expires ON ai_recommendations(expires_at);
CREATE INDEX idx_ai_recommendations_accepted ON ai_recommendations(is_accepted) WHERE is_accepted IS NOT NULL;

ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations"
  ON ai_recommendations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own recommendations"
  ON ai_recommendations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create recommendations"
  ON ai_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- AI Content Moderation Table
CREATE TABLE IF NOT EXISTS ai_content_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN (
    'post',
    'comment',
    'listing',
    'message',
    'review',
    'profile'
  )),
  moderation_result text NOT NULL CHECK (moderation_result IN (
    'safe',
    'review',
    'block',
    'warning'
  )),
  flagged_categories text[] DEFAULT ARRAY[]::text[],
  confidence_scores jsonb DEFAULT '{}'::jsonb,
  human_reviewed boolean DEFAULT false,
  human_reviewer_id uuid REFERENCES profiles(id),
  final_decision text,
  review_notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX idx_ai_moderation_content ON ai_content_moderation(content_id, content_type);
CREATE INDEX idx_ai_moderation_result ON ai_content_moderation(moderation_result);
CREATE INDEX idx_ai_moderation_human_reviewed ON ai_content_moderation(human_reviewed);
CREATE INDEX idx_ai_moderation_created ON ai_content_moderation(created_at DESC);

ALTER TABLE ai_content_moderation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all moderation results"
  ON ai_content_moderation FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Moderators can update moderation results"
  ON ai_content_moderation FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to get personalized recommendations
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
  user_id_param uuid,
  rec_type text DEFAULT NULL,
  limit_param integer DEFAULT 10
)
RETURNS TABLE(
  recommendation_id uuid,
  item_id uuid,
  item_type text,
  reasoning text,
  confidence numeric,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.id,
    ar.recommended_item_id,
    ar.recommended_item_type,
    ar.reasoning,
    ar.confidence_score,
    ar.metadata
  FROM ai_recommendations ar
  WHERE 
    ar.user_id = user_id_param
    AND ar.expires_at > now()
    AND (rec_type IS NULL OR ar.recommendation_type = rec_type)
    AND ar.is_accepted IS NULL
  ORDER BY ar.confidence_score DESC, ar.created_at DESC
  LIMIT limit_param;
END;
$$;

-- Function to log AI agent action
CREATE OR REPLACE FUNCTION log_ai_agent_action(
  agent_id_param uuid,
  action_type_param text,
  input_data_param jsonb,
  output_data_param jsonb DEFAULT NULL,
  confidence_param numeric DEFAULT NULL,
  execution_time_param integer DEFAULT NULL,
  status_param text DEFAULT 'success',
  error_param text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  action_id uuid;
BEGIN
  INSERT INTO ai_agent_actions (
    agent_id,
    action_type,
    input_data,
    output_data,
    confidence_score,
    execution_time_ms,
    status,
    error_message
  ) VALUES (
    agent_id_param,
    action_type_param,
    input_data_param,
    output_data_param,
    confidence_param,
    execution_time_param,
    status_param,
    error_param
  ) RETURNING id INTO action_id;
  
  RETURN action_id;
END;
$$;

-- Function to update agent performance metrics
CREATE OR REPLACE FUNCTION update_agent_performance_metrics(agent_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metrics jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_actions', COUNT(*),
    'success_rate', 
      ROUND((COUNT(*) FILTER (WHERE status = 'success')::numeric / NULLIF(COUNT(*), 0)) * 100, 2),
    'avg_execution_time_ms', 
      ROUND(AVG(execution_time_ms)),
    'avg_confidence_score',
      ROUND(AVG(confidence_score), 3),
    'last_updated', now()
  ) INTO metrics
  FROM ai_agent_actions
  WHERE agent_id = agent_id_param
    AND created_at > now() - interval '30 days';
  
  UPDATE ai_agents
  SET 
    performance_metrics = metrics,
    updated_at = now()
  WHERE id = agent_id_param;
END;
$$;

-- Seed default AI agents
INSERT INTO ai_agents (name, agent_type, model, configuration, is_active) VALUES
  ('Recommendation Engine', 'recommendation', 'ml-model-v1', '{"algorithm": "collaborative-filtering", "min_confidence": 0.6}', true),
  ('Content Moderator', 'moderation', 'content-safety-v1', '{"sensitivity": "medium", "auto_block_threshold": 0.9}', true),
  ('Dynamic Pricing', 'pricing', 'pricing-optimizer-v1', '{"factors": ["demand", "competition", "time"], "update_frequency": "hourly"}', true),
  ('Smart Matching', 'matching', 'matching-engine-v1', '{"weights": {"location": 0.3, "rating": 0.3, "price": 0.2, "availability": 0.2}}', true)
ON CONFLICT DO NOTHING;