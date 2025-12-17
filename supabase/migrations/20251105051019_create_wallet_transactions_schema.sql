/*
  # Wallet & Transactions System

  1. New Tables
    - `wallets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles, unique)
      - `available_balance` (numeric)
      - `pending_balance` (numeric)
      - `total_earned` (numeric)
      - `total_withdrawn` (numeric)
      - `currency` (text, default 'USD')
      - `payout_email` (text)
      - `payout_method` (text: 'BankTransfer', 'PayPal', 'Stripe')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `transactions`
      - `id` (uuid, primary key)
      - `wallet_id` (uuid, references wallets)
      - `booking_id` (uuid, references bookings)
      - `transaction_type` (text: 'Earning', 'Payout', 'Refund', 'Fee', 'Adjustment')
      - `amount` (numeric)
      - `status` (text: 'Pending', 'Completed', 'Failed', 'Cancelled')
      - `description` (text)
      - `reference_id` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `completed_at` (timestamptz)

    - `payout_requests`
      - `id` (uuid, primary key)
      - `wallet_id` (uuid, references wallets)
      - `amount` (numeric)
      - `status` (text: 'Pending', 'Processing', 'Completed', 'Failed', 'Cancelled')
      - `payout_method` (text)
      - `payout_details` (jsonb)
      - `requested_at` (timestamptz)
      - `processed_at` (timestamptz)
      - `failure_reason` (text)
      - `admin_notes` (text)

    - `tax_documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `tax_year` (integer)
      - `document_type` (text: '1099', 'Summary', 'Receipt')
      - `total_earnings` (numeric)
      - `total_fees` (numeric)
      - `document_url` (text)
      - `generated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own financial data

  3. Indexes
    - Add indexes for efficient querying
*/

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  available_balance numeric(10, 2) DEFAULT 0.00 CHECK (available_balance >= 0),
  pending_balance numeric(10, 2) DEFAULT 0.00 CHECK (pending_balance >= 0),
  total_earned numeric(10, 2) DEFAULT 0.00 CHECK (total_earned >= 0),
  total_withdrawn numeric(10, 2) DEFAULT 0.00 CHECK (total_withdrawn >= 0),
  currency text DEFAULT 'USD',
  payout_email text,
  payout_method text CHECK (payout_method IN ('BankTransfer', 'PayPal', 'Stripe', null)),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('Earning', 'Payout', 'Refund', 'Fee', 'Adjustment')),
  amount numeric(10, 2) NOT NULL,
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Failed', 'Cancelled')),
  description text NOT NULL,
  reference_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create payout_requests table
CREATE TABLE IF NOT EXISTS payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled')),
  payout_method text NOT NULL,
  payout_details jsonb DEFAULT '{}'::jsonb,
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  failure_reason text,
  admin_notes text
);

-- Create tax_documents table
CREATE TABLE IF NOT EXISTS tax_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tax_year integer NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('1099', 'Summary', 'Receipt')),
  total_earnings numeric(10, 2) NOT NULL DEFAULT 0.00,
  total_fees numeric(10, 2) NOT NULL DEFAULT 0.00,
  document_url text,
  generated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_booking_id ON transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_wallet_id ON payout_requests(wallet_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_tax_documents_user_id ON tax_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_documents_tax_year ON tax_documents(tax_year);

-- Enable RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallets
CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    wallet_id IN (
      SELECT id FROM wallets WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for payout_requests
CREATE POLICY "Users can view own payout requests"
  ON payout_requests FOR SELECT
  TO authenticated
  USING (
    wallet_id IN (
      SELECT id FROM wallets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own payout requests"
  ON payout_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    wallet_id IN (
      SELECT id FROM wallets WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for tax_documents
CREATE POLICY "Users can view own tax documents"
  ON tax_documents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
    IF NEW.transaction_type = 'Earning' THEN
      UPDATE wallets
      SET 
        available_balance = available_balance + NEW.amount,
        total_earned = total_earned + NEW.amount,
        updated_at = now()
      WHERE id = NEW.wallet_id;
    ELSIF NEW.transaction_type = 'Payout' THEN
      UPDATE wallets
      SET 
        available_balance = available_balance - NEW.amount,
        total_withdrawn = total_withdrawn + NEW.amount,
        updated_at = now()
      WHERE id = NEW.wallet_id;
    ELSIF NEW.transaction_type = 'Refund' THEN
      UPDATE wallets
      SET 
        available_balance = available_balance - NEW.amount,
        updated_at = now()
      WHERE id = NEW.wallet_id;
    ELSIF NEW.transaction_type = 'Fee' THEN
      UPDATE wallets
      SET 
        available_balance = available_balance - NEW.amount,
        updated_at = now()
      WHERE id = NEW.wallet_id;
    END IF;
    
    NEW.completed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update wallet on transaction status change
DROP TRIGGER IF EXISTS update_wallet_on_transaction_complete ON transactions;
CREATE TRIGGER update_wallet_on_transaction_complete
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION update_wallet_balance();

-- Function to create wallet for new users
CREATE OR REPLACE FUNCTION create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id, currency)
  VALUES (NEW.id, 'USD')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create wallet for new profiles
DROP TRIGGER IF EXISTS create_wallet_on_profile_create ON profiles;
CREATE TRIGGER create_wallet_on_profile_create
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_user();

-- Create wallets for existing profiles
INSERT INTO wallets (user_id, currency)
SELECT id, 'USD'
FROM profiles
WHERE id NOT IN (SELECT user_id FROM wallets)
ON CONFLICT (user_id) DO NOTHING;
