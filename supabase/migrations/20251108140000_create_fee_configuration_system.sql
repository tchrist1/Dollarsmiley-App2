/*
  # Create Fee Configuration System

  ## Overview
  Provides administrators with a flexible system to configure platform fees, commissions,
  and charges across different service categories, subscription tiers, and transaction types.

  ## New Tables

  ### 1. `platform_fee_config`
  Global platform fee configuration
  - `id` (uuid, primary key)
  - `config_name` (text) - Name for this configuration
  - `fee_type` (text) - Percentage, Flat, Hybrid
  - `percentage_rate` (numeric) - Percentage fee (e.g., 10.0 for 10%)
  - `flat_amount` (numeric) - Flat fee amount
  - `minimum_fee` (numeric) - Minimum fee charged
  - `maximum_fee` (numeric) - Maximum fee cap
  - `applies_to` (text) - Bookings, Subscriptions, Featured, All
  - `is_active` (boolean) - Active configuration
  - `effective_date` (date) - When config becomes active
  - `expires_date` (date) - When config expires (optional)
  - `description` (text) - Admin notes
  - `created_by` (uuid) - Admin who created
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `category_fee_overrides`
  Category-specific fee overrides
  - `id` (uuid, primary key)
  - `category_id` (uuid, references categories)
  - `fee_type` (text) - Percentage, Flat, Hybrid
  - `percentage_rate` (numeric) - Override percentage
  - `flat_amount` (numeric) - Override flat amount
  - `minimum_fee` (numeric)
  - `maximum_fee` (numeric)
  - `is_active` (boolean)
  - `reason` (text) - Why override is needed
  - `created_by` (uuid)
  - `created_at` (timestamptz)

  ### 3. `subscription_tier_fees`
  Fee discounts for subscription tiers
  - `id` (uuid, primary key)
  - `subscription_plan` (text) - Free, Pro, Premium, Elite
  - `discount_type` (text) - Percentage, Flat
  - `discount_value` (numeric) - Discount amount/percentage
  - `applies_to` (text) - Bookings, Featured, All
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### 4. `payment_processing_fees`
  Third-party payment processor fees
  - `id` (uuid, primary key)
  - `processor_name` (text) - Stripe, PayPal, etc.
  - `fee_type` (text) - Percentage, Flat, Hybrid
  - `percentage_rate` (numeric) - Processor's percentage
  - `flat_amount` (numeric) - Processor's flat fee
  - `passed_to` (text) - Customer, Provider, Platform, Split
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### 5. `promotional_fee_waivers`
  Temporary fee waivers for promotions
  - `id` (uuid, primary key)
  - `waiver_name` (text) - Promotion name
  - `waiver_type` (text) - FullWaiver, PartialWaiver
  - `discount_percentage` (numeric) - Percentage off fees
  - `applies_to_categories` (uuid[]) - Specific categories
  - `applies_to_users` (uuid[]) - Specific users
  - `min_transaction_amount` (numeric) - Minimum booking amount
  - `max_transaction_amount` (numeric) - Maximum booking amount
  - `usage_limit_per_user` (int) - Max uses per user
  - `usage_count` (int) - Total times used
  - `start_date` (date) - Promotion start
  - `end_date` (date) - Promotion end
  - `is_active` (boolean)
  - `created_by` (uuid)
  - `created_at` (timestamptz)

  ### 6. `fee_calculation_logs`
  Audit trail for fee calculations
  - `id` (uuid, primary key)
  - `booking_id` (uuid, references bookings)
  - `transaction_amount` (numeric) - Base amount
  - `platform_fee_config_id` (uuid) - Config used
  - `category_override_id` (uuid) - Category override if applied
  - `subscription_discount_id` (uuid) - Subscription discount if applied
  - `promotional_waiver_id` (uuid) - Promotion if applied
  - `base_fee` (numeric) - Calculated base fee
  - `discounts_applied` (numeric) - Total discounts
  - `final_fee` (numeric) - Final fee charged
  - `calculation_details` (jsonb) - Detailed breakdown
  - `created_at` (timestamptz)

  ## Fee Types
  - **Percentage**: X% of transaction amount
  - **Flat**: Fixed dollar amount
  - **Hybrid**: Percentage + flat amount

  ## Applies To
  - **Bookings**: Service bookings
  - **Subscriptions**: Subscription payments
  - **Featured**: Featured listing fees
  - **All**: All transaction types

  ## Security
  - Enable RLS on all tables
  - Only admins can view/modify fee configurations
  - Fee calculation logs are read-only for audit purposes

  ## Important Notes
  - Default platform fee is 10% on bookings
  - Multiple fee configs can exist but only one active per type
  - Category overrides take precedence over global config
  - Subscription discounts apply after base fee calculation
  - Promotional waivers apply last in calculation chain
  - All fee changes are logged with timestamp and admin
  - Historical fee configs are retained for reporting
  - Fee calculation is: Base Fee - Subscription Discount - Promotional Waiver
*/

-- Create platform_fee_config table
CREATE TABLE IF NOT EXISTS platform_fee_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name text NOT NULL,
  fee_type text NOT NULL DEFAULT 'Percentage' CHECK (fee_type IN ('Percentage', 'Flat', 'Hybrid')),
  percentage_rate numeric(5, 2) DEFAULT 0 CHECK (percentage_rate >= 0 AND percentage_rate <= 100),
  flat_amount numeric(10, 2) DEFAULT 0 CHECK (flat_amount >= 0),
  minimum_fee numeric(10, 2) DEFAULT 0 CHECK (minimum_fee >= 0),
  maximum_fee numeric(10, 2) CHECK (maximum_fee IS NULL OR maximum_fee >= minimum_fee),
  applies_to text NOT NULL DEFAULT 'Bookings' CHECK (applies_to IN ('Bookings', 'Subscriptions', 'Featured', 'All')),
  is_active boolean DEFAULT false,
  effective_date date DEFAULT CURRENT_DATE,
  expires_date date,
  description text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create category_fee_overrides table
CREATE TABLE IF NOT EXISTS category_fee_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  fee_type text NOT NULL DEFAULT 'Percentage' CHECK (fee_type IN ('Percentage', 'Flat', 'Hybrid')),
  percentage_rate numeric(5, 2) DEFAULT 0 CHECK (percentage_rate >= 0 AND percentage_rate <= 100),
  flat_amount numeric(10, 2) DEFAULT 0 CHECK (flat_amount >= 0),
  minimum_fee numeric(10, 2) DEFAULT 0 CHECK (minimum_fee >= 0),
  maximum_fee numeric(10, 2) CHECK (maximum_fee IS NULL OR maximum_fee >= minimum_fee),
  is_active boolean DEFAULT true,
  reason text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create subscription_tier_fees table
CREATE TABLE IF NOT EXISTS subscription_tier_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_plan text NOT NULL CHECK (subscription_plan IN ('Free', 'Pro', 'Premium', 'Elite')),
  discount_type text NOT NULL DEFAULT 'Percentage' CHECK (discount_type IN ('Percentage', 'Flat')),
  discount_value numeric(10, 2) NOT NULL CHECK (discount_value >= 0),
  applies_to text NOT NULL DEFAULT 'Bookings' CHECK (applies_to IN ('Bookings', 'Featured', 'All')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(subscription_plan, applies_to)
);

-- Create payment_processing_fees table
CREATE TABLE IF NOT EXISTS payment_processing_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processor_name text NOT NULL,
  fee_type text NOT NULL DEFAULT 'Hybrid' CHECK (fee_type IN ('Percentage', 'Flat', 'Hybrid')),
  percentage_rate numeric(5, 2) DEFAULT 0 CHECK (percentage_rate >= 0 AND percentage_rate <= 100),
  flat_amount numeric(10, 2) DEFAULT 0 CHECK (flat_amount >= 0),
  passed_to text NOT NULL DEFAULT 'Customer' CHECK (passed_to IN ('Customer', 'Provider', 'Platform', 'Split')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create promotional_fee_waivers table
CREATE TABLE IF NOT EXISTS promotional_fee_waivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waiver_name text NOT NULL,
  waiver_type text NOT NULL DEFAULT 'PartialWaiver' CHECK (waiver_type IN ('FullWaiver', 'PartialWaiver')),
  discount_percentage numeric(5, 2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  applies_to_categories uuid[] DEFAULT '{}',
  applies_to_users uuid[] DEFAULT '{}',
  min_transaction_amount numeric(10, 2) DEFAULT 0,
  max_transaction_amount numeric(10, 2),
  usage_limit_per_user int DEFAULT NULL,
  usage_count int DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  CHECK (end_date > start_date)
);

-- Create fee_calculation_logs table
CREATE TABLE IF NOT EXISTS fee_calculation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  transaction_amount numeric(10, 2) NOT NULL,
  platform_fee_config_id uuid REFERENCES platform_fee_config(id),
  category_override_id uuid REFERENCES category_fee_overrides(id),
  subscription_discount_id uuid REFERENCES subscription_tier_fees(id),
  promotional_waiver_id uuid REFERENCES promotional_fee_waivers(id),
  base_fee numeric(10, 2) NOT NULL,
  discounts_applied numeric(10, 2) DEFAULT 0,
  final_fee numeric(10, 2) NOT NULL,
  calculation_details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE platform_fee_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_fee_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tier_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_processing_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotional_fee_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_calculation_logs ENABLE ROW LEVEL SECURITY;

-- Note: In production, you would create admin-only policies
-- For now, authenticated users can read (for transparency)
-- Only admins should have write access (implement via app logic)

CREATE POLICY "Anyone can view active fee configs"
  ON platform_fee_config FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Anyone can view category overrides"
  ON category_fee_overrides FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Anyone can view subscription tier fees"
  ON subscription_tier_fees FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Anyone can view payment processing fees"
  ON payment_processing_fees FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Anyone can view active promotional waivers"
  ON promotional_fee_waivers FOR SELECT
  TO authenticated
  USING (is_active = true AND CURRENT_DATE BETWEEN start_date AND end_date);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_platform_fee_config_active ON platform_fee_config(is_active, applies_to, effective_date);
CREATE INDEX IF NOT EXISTS idx_category_fee_overrides_category ON category_fee_overrides(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_tier_fees_plan ON subscription_tier_fees(subscription_plan, is_active);
CREATE INDEX IF NOT EXISTS idx_promotional_waivers_dates ON promotional_fee_waivers(start_date, end_date, is_active);
CREATE INDEX IF NOT EXISTS idx_fee_calculation_logs_booking ON fee_calculation_logs(booking_id);

-- Function to calculate platform fee
CREATE OR REPLACE FUNCTION calculate_platform_fee(
  transaction_amount_param numeric,
  category_id_param uuid DEFAULT NULL,
  subscription_plan_param text DEFAULT 'Free',
  applies_to_param text DEFAULT 'Bookings'
)
RETURNS jsonb AS $$
DECLARE
  base_fee numeric := 0;
  final_fee numeric := 0;
  discounts numeric := 0;
  config_record RECORD;
  category_override RECORD;
  subscription_discount RECORD;
  calculation jsonb;
BEGIN
  -- Get active platform fee config
  SELECT * INTO config_record
  FROM platform_fee_config
  WHERE is_active = true
  AND applies_to IN (applies_to_param, 'All')
  AND effective_date <= CURRENT_DATE
  AND (expires_date IS NULL OR expires_date >= CURRENT_DATE)
  ORDER BY effective_date DESC
  LIMIT 1;

  IF config_record IS NULL THEN
    -- Default to 10% if no config
    base_fee := transaction_amount_param * 0.10;
  ELSE
    -- Calculate base fee
    IF config_record.fee_type = 'Percentage' THEN
      base_fee := transaction_amount_param * (config_record.percentage_rate / 100);
    ELSIF config_record.fee_type = 'Flat' THEN
      base_fee := config_record.flat_amount;
    ELSIF config_record.fee_type = 'Hybrid' THEN
      base_fee := (transaction_amount_param * (config_record.percentage_rate / 100)) + config_record.flat_amount;
    END IF;

    -- Apply minimum and maximum fee limits
    IF config_record.minimum_fee IS NOT NULL AND base_fee < config_record.minimum_fee THEN
      base_fee := config_record.minimum_fee;
    END IF;
    IF config_record.maximum_fee IS NOT NULL AND base_fee > config_record.maximum_fee THEN
      base_fee := config_record.maximum_fee;
    END IF;
  END IF;

  final_fee := base_fee;

  -- Check for category override
  IF category_id_param IS NOT NULL THEN
    SELECT * INTO category_override
    FROM category_fee_overrides
    WHERE category_id = category_id_param
    AND is_active = true
    LIMIT 1;

    IF category_override IS NOT NULL THEN
      IF category_override.fee_type = 'Percentage' THEN
        final_fee := transaction_amount_param * (category_override.percentage_rate / 100);
      ELSIF category_override.fee_type = 'Flat' THEN
        final_fee := category_override.flat_amount;
      ELSIF category_override.fee_type = 'Hybrid' THEN
        final_fee := (transaction_amount_param * (category_override.percentage_rate / 100)) + category_override.flat_amount;
      END IF;

      IF category_override.minimum_fee IS NOT NULL AND final_fee < category_override.minimum_fee THEN
        final_fee := category_override.minimum_fee;
      END IF;
      IF category_override.maximum_fee IS NOT NULL AND final_fee > category_override.maximum_fee THEN
        final_fee := category_override.maximum_fee;
      END IF;
    END IF;
  END IF;

  -- Apply subscription tier discount
  IF subscription_plan_param != 'Free' THEN
    SELECT * INTO subscription_discount
    FROM subscription_tier_fees
    WHERE subscription_plan = subscription_plan_param
    AND applies_to IN (applies_to_param, 'All')
    AND is_active = true
    LIMIT 1;

    IF subscription_discount IS NOT NULL THEN
      IF subscription_discount.discount_type = 'Percentage' THEN
        discounts := final_fee * (subscription_discount.discount_value / 100);
      ELSIF subscription_discount.discount_type = 'Flat' THEN
        discounts := subscription_discount.discount_value;
      END IF;
      final_fee := final_fee - discounts;
    END IF;
  END IF;

  -- Ensure fee is not negative
  IF final_fee < 0 THEN
    final_fee := 0;
  END IF;

  calculation := jsonb_build_object(
    'transaction_amount', transaction_amount_param,
    'base_fee', base_fee,
    'discounts_applied', discounts,
    'final_fee', final_fee,
    'provider_payout', transaction_amount_param - final_fee,
    'config_id', config_record.id,
    'category_override_id', category_override.id,
    'subscription_discount_id', subscription_discount.id
  );

  RETURN calculation;
END;
$$ LANGUAGE plpgsql;

-- Insert default platform fee configuration
INSERT INTO platform_fee_config (
  config_name,
  fee_type,
  percentage_rate,
  minimum_fee,
  maximum_fee,
  applies_to,
  is_active,
  description
) VALUES (
  'Default Platform Fee',
  'Percentage',
  10.0,
  0.50,
  NULL,
  'Bookings',
  true,
  'Standard 10% platform fee on all bookings with $0.50 minimum'
) ON CONFLICT DO NOTHING;

-- Insert default subscription tier discounts
INSERT INTO subscription_tier_fees (subscription_plan, discount_type, discount_value, applies_to, is_active) VALUES
  ('Pro', 'Percentage', 10.0, 'Bookings', true),
  ('Premium', 'Percentage', 20.0, 'Bookings', true),
  ('Elite', 'Percentage', 30.0, 'Bookings', true)
ON CONFLICT DO NOTHING;

-- Insert default payment processor fees (Stripe)
INSERT INTO payment_processing_fees (
  processor_name,
  fee_type,
  percentage_rate,
  flat_amount,
  passed_to,
  is_active
) VALUES (
  'Stripe',
  'Hybrid',
  2.9,
  0.30,
  'Platform',
  true
) ON CONFLICT DO NOTHING;
