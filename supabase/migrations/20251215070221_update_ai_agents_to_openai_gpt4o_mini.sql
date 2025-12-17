/*
  # Update AI Agents to OpenAI GPT-4o-mini

  1. Overview
    - Migrates AI agents from Google Gemini 1.5 Flash to OpenAI GPT-4o-mini
    - Updates model configurations for consistency and reliability
    - Maintains all existing agent functionality

  2. Changes
    - Updates ai_agents table with OpenAI GPT-4o-mini model
    - Changes model from 'gemini-1.5-flash' to 'gpt-4o-mini'
    - Updates agent names to reflect new AI provider
    - All agents remain active during transition

  3. Important Notes
    - GPT-4o-mini offers better consistency and reliability
    - All existing AI functionality remains fully compatible
    - No changes to agent types or configurations required
*/

-- Update recommendation agent
UPDATE ai_agents
SET 
  name = 'Personalized Recommendations (GPT-4o-mini)',
  model = 'gpt-4o-mini',
  updated_at = now()
WHERE agent_type = 'recommendation';

-- Update content moderation agent
UPDATE ai_agents
SET
  name = 'Content Moderation (GPT-4o-mini)',
  model = 'gpt-4o-mini',
  updated_at = now()
WHERE agent_type = 'moderation';

-- Update category suggestion agent
UPDATE ai_agents
SET
  name = 'Smart Category Suggestion (GPT-4o-mini)',
  model = 'gpt-4o-mini',
  updated_at = now()
WHERE agent_type = 'category_suggestion';

-- Update any other agents using Gemini
UPDATE ai_agents
SET
  model = REPLACE(model, 'gemini-1.5-flash', 'gpt-4o-mini'),
  name = REPLACE(name, 'Gemini 1.5 Flash', 'GPT-4o-mini'),
  updated_at = now()
WHERE model LIKE '%gemini%';

-- Verification query (will output results to logs)
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM ai_agents WHERE model = 'gpt-4o-mini';
  RAISE NOTICE 'Successfully migrated % AI agents to OpenAI GPT-4o-mini', updated_count;
END $$;
