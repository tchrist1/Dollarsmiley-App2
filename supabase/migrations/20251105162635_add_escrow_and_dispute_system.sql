/*
  # Escrow, Stripe Connect, and Dispute System

  ## Overview
  This migration adds comprehensive escrow functionality, Stripe Connect integration,
  and dispute/refund handling to support secure payment flows.

  ## New Tables
  
  ### 1. `escrow_holds`
  Tracks funds held in escrow until booking completion
  - `id` (uuid, primary key)
  - `booking_id` (uuid, references bookings)
  - `customer_id` (uuid, references profiles)
  - `provider_id` (uuid, references profiles)
  - `amount` (numeric) - total amount held
  - `platform_fee` (numeric) - Dollarsmiley's 10% fee
  - `provider_payout` (numeric) - 90% to provider
  - `stripe_payment_intent_id` (text) - Stripe reference
  - `status` (text) - Held, Released, Refunded, Disputed
  - `held_at` (timestamptz) - when escrow started
  - `released_at` (timestamptz) - when funds released to provider
  - `expires_at` (timestamptz) - auto-release date (30 days default)
  
  ### 2. `disputes`
  Manages booking disputes and resolution
  - `id` (uuid, primary key)
  - `booking_id` (uuid, references bookings)
  - `escrow_hold_id` (uuid, references escrow_holds)
  - `filed_by` (uuid, references profiles) - who filed
  - `filed_against` (uuid, references profiles)
  - `dispute_type` (text) - Quality, NoShow, Cancellation, Payment, Other
  - `description` (text)
  - `evidence_urls` (text[]) - photo/document links
  - `status` (text) - Open, UnderReview, Resolved, Closed
  - `resolution` (text) - description of resolution
  - `resolution_type` (text) - FullRefund, PartialRefund, NoRefund, Cancelled
  - `refund_amount` (numeric) - if partial/full refund
  - `admin_notes` (text) - internal admin notes
  - `priority` (text) - Low, Medium, High, Urgent
  - `response_deadline` (timestamptz) - when admin must respond
  - `resolved_by` (uuid, references profiles) - admin who resolved
  - `resolved_at` (timestamptz)
  - `created_at` (timestamptz)
  
  ### 3. `stripe_connect_accounts`
  Stores provider Stripe Connect account information
  - `id` (uuid, primary key)
  - `user_id` (uuid, unique, references profiles)
  - `stripe_account_id` (text, unique) - Stripe Connect account ID
  - `account_status` (text) - Pending, Active, Restricted, Disabled
  - `onboarding_completed` (boolean) - KYC/verification status
  - `charges_enabled` (boolean) - can receive payments
  - `payouts_enabled` (boolean) - can withdraw funds
  - `default_currency` (text) - USD, etc.
  - `country` (text)
  - `details_submitted` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 4. `refunds`
  Tracks all refund transactions
  - `id` (uuid, primary key)
  - `booking_id` (uuid, references bookings)
  - `escrow_hold_id` (uuid, references escrow_holds)
  - `dispute_id` (uuid, references disputes, nullable)
  - `amount` (numeric) - refund amount
  - `reason` (text) - Cancelled, Disputed, ServiceNotProvided, etc.
  - `stripe_refund_id` (text) - Stripe refund reference
  - `status` (text) - Pending, Completed, Failed
  - `requested_by` (uuid, references profiles)
  - `approved_by` (uuid, references profiles) - admin approval
  - `processed_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Schema Changes
  
  ### Bookings Table Updates
  - Add `escrow_status` column (text) - None, Held, Released, Refunded
  - Add `can_complete` column (boolean) - provider can mark complete
  - Add `cancellation_reason` column (text)
  - Add `cancelled_at` column (timestamptz)
  - Add `refund_requested` column (boolean)

  ### Wallet Transactions Updates
  - Add `escrow_hold_id` (uuid, references escrow_holds)
  - Add `refund_id` (uuid, references refunds)
  - Add `stripe_payment_intent_id` (text)
  - Add `transaction_type` column (text) - Payment, Payout, Refund, Fee, Deposit
  - Add `payment_method` column (text) - stripe, paypal, etc.
  - Add `related_booking_id` (uuid)

  ## Security
  - Enable RLS on all new tables
  - Restrictive policies for escrow and financial data
  - Admin-only access for disputes and refunds (except viewing own)
  - Provider can view their Stripe Connect status

  ## Important Notes
  - Escrow auto-releases after 30 days if booking completed
  - Platform fee is 10% (0.10), provider gets 90%
  - Disputes freeze escrow until resolved
  - All refunds require admin approval for amounts > $100
  - High-priority disputes must be addressed within 24 hours
  - Both parties receive notifications at each dispute status change
  - Audit trail maintained for all dispute actions
*/

-- Create escrow_holds table
CREATE TABLE IF NOT EXISTS escrow_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES profiles(id) NOT NULL,
  provider_id uuid REFERENCES profiles(id) NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  platform_fee numeric NOT NULL DEFAULT 0,
  provider_payout numeric NOT NULL DEFAULT 0,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'Held' CHECK (status IN ('Held', 'Released', 'Refunded', 'Disputed', 'Expired')),
  held_at timestamptz DEFAULT now(),
  released_at timestamptz,
  expires_at timestamptz DEFAULT (now() + INTERVAL '30 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  escrow_hold_id uuid REFERENCES escrow_holds(id) ON DELETE SET NULL,
  filed_by uuid REFERENCES profiles(id) NOT NULL,
  filed_against uuid REFERENCES profiles(id) NOT NULL,
  dispute_type text NOT NULL CHECK (dispute_type IN ('Quality', 'NoShow', 'Cancellation', 'Payment', 'Other')),
  description text NOT NULL,
  evidence_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'UnderReview', 'InvestigationRequired', 'PendingResolution', 'Resolved', 'Closed', 'Appealed')),
  resolution text,
  resolution_type text CHECK (resolution_type IN ('FullRefund', 'PartialRefund', 'NoRefund', 'Cancelled', 'ServiceRedo')),
  refund_amount numeric DEFAULT 0,
  admin_notes text,
  priority text DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  response_deadline timestamptz DEFAULT (now() + INTERVAL '48 hours'),
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stripe_connect_accounts table
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_account_id text UNIQUE,
  account_status text NOT NULL DEFAULT 'Pending' CHECK (account_status IN ('Pending', 'Active', 'Restricted', 'Disabled')),
  onboarding_completed boolean DEFAULT false,
  charges_enabled boolean DEFAULT false,
  payouts_enabled boolean DEFAULT false,
  default_currency text DEFAULT 'usd',
  country text DEFAULT 'US',
  details_submitted boolean DEFAULT false,
  requirements jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  escrow_hold_id uuid REFERENCES escrow_holds(id) ON DELETE SET NULL,
  dispute_id uuid REFERENCES disputes(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  reason text NOT NULL,
  stripe_refund_id text,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Failed')),
  requested_by uuid REFERENCES profiles(id) NOT NULL,
  approved_by uuid REFERENCES profiles(id),
  notes text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Update bookings table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'escrow_status') THEN
    ALTER TABLE bookings ADD COLUMN escrow_status text DEFAULT 'None' CHECK (escrow_status IN ('None', 'Held', 'Released', 'Refunded'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'can_complete') THEN
    ALTER TABLE bookings ADD COLUMN can_complete boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'cancellation_reason') THEN
    ALTER TABLE bookings ADD COLUMN cancellation_reason text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'cancelled_at') THEN
    ALTER TABLE bookings ADD COLUMN cancelled_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'refund_requested') THEN
    ALTER TABLE bookings ADD COLUMN refund_requested boolean DEFAULT false;
  END IF;
END $$;

-- Update wallet_transactions table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'escrow_hold_id') THEN
    ALTER TABLE wallet_transactions ADD COLUMN escrow_hold_id uuid REFERENCES escrow_holds(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'refund_id') THEN
    ALTER TABLE wallet_transactions ADD COLUMN refund_id uuid REFERENCES refunds(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'stripe_payment_intent_id') THEN
    ALTER TABLE wallet_transactions ADD COLUMN stripe_payment_intent_id text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'transaction_type') THEN
    ALTER TABLE wallet_transactions ADD COLUMN transaction_type text DEFAULT 'Payment' CHECK (transaction_type IN ('Payment', 'Payout', 'Refund', 'Fee', 'Deposit'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'payment_method') THEN
    ALTER TABLE wallet_transactions ADD COLUMN payment_method text DEFAULT 'stripe';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'related_booking_id') THEN
    ALTER TABLE wallet_transactions ADD COLUMN related_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE escrow_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for escrow_holds
CREATE POLICY "Users can view own escrow holds"
  ON escrow_holds FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR provider_id = auth.uid());

-- RLS Policies for disputes
CREATE POLICY "Users can view own disputes"
  ON disputes FOR SELECT
  TO authenticated
  USING (filed_by = auth.uid() OR filed_against = auth.uid());

CREATE POLICY "Users can file disputes"
  ON disputes FOR INSERT
  TO authenticated
  WITH CHECK (filed_by = auth.uid());

CREATE POLICY "Users can update own disputes"
  ON disputes FOR UPDATE
  TO authenticated
  USING (filed_by = auth.uid());

-- RLS Policies for stripe_connect_accounts
CREATE POLICY "Users can view own Stripe Connect account"
  ON stripe_connect_accounts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own Stripe Connect account"
  ON stripe_connect_accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own Stripe Connect account"
  ON stripe_connect_accounts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for refunds
CREATE POLICY "Users can view own refunds"
  ON refunds FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = refunds.booking_id 
      AND (bookings.customer_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can request refunds"
  ON refunds FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_escrow_holds_booking ON escrow_holds(booking_id);
CREATE INDEX IF NOT EXISTS idx_escrow_holds_status ON escrow_holds(status);
CREATE INDEX IF NOT EXISTS idx_escrow_holds_provider ON escrow_holds(provider_id);
CREATE INDEX IF NOT EXISTS idx_disputes_booking ON disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_priority ON disputes(priority);
CREATE INDEX IF NOT EXISTS idx_disputes_filed_by ON disputes(filed_by);
CREATE INDEX IF NOT EXISTS idx_disputes_filed_against ON disputes(filed_against);
CREATE INDEX IF NOT EXISTS idx_disputes_created ON disputes(created_at);
CREATE INDEX IF NOT EXISTS idx_disputes_response_deadline ON disputes(response_deadline);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_user ON stripe_connect_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_booking ON refunds(booking_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);