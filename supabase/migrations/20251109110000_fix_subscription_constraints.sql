/*
  # Fix Subscription System Critical Issues

  1. Changes
    - Remove problematic UNIQUE(user_id, status) constraint
    - Add partial unique index for active/trialing subscriptions
    - Prevents multiple active subscriptions per user
    - Allows proper subscription state transitions

  2. Reasoning
    - Original constraint caused issues during:
      - Upgrades/downgrades (two Active subscriptions briefly)
      - Trial to Active transitions
      - Reactivation flows
    - New partial index only enforces uniqueness for active states
*/

-- Drop the problematic UNIQUE constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_subscriptions_user_id_status_key'
  ) THEN
    ALTER TABLE user_subscriptions
    DROP CONSTRAINT user_subscriptions_user_id_status_key;
  END IF;
END $$;

-- Create partial unique index to prevent multiple active subscriptions
-- Only enforces uniqueness when status is Active or Trialing
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_subscription_per_user
  ON user_subscriptions(user_id)
  WHERE status IN ('Active', 'Trialing');

-- Add comment explaining the index
COMMENT ON INDEX idx_one_active_subscription_per_user IS
  'Ensures user can only have one active or trialing subscription at a time, while allowing multiple cancelled/expired subscriptions';
