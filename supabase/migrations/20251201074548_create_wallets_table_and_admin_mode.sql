/*
  # Create Wallets Table and Add Admin Mode Column

  1. New Tables
    - `wallets` - User wallet for balance management

  2. Changes
    - Add `admin_mode` column to profiles table

  3. Security
    - Enable RLS on wallets table
    - Users can only access their own wallet
*/

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance numeric DEFAULT 0 CHECK (balance >= 0),
  pending_balance numeric DEFAULT 0 CHECK (pending_balance >= 0),
  total_earned numeric DEFAULT 0 CHECK (total_earned >= 0),
  total_paid_out numeric DEFAULT 0 CHECK (total_paid_out >= 0),
  currency text DEFAULT 'USD',
  stripe_account_id text,
  stripe_account_status text,
  payout_enabled boolean DEFAULT false,
  minimum_payout_amount numeric DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Add admin_mode column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'admin_mode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN admin_mode boolean DEFAULT false;
  END IF;
END $$;

-- Enable RLS on wallets
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Policies for wallets
CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet"
  ON wallets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_stripe_account_id ON wallets(stripe_account_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to get or create wallet
CREATE OR REPLACE FUNCTION get_or_create_wallet(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  balance numeric,
  pending_balance numeric,
  total_earned numeric,
  total_paid_out numeric,
  currency text,
  stripe_account_id text,
  stripe_account_status text,
  payout_enabled boolean,
  minimum_payout_amount numeric,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  -- Try to get existing wallet
  RETURN QUERY
  SELECT w.*
  FROM wallets w
  WHERE w.user_id = p_user_id;

  -- If no wallet found, create one
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id)
    VALUES (p_user_id)
    RETURNING * INTO id, user_id, balance, pending_balance, total_earned, 
              total_paid_out, currency, stripe_account_id, stripe_account_status,
              payout_enabled, minimum_payout_amount, created_at, updated_at;
    
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;