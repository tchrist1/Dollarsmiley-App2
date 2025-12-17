/*
  # Stripe Payment System

  1. New Tables
    - `stripe_customers` - Link users to Stripe customers
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `stripe_customer_id` (text, unique)
      - `default_payment_method` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `stripe_payment_intents` - Track payment intents
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `stripe_payment_intent_id` (text, unique)
      - `amount` (numeric)
      - `currency` (text)
      - `status` (text)
      - `booking_id` (uuid, references bookings)
      - `production_order_id` (uuid, references production_orders)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
    
    - `stripe_charges` - Track successful charges
      - `id` (uuid, primary key)
      - `payment_intent_id` (uuid, references stripe_payment_intents)
      - `stripe_charge_id` (text, unique)
      - `amount` (numeric)
      - `currency` (text)
      - `receipt_url` (text)
      - `created_at` (timestamptz)
    
    - `stripe_refunds` - Track refunds
      - `id` (uuid, primary key)
      - `charge_id` (uuid, references stripe_charges)
      - `stripe_refund_id` (text, unique)
      - `amount` (numeric)
      - `reason` (text)
      - `status` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can view their own payment data
    - Admins have full access
*/

-- Stripe Customers Table
CREATE TABLE IF NOT EXISTS stripe_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id text UNIQUE NOT NULL,
  default_payment_method text,
  email text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_stripe_customers_user ON stripe_customers(user_id);
CREATE INDEX idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stripe customer"
  ON stripe_customers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage stripe customers"
  ON stripe_customers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Stripe Payment Intents Table
CREATE TABLE IF NOT EXISTS stripe_payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id text UNIQUE NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'usd',
  status text NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  production_order_id uuid REFERENCES production_orders(id) ON DELETE SET NULL,
  payment_method_id text,
  client_secret text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_payment_intents_user ON stripe_payment_intents(user_id);
CREATE INDEX idx_payment_intents_stripe_id ON stripe_payment_intents(stripe_payment_intent_id);
CREATE INDEX idx_payment_intents_booking ON stripe_payment_intents(booking_id);
CREATE INDEX idx_payment_intents_order ON stripe_payment_intents(production_order_id);
CREATE INDEX idx_payment_intents_status ON stripe_payment_intents(status);

ALTER TABLE stripe_payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment intents"
  ON stripe_payment_intents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create payment intents"
  ON stripe_payment_intents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can update payment intents"
  ON stripe_payment_intents FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Stripe Charges Table
CREATE TABLE IF NOT EXISTS stripe_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id uuid NOT NULL REFERENCES stripe_payment_intents(id) ON DELETE CASCADE,
  stripe_charge_id text UNIQUE NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'usd',
  receipt_url text,
  receipt_email text,
  status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_stripe_charges_payment_intent ON stripe_charges(payment_intent_id);
CREATE INDEX idx_stripe_charges_stripe_id ON stripe_charges(stripe_charge_id);

ALTER TABLE stripe_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view charges for their payment intents"
  ON stripe_charges FOR SELECT
  TO authenticated
  USING (
    payment_intent_id IN (
      SELECT id FROM stripe_payment_intents WHERE user_id = auth.uid()
    )
  );

-- Stripe Refunds Table
CREATE TABLE IF NOT EXISTS stripe_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id uuid NOT NULL REFERENCES stripe_charges(id) ON DELETE CASCADE,
  stripe_refund_id text UNIQUE NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'usd',
  reason text,
  status text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_stripe_refunds_charge ON stripe_refunds(charge_id);
CREATE INDEX idx_stripe_refunds_stripe_id ON stripe_refunds(stripe_refund_id);

ALTER TABLE stripe_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view refunds for their charges"
  ON stripe_refunds FOR SELECT
  TO authenticated
  USING (
    charge_id IN (
      SELECT sc.id FROM stripe_charges sc
      INNER JOIN stripe_payment_intents spi ON sc.payment_intent_id = spi.id
      WHERE spi.user_id = auth.uid()
    )
  );

-- Function to get or create stripe customer
CREATE OR REPLACE FUNCTION get_or_create_stripe_customer(
  user_id_param uuid,
  stripe_customer_id_param text,
  email_param text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  customer_id uuid;
BEGIN
  SELECT id INTO customer_id
  FROM stripe_customers
  WHERE user_id = user_id_param;
  
  IF customer_id IS NULL THEN
    INSERT INTO stripe_customers (
      user_id,
      stripe_customer_id,
      email
    ) VALUES (
      user_id_param,
      stripe_customer_id_param,
      email_param
    ) RETURNING id INTO customer_id;
  END IF;
  
  RETURN customer_id;
END;
$$;

-- Function to get user payment history
CREATE OR REPLACE FUNCTION get_user_payment_history(
  user_id_param uuid,
  limit_param integer DEFAULT 20
)
RETURNS TABLE(
  payment_id uuid,
  amount numeric,
  currency text,
  status text,
  booking_id uuid,
  production_order_id uuid,
  created_at timestamptz,
  charge_id text,
  receipt_url text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    spi.id,
    spi.amount,
    spi.currency,
    spi.status,
    spi.booking_id,
    spi.production_order_id,
    spi.created_at,
    sc.stripe_charge_id,
    sc.receipt_url
  FROM stripe_payment_intents spi
  LEFT JOIN stripe_charges sc ON sc.payment_intent_id = spi.id
  WHERE spi.user_id = user_id_param
  ORDER BY spi.created_at DESC
  LIMIT limit_param;
END;
$$;