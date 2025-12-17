/*
  # Add Payout Settings to Wallets

  1. Changes
    - Add automatic payout settings to wallets table
    - Add minimum payout threshold
    - Add payout schedule preferences
    - Add notification settings

  2. New Columns
    - `auto_payout_enabled` (boolean) - Enable automatic payouts
    - `auto_payout_threshold` (numeric) - Minimum balance for auto payout
    - `auto_payout_schedule` (text) - Schedule: Daily, Weekly, Monthly
    - `payout_day_of_week` (integer) - For weekly: 0-6 (Sunday-Saturday)
    - `payout_day_of_month` (integer) - For monthly: 1-31
    - `minimum_payout_amount` (numeric) - Minimum manual payout amount
    - `payout_notifications_enabled` (boolean) - Email notifications
*/

-- Add payout settings columns to wallets table
DO $$ 
BEGIN
  -- Auto payout enabled flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallets' AND column_name = 'auto_payout_enabled'
  ) THEN
    ALTER TABLE wallets ADD COLUMN auto_payout_enabled boolean DEFAULT false;
  END IF;

  -- Auto payout threshold (minimum balance to trigger auto payout)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallets' AND column_name = 'auto_payout_threshold'
  ) THEN
    ALTER TABLE wallets ADD COLUMN auto_payout_threshold numeric(10, 2) DEFAULT 100.00 CHECK (auto_payout_threshold >= 10);
  END IF;

  -- Auto payout schedule
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallets' AND column_name = 'auto_payout_schedule'
  ) THEN
    ALTER TABLE wallets ADD COLUMN auto_payout_schedule text DEFAULT 'Weekly' CHECK (auto_payout_schedule IN ('Daily', 'Weekly', 'Monthly'));
  END IF;

  -- Payout day of week (0-6, Sunday-Saturday)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallets' AND column_name = 'payout_day_of_week'
  ) THEN
    ALTER TABLE wallets ADD COLUMN payout_day_of_week integer DEFAULT 1 CHECK (payout_day_of_week >= 0 AND payout_day_of_week <= 6);
  END IF;

  -- Payout day of month (1-31)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallets' AND column_name = 'payout_day_of_month'
  ) THEN
    ALTER TABLE wallets ADD COLUMN payout_day_of_month integer DEFAULT 1 CHECK (payout_day_of_month >= 1 AND payout_day_of_month <= 31);
  END IF;

  -- Minimum payout amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallets' AND column_name = 'minimum_payout_amount'
  ) THEN
    ALTER TABLE wallets ADD COLUMN minimum_payout_amount numeric(10, 2) DEFAULT 10.00 CHECK (minimum_payout_amount >= 10);
  END IF;

  -- Payout notifications enabled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallets' AND column_name = 'payout_notifications_enabled'
  ) THEN
    ALTER TABLE wallets ADD COLUMN payout_notifications_enabled boolean DEFAULT true;
  END IF;

  -- Last auto payout date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallets' AND column_name = 'last_auto_payout_at'
  ) THEN
    ALTER TABLE wallets ADD COLUMN last_auto_payout_at timestamptz;
  END IF;
END $$;

-- Create index for auto payout processing
CREATE INDEX IF NOT EXISTS idx_wallets_auto_payout ON wallets(auto_payout_enabled, auto_payout_schedule) WHERE auto_payout_enabled = true;
