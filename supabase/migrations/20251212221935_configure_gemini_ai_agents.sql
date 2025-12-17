/*
  # Configure Google Gemini 1.5 Flash AI Agents

  1. Configuration
    - Updates AI agents to use Google Gemini 1.5 Flash
    - Adds category_suggestion agent type
    - Configures moderation agent
    - Configures recommendation agent
    - Sets pricing and performance baselines

  2. Changes
    - Extends agent_type constraint to include category_suggestion
    - Updates ai_agents table with Gemini configurations
    - Sets appropriate temperature and token limits in configuration
    - Configures cost tracking function

  3. Notes
    - Gemini 1.5 Flash pricing: ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens
    - Average cost per 1k tokens: ~$0.0002
*/

-- Drop and recreate check constraint to add category_suggestion
ALTER TABLE ai_agents DROP CONSTRAINT IF EXISTS ai_agents_agent_type_check;

ALTER TABLE ai_agents ADD CONSTRAINT ai_agents_agent_type_check
CHECK (agent_type = ANY (ARRAY['recommendation'::text, 'moderation'::text, 'pricing'::text, 'support'::text, 'matching'::text, 'forecasting'::text, 'category_suggestion'::text]));

-- Update existing recommendation agent to use Gemini
UPDATE ai_agents
SET
  name = 'Personalized Recommendations (Gemini 1.5 Flash)',
  model = 'gemini-1.5-flash',
  is_active = true,
  configuration = '{
    "ai_provider": "google",
    "temperature": 0.7,
    "max_tokens": 1500,
    "cost_per_1k_tokens": 0.0002,
    "capabilities": {
      "data_sources": ["search_history", "bookings", "saved_listings"],
      "recommendation_types": ["listings", "providers", "services"]
    },
    "settings": {
      "max_recommendations": 10,
      "min_confidence": 0.3,
      "diversity_factor": 0.3
    }
  }'::jsonb,
  performance_metrics = COALESCE(performance_metrics, '{}'::jsonb) || '{
    "total_invocations": 0,
    "successful_invocations": 0,
    "failed_invocations": 0,
    "total_cost_usd": 0,
    "average_latency_ms": 0
  }'::jsonb,
  updated_at = now()
WHERE agent_type = 'recommendation';

-- Insert or update moderation agent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ai_agents WHERE agent_type = 'moderation') THEN
    INSERT INTO ai_agents (
      agent_type,
      name,
      model,
      is_active,
      configuration,
      performance_metrics
    ) VALUES (
      'moderation',
      'Content Moderation (Gemini 1.5 Flash)',
      'gemini-1.5-flash',
      true,
      '{
        "ai_provider": "google",
        "temperature": 0.3,
        "max_tokens": 500,
        "cost_per_1k_tokens": 0.0002,
        "capabilities": {
          "categories": ["spam", "harassment", "hate_speech", "violence", "adult_content", "misinformation"],
          "languages": ["en"],
          "response_format": "json"
        },
        "settings": {
          "confidence_threshold": 0.5,
          "auto_block_threshold": 0.8,
          "require_human_review": true
        }
      }'::jsonb,
      '{
        "total_invocations": 0,
        "successful_invocations": 0,
        "failed_invocations": 0,
        "total_cost_usd": 0,
        "average_latency_ms": 0
      }'::jsonb
    );
  ELSE
    UPDATE ai_agents
    SET
      name = 'Content Moderation (Gemini 1.5 Flash)',
      model = 'gemini-1.5-flash',
      is_active = true,
      configuration = '{
        "ai_provider": "google",
        "temperature": 0.3,
        "max_tokens": 500,
        "cost_per_1k_tokens": 0.0002,
        "capabilities": {
          "categories": ["spam", "harassment", "hate_speech", "violence", "adult_content", "misinformation"],
          "languages": ["en"],
          "response_format": "json"
        },
        "settings": {
          "confidence_threshold": 0.5,
          "auto_block_threshold": 0.8,
          "require_human_review": true
        }
      }'::jsonb,
      updated_at = now()
    WHERE agent_type = 'moderation';
  END IF;
END $$;

-- Insert or update category suggestion agent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ai_agents WHERE agent_type = 'category_suggestion') THEN
    INSERT INTO ai_agents (
      agent_type,
      name,
      model,
      is_active,
      configuration,
      performance_metrics
    ) VALUES (
      'category_suggestion',
      'Smart Category Suggestion (Gemini 1.5 Flash)',
      'gemini-1.5-flash',
      true,
      '{
        "ai_provider": "google",
        "temperature": 0.5,
        "max_tokens": 800,
        "cost_per_1k_tokens": 0.0002,
        "capabilities": {
          "input_types": ["title", "description"],
          "output_format": "structured_json",
          "languages": ["en"]
        },
        "settings": {
          "confidence_threshold": 0.4,
          "max_alternatives": 3
        }
      }'::jsonb,
      '{
        "total_invocations": 0,
        "successful_invocations": 0,
        "failed_invocations": 0,
        "total_cost_usd": 0,
        "average_latency_ms": 0
      }'::jsonb
    );
  ELSE
    UPDATE ai_agents
    SET
      name = 'Smart Category Suggestion (Gemini 1.5 Flash)',
      model = 'gemini-1.5-flash',
      is_active = true,
      configuration = '{
        "ai_provider": "google",
        "temperature": 0.5,
        "max_tokens": 800,
        "cost_per_1k_tokens": 0.0002,
        "capabilities": {
          "input_types": ["title", "description"],
          "output_format": "structured_json",
          "languages": ["en"]
        },
        "settings": {
          "confidence_threshold": 0.4,
          "max_alternatives": 3
        }
      }'::jsonb,
      updated_at = now()
    WHERE agent_type = 'category_suggestion';
  END IF;
END $$;

-- Create function to track AI costs
CREATE OR REPLACE FUNCTION track_ai_cost(
  agent_id_param uuid,
  tokens_used_param integer
)
RETURNS void AS $$
DECLARE
  cost_per_1k numeric;
  cost_amount numeric;
  current_metrics jsonb;
BEGIN
  SELECT 
    (configuration->>'cost_per_1k_tokens')::numeric,
    COALESCE(performance_metrics, '{}'::jsonb)
  INTO cost_per_1k, current_metrics
  FROM ai_agents
  WHERE id = agent_id_param;

  IF cost_per_1k IS NOT NULL THEN
    cost_amount := (tokens_used_param::numeric / 1000) * cost_per_1k;

    UPDATE ai_agents
    SET
      performance_metrics = jsonb_set(
        jsonb_set(
          current_metrics,
          '{total_cost_usd}',
          to_jsonb((COALESCE((current_metrics->>'total_cost_usd')::numeric, 0) + cost_amount))
        ),
        '{total_invocations}',
        to_jsonb((COALESCE((current_metrics->>'total_invocations')::integer, 0) + 1))
      ),
      updated_at = now()
    WHERE id = agent_id_param;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION track_ai_cost IS 'Tracks AI usage costs and invocations for budget monitoring';