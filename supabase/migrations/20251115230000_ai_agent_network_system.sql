/*
  # AI Agent Network System

  1. New Tables
    - `ai_tasks` - AI task queue and results
    - `ai_agents` - AI agent configurations
    - `ai_prompts` - Prompt templates management
    - `ai_audit_log` - AI usage audit trail
    - `ai_cost_tracking` - Cost monitoring
    - `ai_confidence_scores` - Confidence tracking
    - `ai_feedback` - Human feedback on AI results

  2. AI Agent Types
    - Listings AI (description enhancement, pricing)
    - Booking AI (feasibility, time optimization)
    - Custom Product AI (design analysis)
    - Moderation AI (content safety)
    - Fraud AI (risk scoring)
    - Safety AI (harassment, scam detection)
    - Dispute AI (resolution suggestions)
    - Recommendation AI (personalized)
    - Routing AI (delivery optimization)

  3. Security
    - Enable RLS on all tables
    - Admin and system access only

  4. Functions
    - Task queuing
    - Result processing
    - Cost calculation
*/

-- AI Agents Configuration
CREATE TABLE IF NOT EXISTS ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text UNIQUE NOT NULL,
  -- Types: listings, booking, custom_product, moderation, fraud, safety, dispute, recommendation, routing

  agent_name text NOT NULL,
  description text,

  -- Configuration
  ai_provider text NOT NULL, -- openai, anthropic, google, local
  model_name text NOT NULL, -- gpt-4, claude-3, gemini-pro
  temperature numeric(2, 1) DEFAULT 0.7,
  max_tokens integer DEFAULT 1000,

  -- Status
  is_active boolean DEFAULT true,
  is_production boolean DEFAULT false,

  -- Performance
  average_latency_ms integer,
  success_rate numeric(4, 2), -- 0-100
  total_invocations bigint DEFAULT 0,
  failed_invocations bigint DEFAULT 0,

  -- Cost
  cost_per_1k_tokens numeric(10, 6),
  total_cost_usd numeric(10, 2) DEFAULT 0,

  -- Metadata
  capabilities jsonb DEFAULT '{}',
  settings jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI Prompts Library
CREATE TABLE IF NOT EXISTS ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL REFERENCES ai_agents(agent_type),

  prompt_key text NOT NULL, -- e.g., 'enhance_description', 'check_feasibility'
  prompt_name text NOT NULL,
  prompt_template text NOT NULL,

  -- Version control
  version integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,

  -- Variables
  required_variables text[], -- e.g., ['listing_title', 'listing_description']
  optional_variables text[],

  -- Performance
  usage_count bigint DEFAULT 0,
  success_rate numeric(4, 2),
  average_confidence numeric(4, 2),

  -- Testing
  test_cases jsonb DEFAULT '[]',

  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(agent_type, prompt_key, version)
);

-- AI Tasks Queue
CREATE TABLE IF NOT EXISTS ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Task info
  agent_type text NOT NULL REFERENCES ai_agents(agent_type),
  prompt_key text NOT NULL,
  task_type text NOT NULL, -- enhance, analyze, moderate, predict, recommend

  -- Input
  input_data jsonb NOT NULL,
  context_data jsonb DEFAULT '{}',

  -- Output
  output_data jsonb,
  confidence_score numeric(4, 2), -- 0-100

  -- Status
  status text DEFAULT 'pending',
  -- Statuses: pending, processing, completed, failed, cancelled

  -- Processing
  started_at timestamptz,
  completed_at timestamptz,
  processing_time_ms integer,

  -- Error handling
  error_message text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,

  -- Cost
  tokens_used integer,
  cost_usd numeric(10, 6),

  -- Priority
  priority integer DEFAULT 5, -- 1 (highest) to 10 (lowest)

  -- User context
  user_id uuid REFERENCES profiles(id),
  related_entity_type text, -- listing, booking, user, etc.
  related_entity_id uuid,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now()
);

-- AI Audit Log
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  ai_task_id uuid REFERENCES ai_tasks(id) ON DELETE SET NULL,
  agent_type text NOT NULL,

  -- Action
  action_type text NOT NULL, -- invoked, completed, failed, reviewed, approved, rejected

  -- Actor
  actor_id uuid REFERENCES profiles(id),
  actor_type text, -- system, admin, user

  -- Details
  action_details jsonb,

  -- Request/Response
  request_data jsonb,
  response_data jsonb,

  -- Timing
  timestamp timestamptz DEFAULT now(),

  -- IP and security
  ip_address inet,
  user_agent text,

  created_at timestamptz DEFAULT now()
);

-- AI Cost Tracking
CREATE TABLE IF NOT EXISTS ai_cost_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  agent_type text NOT NULL REFERENCES ai_agents(agent_type),

  -- Time period
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  period_type text DEFAULT 'daily', -- hourly, daily, weekly, monthly

  -- Usage
  total_tasks integer DEFAULT 0,
  successful_tasks integer DEFAULT 0,
  failed_tasks integer DEFAULT 0,

  -- Tokens
  total_tokens_used bigint DEFAULT 0,
  input_tokens bigint DEFAULT 0,
  output_tokens bigint DEFAULT 0,

  -- Cost
  total_cost_usd numeric(10, 2) DEFAULT 0,

  -- Performance
  average_latency_ms integer,
  p95_latency_ms integer,
  p99_latency_ms integer,

  created_at timestamptz DEFAULT now(),

  UNIQUE(agent_type, period_start, period_type)
);

-- AI Confidence Scores
CREATE TABLE IF NOT EXISTS ai_confidence_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  ai_task_id uuid REFERENCES ai_tasks(id) ON DELETE CASCADE NOT NULL,

  -- Confidence metrics
  overall_confidence numeric(4, 2) NOT NULL, -- 0-100
  model_confidence numeric(4, 2),
  validation_score numeric(4, 2),

  -- Factors
  confidence_factors jsonb, -- breakdown of what contributed to score

  -- Thresholds
  threshold_met boolean,
  required_threshold numeric(4, 2),

  -- Validation
  requires_human_review boolean DEFAULT false,
  human_review_completed boolean DEFAULT false,
  human_reviewer_id uuid REFERENCES profiles(id),

  created_at timestamptz DEFAULT now()
);

-- AI Feedback
CREATE TABLE IF NOT EXISTS ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  ai_task_id uuid REFERENCES ai_tasks(id) ON DELETE CASCADE NOT NULL,

  -- Feedback
  feedback_type text NOT NULL, -- positive, negative, correction, neutral
  feedback_text text,

  -- Rating
  accuracy_rating integer, -- 1-5
  usefulness_rating integer, -- 1-5

  -- Corrections
  suggested_output jsonb,
  was_used boolean DEFAULT false,

  -- User
  user_id uuid REFERENCES profiles(id) NOT NULL,
  user_role text, -- customer, provider, admin

  -- Context
  context jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now()
);

-- AI Training Data (for model improvement)
CREATE TABLE IF NOT EXISTS ai_training_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  agent_type text NOT NULL REFERENCES ai_agents(agent_type),

  -- Training example
  input_example jsonb NOT NULL,
  expected_output jsonb NOT NULL,

  -- Source
  source_type text, -- human_feedback, verified_output, synthetic
  source_task_id uuid REFERENCES ai_tasks(id),

  -- Quality
  quality_score numeric(4, 2), -- 0-100
  verified_by uuid REFERENCES profiles(id),
  verified_at timestamptz,

  -- Usage
  is_active boolean DEFAULT true,
  times_used integer DEFAULT 0,

  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_agents_type ON ai_agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active ON ai_agents(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ai_prompts_agent ON ai_prompts(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_key ON ai_prompts(prompt_key);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_active ON ai_prompts(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ai_tasks_agent ON ai_tasks(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_priority ON ai_tasks(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_user ON ai_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_entity ON ai_tasks(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_created ON ai_tasks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_audit_agent ON ai_audit_log(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_audit_timestamp ON ai_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_task ON ai_audit_log(ai_task_id);

CREATE INDEX IF NOT EXISTS idx_ai_cost_agent ON ai_cost_tracking(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_cost_period ON ai_cost_tracking(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_ai_confidence_task ON ai_confidence_scores(ai_task_id);
CREATE INDEX IF NOT EXISTS idx_ai_confidence_review ON ai_confidence_scores(requires_human_review) WHERE requires_human_review = true;

CREATE INDEX IF NOT EXISTS idx_ai_feedback_task ON ai_feedback(ai_task_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_type ON ai_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user ON ai_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_training_agent ON ai_training_data(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_training_active ON ai_training_data(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_confidence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin and system only)
CREATE POLICY "Admins can view all AI agents"
  ON ai_agents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Users can view their own AI tasks"
  ON ai_tasks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Users can provide feedback on their AI tasks"
  ON ai_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own feedback"
  ON ai_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Function: Queue AI task
CREATE OR REPLACE FUNCTION queue_ai_task(
  agent_type_param text,
  prompt_key_param text,
  task_type_param text,
  input_data_param jsonb,
  user_id_param uuid DEFAULT NULL,
  priority_param integer DEFAULT 5,
  entity_type_param text DEFAULT NULL,
  entity_id_param uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  task_id uuid;
BEGIN
  -- Validate agent exists
  IF NOT EXISTS (SELECT 1 FROM ai_agents WHERE agent_type = agent_type_param AND is_active = true) THEN
    RAISE EXCEPTION 'AI agent % not found or inactive', agent_type_param;
  END IF;

  -- Create task
  INSERT INTO ai_tasks (
    agent_type,
    prompt_key,
    task_type,
    input_data,
    user_id,
    priority,
    related_entity_type,
    related_entity_id,
    status
  ) VALUES (
    agent_type_param,
    prompt_key_param,
    task_type_param,
    input_data_param,
    user_id_param,
    priority_param,
    entity_type_param,
    entity_id_param,
    'pending'
  )
  RETURNING id INTO task_id;

  RETURN task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Complete AI task
CREATE OR REPLACE FUNCTION complete_ai_task(
  task_id_param uuid,
  output_data_param jsonb,
  confidence_score_param numeric DEFAULT NULL,
  tokens_used_param integer DEFAULT NULL,
  cost_usd_param numeric DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  task_record record;
  processing_time integer;
BEGIN
  -- Get task
  SELECT * INTO task_record
  FROM ai_tasks
  WHERE id = task_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task % not found', task_id_param;
  END IF;

  -- Calculate processing time
  processing_time := EXTRACT(EPOCH FROM (now() - task_record.started_at)) * 1000;

  -- Update task
  UPDATE ai_tasks
  SET
    output_data = output_data_param,
    confidence_score = confidence_score_param,
    status = 'completed',
    completed_at = now(),
    processing_time_ms = processing_time,
    tokens_used = tokens_used_param,
    cost_usd = cost_usd_param
  WHERE id = task_id_param;

  -- Update agent stats
  UPDATE ai_agents
  SET
    total_invocations = total_invocations + 1,
    total_cost_usd = total_cost_usd + COALESCE(cost_usd_param, 0),
    updated_at = now()
  WHERE agent_type = task_record.agent_type;

  -- Log audit
  INSERT INTO ai_audit_log (
    ai_task_id,
    agent_type,
    action_type,
    actor_type,
    response_data
  ) VALUES (
    task_id_param,
    task_record.agent_type,
    'completed',
    'system',
    output_data_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Fail AI task
CREATE OR REPLACE FUNCTION fail_ai_task(
  task_id_param uuid,
  error_message_param text
)
RETURNS void AS $$
DECLARE
  task_record record;
BEGIN
  SELECT * INTO task_record
  FROM ai_tasks
  WHERE id = task_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task % not found', task_id_param;
  END IF;

  -- Check if should retry
  IF task_record.retry_count < task_record.max_retries THEN
    UPDATE ai_tasks
    SET
      status = 'pending',
      retry_count = retry_count + 1,
      error_message = error_message_param
    WHERE id = task_id_param;
  ELSE
    UPDATE ai_tasks
    SET
      status = 'failed',
      error_message = error_message_param,
      completed_at = now()
    WHERE id = task_id_param;

    -- Update agent failed count
    UPDATE ai_agents
    SET
      failed_invocations = failed_invocations + 1,
      updated_at = now()
    WHERE agent_type = task_record.agent_type;
  END IF;

  -- Log audit
  INSERT INTO ai_audit_log (
    ai_task_id,
    agent_type,
    action_type,
    actor_type,
    action_details
  ) VALUES (
    task_id_param,
    task_record.agent_type,
    'failed',
    'system',
    jsonb_build_object('error', error_message_param)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get next pending task (for worker processing)
CREATE OR REPLACE FUNCTION get_next_ai_task(agent_type_param text DEFAULT NULL)
RETURNS TABLE (
  task_id uuid,
  agent_type text,
  prompt_key text,
  task_type text,
  input_data jsonb,
  priority integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai_tasks.id,
    ai_tasks.agent_type,
    ai_tasks.prompt_key,
    ai_tasks.task_type,
    ai_tasks.input_data,
    ai_tasks.priority
  FROM ai_tasks
  WHERE
    ai_tasks.status = 'pending'
    AND (agent_type_param IS NULL OR ai_tasks.agent_type = agent_type_param)
  ORDER BY ai_tasks.priority ASC, ai_tasks.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION queue_ai_task TO authenticated;
GRANT EXECUTE ON FUNCTION complete_ai_task TO authenticated;
GRANT EXECUTE ON FUNCTION fail_ai_task TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_ai_task TO authenticated;

-- Seed AI agents
INSERT INTO ai_agents (agent_type, agent_name, description, ai_provider, model_name, cost_per_1k_tokens) VALUES
  ('listings', 'Listings AI', 'Enhances listing descriptions and suggests optimal pricing', 'openai', 'gpt-4', 0.03),
  ('booking', 'Booking AI', 'Validates booking feasibility and optimizes scheduling', 'openai', 'gpt-4', 0.03),
  ('custom_product', 'Custom Product AI', 'Analyzes design feasibility and provides production guidance', 'anthropic', 'claude-3-sonnet', 0.015),
  ('moderation', 'Moderation AI', 'Detects inappropriate content and policy violations', 'openai', 'gpt-4', 0.03),
  ('fraud', 'Fraud AI', 'Scores transaction risk and detects fraudulent patterns', 'openai', 'gpt-4', 0.03),
  ('safety', 'Safety AI', 'Identifies harassment, scams, and safety threats', 'anthropic', 'claude-3-sonnet', 0.015),
  ('dispute', 'Dispute AI', 'Generates dispute summaries and suggests resolutions', 'anthropic', 'claude-3-sonnet', 0.015),
  ('recommendation', 'Recommendation AI', 'Provides personalized listing recommendations', 'openai', 'gpt-3.5-turbo', 0.002),
  ('routing', 'Routing AI', 'Optimizes delivery routes and calculates ETAs', 'openai', 'gpt-3.5-turbo', 0.002)
ON CONFLICT (agent_type) DO NOTHING;

-- Seed common prompts
INSERT INTO ai_prompts (agent_type, prompt_key, prompt_name, prompt_template, required_variables) VALUES
  ('listings', 'enhance_description', 'Enhance Listing Description',
   'Improve the following service listing description. Make it more engaging, professional, and SEO-friendly while keeping the core information:\n\nTitle: {listing_title}\nDescription: {listing_description}\nCategory: {category}\n\nProvide an enhanced version that is clear, compelling, and under 500 words.',
   ARRAY['listing_title', 'listing_description', 'category']),

  ('listings', 'suggest_pricing', 'Suggest Optimal Pricing',
   'Based on the following listing details, suggest an optimal price range:\n\nService: {listing_title}\nDescription: {listing_description}\nCategory: {category}\nProvider Experience: {provider_experience} years\nLocation: {location}\n\nProvide a suggested price range with reasoning.',
   ARRAY['listing_title', 'listing_description', 'category', 'provider_experience', 'location']),

  ('booking', 'check_feasibility', 'Check Booking Feasibility',
   'Analyze if this booking request is realistic and feasible:\n\nService: {service_name}\nRequested Date: {booking_date}\nDuration: {duration} hours\nSpecial Requirements: {requirements}\nProvider Capacity: {provider_capacity}\n\nProvide a feasibility assessment with confidence score.',
   ARRAY['service_name', 'booking_date', 'duration', 'requirements', 'provider_capacity']),

  ('moderation', 'check_content_safety', 'Check Content Safety',
   'Review the following content for policy violations:\n\nContent Type: {content_type}\nContent: {content_text}\n\nCheck for: inappropriate language, harassment, scams, spam, illegal content.\nProvide a safety score (0-100) and list any violations found.',
   ARRAY['content_type', 'content_text']),

  ('fraud', 'score_transaction_risk', 'Score Transaction Risk',
   'Analyze this transaction for fraud risk:\n\nUser Account Age: {account_age_days} days\nTransaction Amount: ${amount}\nUser History: {user_history}\nTransaction Details: {transaction_details}\n\nProvide a risk score (0-100) where 0 is no risk and 100 is highest risk.',
   ARRAY['account_age_days', 'amount', 'user_history', 'transaction_details']),

  ('dispute', 'generate_summary', 'Generate Dispute Summary',
   'Summarize this dispute objectively:\n\nCustomer Claim: {customer_claim}\nProvider Response: {provider_response}\nEvidence: {evidence}\n\nProvide a neutral summary and suggest potential resolutions.',
   ARRAY['customer_claim', 'provider_response', 'evidence'])
ON CONFLICT (agent_type, prompt_key, version) DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE ai_agents IS 'AI agent configurations and performance tracking';
COMMENT ON TABLE ai_tasks IS 'AI task queue with input, output, and performance metrics';
COMMENT ON TABLE ai_prompts IS 'Versioned prompt templates for AI agents';
COMMENT ON TABLE ai_audit_log IS 'Complete audit trail of all AI operations';
COMMENT ON TABLE ai_cost_tracking IS 'Cost monitoring and usage analytics per agent';
