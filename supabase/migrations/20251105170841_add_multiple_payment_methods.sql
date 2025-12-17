/*
  # Add Multiple Payment Methods Support

  ## Overview
  Extends the payment system to support multiple payment methods including
  credit cards (Stripe), PayPal, Apple Pay, and Google Pay. Updates schema
  to track payment method preferences and transaction details.

  ## Schema Changes
  
  ### Bookings Table Updates
  - Add `payment_method` (text) - card, paypal, apple_pay, google_pay
  - Add `payment_method_details` (jsonb) - additional payment info
  
  ### Wallet Transactions Updates
  - Update `payment_method` to support new methods
  
  ### New Table: payment_methods
  Stores saved payment methods for users
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `payment_type` (text) - card, paypal, apple_pay, google_pay
  - `is_default` (boolean) - default payment method
  - `stripe_payment_method_id` (text) - Stripe PM ID
  - `paypal_email` (text) - PayPal account email
  - `card_last4` (text) - last 4 digits of card
  - `card_brand` (text) - visa, mastercard, amex, etc.
  - `card_exp_month` (integer) - expiration month
  - `card_exp_year` (integer) - expiration year
  - `metadata` (jsonb) - additional payment method data
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Payment Methods
  
  ### Credit/Debit Cards (Stripe)
  - Uses Stripe Payment Methods API
  - Supports all major card brands
  - 3D Secure authentication
  - Save for future use
  
  ### PayPal
  - Uses Stripe's PayPal integration
  - One-click checkout
  - Buyer protection
  
  ### Apple Pay
  - Native Apple Pay integration via Stripe
  - Face ID / Touch ID authentication
  - One-tap payment
  - iOS/macOS only
  
  ### Google Pay
  - Native Google Pay integration via Stripe
  - Fingerprint / PIN authentication
  - One-tap payment
  - Android only

  ## Security
  - Enable RLS on payment_methods table
  - Users can only view/manage their own payment methods
  - Never store raw card numbers or CVV
  - All sensitive data handled by Stripe
  - Payment method tokens encrypted at rest

  ## Important Notes
  - Stripe handles all payment method tokenization
  - PayPal processed through Stripe's PayPal integration
  - Apple Pay requires domain verification
  - Google Pay requires merchant registration
  - Default payment method used for quick checkout
  - Users can save multiple payment methods
*/

-- Add payment_method columns to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_method text DEFAULT 'card';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_method_details'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_method_details jsonb DEFAULT '{}';
  END IF;
END $$;

-- Update wallet_transactions payment_method to be more flexible
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wallet_transactions' 
    AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE wallet_transactions 
    ALTER COLUMN payment_method DROP DEFAULT;
    
    -- Remove constraint if it exists
    ALTER TABLE wallet_transactions 
    DROP CONSTRAINT IF EXISTS wallet_transactions_payment_method_check;
  END IF;
END $$;

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('card', 'paypal', 'apple_pay', 'google_pay')),
  is_default boolean DEFAULT false,
  stripe_payment_method_id text,
  paypal_email text,
  card_last4 text,
  card_brand text,
  card_exp_month integer,
  card_exp_year integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_methods
CREATE POLICY "Users can view own payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own payment methods"
  ON payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own payment methods"
  ON payment_methods FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own payment methods"
  ON payment_methods FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(payment_type);

-- Function to ensure only one default payment method per user
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE payment_methods
    SET is_default = false
    WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to ensure single default payment method
DROP TRIGGER IF EXISTS trigger_ensure_single_default_payment_method ON payment_methods;
CREATE TRIGGER trigger_ensure_single_default_payment_method
  BEFORE INSERT OR UPDATE ON payment_methods
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_payment_method();

-- Function to auto-set first payment method as default
CREATE OR REPLACE FUNCTION auto_set_first_payment_default()
RETURNS TRIGGER AS $$
DECLARE
  existing_count integer;
BEGIN
  SELECT COUNT(*) INTO existing_count
  FROM payment_methods
  WHERE user_id = NEW.user_id;
  
  IF existing_count = 0 THEN
    NEW.is_default := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-set first payment as default
DROP TRIGGER IF EXISTS trigger_auto_set_first_payment_default ON payment_methods;
CREATE TRIGGER trigger_auto_set_first_payment_default
  BEFORE INSERT ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_first_payment_default();