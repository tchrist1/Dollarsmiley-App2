/*
  # Add Payout Settings to Wallets Table

  1. Changes
    - Add `payout_email` column to store preferred payout email
    - Add `payout_method` column to store preferred payout method (stripe, paypal, bank, etc.)
  
  2. Details
    - Both columns are optional (nullable)
    - No default values - users must configure these explicitly
    - Used for payment settings and payout requests
  
  3. Security
    - Existing RLS policies on wallets table continue to apply
    - Only wallet owner can view/update their payout settings
*/

-- Add payout settings columns to wallets table
DO $$
BEGIN
  -- Add payout_email if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wallets'
      AND column_name = 'payout_email'
  ) THEN
    ALTER TABLE wallets ADD COLUMN payout_email text;
  END IF;

  -- Add payout_method if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wallets'
      AND column_name = 'payout_method'
  ) THEN
    ALTER TABLE wallets ADD COLUMN payout_method text;
  END IF;
END $$;
