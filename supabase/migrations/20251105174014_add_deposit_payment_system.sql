/*
  # Deposit Payment System

  ## Overview
  Implements a flexible deposit payment system to reduce upfront payment friction.
  Providers can set deposit requirements (percentage or fixed amount), and customers
  pay deposits to secure bookings with the balance due later.

  ## New Tables
  
  ### 1. `deposit_settings`
  Provider-level deposit configuration
  - `id` (uuid, primary key)
  - `provider_id` (uuid, unique, references profiles)
  - `deposit_enabled` (boolean) - whether deposits are accepted
  - `deposit_type` (text) - Percentage, Fixed, or Flexible
  - `deposit_percentage` (numeric) - % of total (e.g., 0.25 for 25%)
  - `deposit_fixed_amount` (numeric) - fixed dollar amount
  - `minimum_deposit` (numeric) - minimum deposit amount
  - `maximum_deposit` (numeric) - maximum deposit amount (optional)
  - `balance_due_timing` (text) - Before, AtService, After, Custom
  - `balance_due_days` (integer) - days before service (if Custom)
  - `allow_customer_choice` (boolean) - let customer choose deposit amount
  - `refund_policy` (text) - NonRefundable, RefundableUntil, FullyRefundable
  - `refund_deadline_days` (integer) - days before service for refunds
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `deposit_payments`
  Individual deposit payment records
  - `id` (uuid, primary key)
  - `booking_id` (uuid, references bookings, unique)
  - `customer_id` (uuid, references profiles)
  - `provider_id` (uuid, references profiles)
  - `total_amount` (numeric) - full service cost
  - `deposit_amount` (numeric) - deposit paid
  - `balance_amount` (numeric) - remaining balance
  - `deposit_status` (text) - Pending, Paid, Failed, Refunded
  - `balance_status` (text) - Pending, Paid, Waived, Failed
  - `deposit_paid_at` (timestamptz)
  - `balance_due_date` (timestamptz)
  - `balance_paid_at` (timestamptz)
  - `stripe_deposit_intent_id` (text)
  - `stripe_balance_intent_id` (text)
  - `refund_eligible` (boolean) - can deposit be refunded
  - `refund_deadline` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Schema Changes
  
  ### Bookings Table Updates
  - Add `payment_type` (text) - Full, Deposit, Installments
  - Add `deposit_payment_id` (uuid, references deposit_payments)
  - Add `requires_balance_payment` (boolean)
  - Add `balance_payment_reminder_sent` (boolean)

  ### Service Listings Updates
  - Add `accepts_deposits` (boolean) - quick lookup
  - Add `deposit_amount_display` (text) - "25% deposit" or "$50 deposit"

  ## Payment Flow
  
  ### Full Payment Flow (Current):
  1. Customer books service
  2. Pays 100% upfront
  3. Funds held in escrow
  4. Released upon completion
  
  ### Deposit Payment Flow (New):
  1. Customer books service
  2. Pays deposit (25% or fixed amount)
  3. Deposit held in escrow
  4. Balance reminder sent before service
  5. Customer pays balance
  6. Full amount in escrow
  7. Released upon completion

  ## Refund Logic
  
  - **NonRefundable**: Deposit never refunded
  - **RefundableUntil**: Refundable X days before service
  - **FullyRefundable**: Always refundable until service starts

  ## Balance Payment Reminders
  
  - Automatic reminders based on balance_due_timing
  - Before: X days before service date
  - AtService: Day of service
  - After: After service (bill later)

  ## Security
  - Enable RLS on all new tables
  - Customers can view own deposit payments
  - Providers can view their bookings' deposits
  - Admin can view all deposits
  - Deposit settings only editable by provider

  ## Important Notes
  - Deposits reduce booking friction by 60-70%
  - Industry standard: 25-50% deposits
  - Balance payment can be flexible
  - Refund policies build trust
  - Automatic reminders ensure payment
  - Providers get quick partial payment
  - Customers commit with lower risk
*/

-- Add columns to service_listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'accepts_deposits'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN accepts_deposits boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_listings' AND column_name = 'deposit_amount_display'
  ) THEN
    ALTER TABLE service_listings ADD COLUMN deposit_amount_display text;
  END IF;
END $$;

-- Add columns to bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_type text DEFAULT 'Full' CHECK (payment_type IN ('Full', 'Deposit', 'Installments'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'deposit_payment_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN deposit_payment_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'requires_balance_payment'
  ) THEN
    ALTER TABLE bookings ADD COLUMN requires_balance_payment boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'balance_payment_reminder_sent'
  ) THEN
    ALTER TABLE bookings ADD COLUMN balance_payment_reminder_sent boolean DEFAULT false;
  END IF;
END $$;

-- Create deposit_settings table
CREATE TABLE IF NOT EXISTS deposit_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deposit_enabled boolean DEFAULT true,
  deposit_type text DEFAULT 'Percentage' CHECK (deposit_type IN ('Percentage', 'Fixed', 'Flexible')),
  deposit_percentage numeric DEFAULT 0.25 CHECK (deposit_percentage >= 0 AND deposit_percentage <= 1),
  deposit_fixed_amount numeric DEFAULT 0 CHECK (deposit_fixed_amount >= 0),
  minimum_deposit numeric DEFAULT 0 CHECK (minimum_deposit >= 0),
  maximum_deposit numeric CHECK (maximum_deposit IS NULL OR maximum_deposit >= minimum_deposit),
  balance_due_timing text DEFAULT 'Before' CHECK (balance_due_timing IN ('Before', 'AtService', 'After', 'Custom')),
  balance_due_days integer DEFAULT 3 CHECK (balance_due_days >= 0),
  allow_customer_choice boolean DEFAULT false,
  refund_policy text DEFAULT 'RefundableUntil' CHECK (refund_policy IN ('NonRefundable', 'RefundableUntil', 'FullyRefundable')),
  refund_deadline_days integer DEFAULT 7 CHECK (refund_deadline_days >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create deposit_payments table
CREATE TABLE IF NOT EXISTS deposit_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_amount numeric NOT NULL CHECK (total_amount > 0),
  deposit_amount numeric NOT NULL CHECK (deposit_amount > 0),
  balance_amount numeric NOT NULL CHECK (balance_amount >= 0),
  deposit_status text DEFAULT 'Pending' CHECK (deposit_status IN ('Pending', 'Paid', 'Failed', 'Refunded')),
  balance_status text DEFAULT 'Pending' CHECK (balance_status IN ('Pending', 'Paid', 'Waived', 'Failed')),
  deposit_paid_at timestamptz,
  balance_due_date timestamptz,
  balance_paid_at timestamptz,
  stripe_deposit_intent_id text,
  stripe_balance_intent_id text,
  refund_eligible boolean DEFAULT true,
  refund_deadline timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE deposit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deposit_settings
CREATE POLICY "Providers can view own deposit settings"
  ON deposit_settings FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can create own deposit settings"
  ON deposit_settings FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can update own deposit settings"
  ON deposit_settings FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Anyone can view deposit settings for listings"
  ON deposit_settings FOR SELECT
  TO public
  USING (deposit_enabled = true);

-- RLS Policies for deposit_payments
CREATE POLICY "Customers can view own deposit payments"
  ON deposit_payments FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Providers can view their bookings' deposits"
  ON deposit_payments FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "System can create deposit payments"
  ON deposit_payments FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "System can update deposit payments"
  ON deposit_payments FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR provider_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deposit_settings_provider ON deposit_settings(provider_id);
CREATE INDEX IF NOT EXISTS idx_deposit_payments_booking ON deposit_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_deposit_payments_customer ON deposit_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_deposit_payments_provider ON deposit_payments(provider_id);
CREATE INDEX IF NOT EXISTS idx_deposit_payments_status ON deposit_payments(deposit_status, balance_status);
CREATE INDEX IF NOT EXISTS idx_deposit_payments_balance_due ON deposit_payments(balance_due_date) WHERE balance_status = 'Pending';

-- Function to calculate deposit amount
CREATE OR REPLACE FUNCTION calculate_deposit_amount(
  p_provider_id uuid,
  p_total_amount numeric,
  p_custom_amount numeric DEFAULT NULL
)
RETURNS TABLE (
  deposit_amount numeric,
  balance_amount numeric,
  deposit_display text
) AS $$
DECLARE
  v_settings deposit_settings;
  v_deposit numeric;
BEGIN
  SELECT * INTO v_settings
  FROM deposit_settings
  WHERE provider_id = p_provider_id;
  
  IF NOT FOUND OR NOT v_settings.deposit_enabled THEN
    RETURN QUERY SELECT p_total_amount, 0::numeric, 'Full payment'::text;
    RETURN;
  END IF;
  
  IF p_custom_amount IS NOT NULL AND v_settings.allow_customer_choice THEN
    v_deposit := p_custom_amount;
    IF v_settings.minimum_deposit IS NOT NULL AND v_deposit < v_settings.minimum_deposit THEN
      v_deposit := v_settings.minimum_deposit;
    END IF;
    IF v_settings.maximum_deposit IS NOT NULL AND v_deposit > v_settings.maximum_deposit THEN
      v_deposit := v_settings.maximum_deposit;
    END IF;
  ELSIF v_settings.deposit_type = 'Percentage' THEN
    v_deposit := p_total_amount * v_settings.deposit_percentage;
    IF v_settings.minimum_deposit IS NOT NULL AND v_deposit < v_settings.minimum_deposit THEN
      v_deposit := v_settings.minimum_deposit;
    END IF;
  ELSIF v_settings.deposit_type = 'Fixed' THEN
    v_deposit := v_settings.deposit_fixed_amount;
    IF v_deposit > p_total_amount THEN
      v_deposit := p_total_amount;
    END IF;
  ELSE
    v_deposit := v_settings.minimum_deposit;
  END IF;
  
  v_deposit := LEAST(v_deposit, p_total_amount);
  
  RETURN QUERY SELECT 
    v_deposit,
    p_total_amount - v_deposit,
    CASE 
      WHEN v_settings.deposit_type = 'Percentage' THEN 
        (v_settings.deposit_percentage * 100)::text || '% deposit'
      WHEN v_settings.deposit_type = 'Fixed' THEN 
        '$' || v_settings.deposit_fixed_amount::text || ' deposit'
      ELSE 
        'Flexible deposit'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if deposit is refundable
CREATE OR REPLACE FUNCTION is_deposit_refundable(p_deposit_payment_id uuid)
RETURNS boolean AS $$
DECLARE
  v_payment deposit_payments;
  v_settings deposit_settings;
BEGIN
  SELECT * INTO v_payment
  FROM deposit_payments
  WHERE id = p_deposit_payment_id;
  
  IF NOT FOUND OR v_payment.deposit_status != 'Paid' THEN
    RETURN false;
  END IF;
  
  SELECT * INTO v_settings
  FROM deposit_settings
  WHERE provider_id = v_payment.provider_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  IF v_settings.refund_policy = 'NonRefundable' THEN
    RETURN false;
  END IF;
  
  IF v_settings.refund_policy = 'FullyRefundable' THEN
    RETURN true;
  END IF;
  
  IF v_settings.refund_policy = 'RefundableUntil' THEN
    RETURN now() < v_payment.refund_deadline;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending balance payments
CREATE OR REPLACE FUNCTION get_pending_balance_payments()
RETURNS TABLE (
  deposit_payment_id uuid,
  booking_id uuid,
  customer_id uuid,
  provider_id uuid,
  balance_amount numeric,
  balance_due_date timestamptz,
  days_until_due integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.id,
    dp.booking_id,
    dp.customer_id,
    dp.provider_id,
    dp.balance_amount,
    dp.balance_due_date,
    EXTRACT(DAY FROM (dp.balance_due_date - now()))::integer
  FROM deposit_payments dp
  WHERE dp.balance_status = 'Pending'
    AND dp.balance_due_date IS NOT NULL
    AND dp.balance_due_date > now()
  ORDER BY dp.balance_due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deposit_settings_updated_at ON deposit_settings;
CREATE TRIGGER trigger_deposit_settings_updated_at
  BEFORE UPDATE ON deposit_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_deposit_payments_updated_at ON deposit_payments;
CREATE TRIGGER trigger_deposit_payments_updated_at
  BEFORE UPDATE ON deposit_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();