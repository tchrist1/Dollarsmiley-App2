/*
  # Create Payment Plans System

  ## Overview
  Enables split payments and payment plans for bookings, allowing customers to
  pay for services in multiple installments.

  ## New Tables

  ### 1. `payment_plans`
  Defines available payment plan templates
  - `id` (uuid, primary key)
  - `name` (text) - Plan name (e.g., "Pay in 2", "Pay in 4")
  - `description` (text) - Plan description
  - `installments_count` (int) - Number of payments (2, 3, 4, etc.)
  - `installment_frequency` (text) - Weekly, Biweekly, Monthly
  - `down_payment_percentage` (numeric) - % required upfront (0-100)
  - `min_booking_amount` (numeric) - Minimum booking price to qualify
  - `max_booking_amount` (numeric) - Maximum booking price (null = no limit)
  - `active` (boolean) - Whether plan is currently available
  - `created_at` (timestamptz)

  ### 2. `booking_payment_plans`
  Links bookings to payment plans and tracks installments
  - `id` (uuid, primary key)
  - `booking_id` (uuid, references bookings)
  - `payment_plan_id` (uuid, references payment_plans)
  - `total_amount` (numeric) - Full booking amount
  - `down_payment_amount` (numeric) - Initial payment
  - `installment_amount` (numeric) - Amount per installment
  - `installments_count` (int) - Total number of installments
  - `installments_paid` (int) - Number completed
  - `status` (text) - Active, Completed, Defaulted, Cancelled
  - `next_payment_date` (date) - When next installment is due
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `payment_installments`
  Individual installment records
  - `id` (uuid, primary key)
  - `booking_payment_plan_id` (uuid, references booking_payment_plans)
  - `installment_number` (int) - 1, 2, 3, etc.
  - `amount` (numeric) - Installment amount
  - `due_date` (date) - When payment is due
  - `status` (text) - Pending, Paid, Failed, Skipped
  - `paid_at` (timestamptz) - When payment was made
  - `stripe_payment_intent_id` (text) - Stripe reference
  - `failure_reason` (text) - If payment failed
  - `retry_count` (int) - Number of retry attempts
  - `created_at` (timestamptz)

  ## Schema Changes

  ### Bookings Table Updates
  - Add `has_payment_plan` (boolean) - Indicates if booking uses payment plan
  - Add `payment_plan_status` (text) - None, Active, Completed, Defaulted

  ## Security
  - Enable RLS on all new tables
  - Customers can view their own payment plans
  - Providers can view payment plans for their bookings
  - Only authenticated users can create payment plan bookings

  ## Important Notes
  - Down payment must be made before service is provided
  - Remaining installments are auto-charged on due dates
  - Failed payments trigger retry logic (3 attempts)
  - After 3 failed attempts, booking may be cancelled
  - Providers receive full payment upfront from escrow
  - Platform handles collection risk
*/

-- Create payment_plans table
CREATE TABLE IF NOT EXISTS payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  installments_count int NOT NULL CHECK (installments_count >= 2 AND installments_count <= 12),
  installment_frequency text NOT NULL DEFAULT 'Weekly' CHECK (installment_frequency IN ('Weekly', 'Biweekly', 'Monthly')),
  down_payment_percentage numeric NOT NULL DEFAULT 0 CHECK (down_payment_percentage >= 0 AND down_payment_percentage <= 100),
  min_booking_amount numeric NOT NULL DEFAULT 50,
  max_booking_amount numeric,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create booking_payment_plans table
CREATE TABLE IF NOT EXISTS booking_payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  payment_plan_id uuid REFERENCES payment_plans(id) NOT NULL,
  total_amount numeric NOT NULL CHECK (total_amount > 0),
  down_payment_amount numeric NOT NULL DEFAULT 0 CHECK (down_payment_amount >= 0),
  installment_amount numeric NOT NULL CHECK (installment_amount > 0),
  installments_count int NOT NULL CHECK (installments_count >= 1),
  installments_paid int DEFAULT 0 CHECK (installments_paid >= 0),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Defaulted', 'Cancelled')),
  next_payment_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment_installments table
CREATE TABLE IF NOT EXISTS payment_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_payment_plan_id uuid REFERENCES booking_payment_plans(id) ON DELETE CASCADE NOT NULL,
  installment_number int NOT NULL CHECK (installment_number > 0),
  amount numeric NOT NULL CHECK (amount > 0),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Failed', 'Skipped', 'Cancelled')),
  paid_at timestamptz,
  stripe_payment_intent_id text,
  failure_reason text,
  retry_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(booking_payment_plan_id, installment_number)
);

-- Add payment plan columns to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'has_payment_plan'
  ) THEN
    ALTER TABLE bookings ADD COLUMN has_payment_plan boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_plan_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_plan_status text DEFAULT 'None' CHECK (payment_plan_status IN ('None', 'Active', 'Completed', 'Defaulted'));
  END IF;
END $$;

-- Enable RLS
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_plans
CREATE POLICY "Anyone can view active payment plans"
  ON payment_plans FOR SELECT
  TO authenticated
  USING (active = true);

-- RLS Policies for booking_payment_plans
CREATE POLICY "Users can view own payment plans"
  ON booking_payment_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_payment_plans.booking_id
      AND (bookings.customer_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "Customers can create payment plans for their bookings"
  ON booking_payment_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
      AND bookings.customer_id = auth.uid()
    )
  );

-- RLS Policies for payment_installments
CREATE POLICY "Users can view installments for their payment plans"
  ON payment_installments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM booking_payment_plans
      JOIN bookings ON bookings.id = booking_payment_plans.booking_id
      WHERE booking_payment_plans.id = payment_installments.booking_payment_plan_id
      AND (bookings.customer_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_plans_active ON payment_plans(active);
CREATE INDEX IF NOT EXISTS idx_booking_payment_plans_booking ON booking_payment_plans(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_payment_plans_status ON booking_payment_plans(status);
CREATE INDEX IF NOT EXISTS idx_booking_payment_plans_next_payment ON booking_payment_plans(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_installments_plan ON payment_installments(booking_payment_plan_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_status ON payment_installments(status);
CREATE INDEX IF NOT EXISTS idx_payment_installments_due_date ON payment_installments(due_date);

-- Insert default payment plans
INSERT INTO payment_plans (name, description, installments_count, installment_frequency, down_payment_percentage, min_booking_amount, active)
VALUES
  ('Pay in 2', 'Split your payment into 2 equal installments', 2, 'Biweekly', 50, 50, true),
  ('Pay in 3', 'Split your payment into 3 equal installments', 3, 'Biweekly', 33.33, 100, true),
  ('Pay in 4', 'Split your payment into 4 equal installments', 4, 'Weekly', 25, 150, true)
ON CONFLICT DO NOTHING;

-- Function to create payment plan installments
CREATE OR REPLACE FUNCTION create_payment_installments(
  payment_plan_id_param uuid,
  booking_id_param uuid
)
RETURNS uuid AS $$
DECLARE
  booking_record RECORD;
  plan_record RECORD;
  booking_payment_plan_id uuid;
  down_payment numeric;
  remaining_amount numeric;
  installment_amount numeric;
  current_due_date date;
  i int;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record FROM bookings WHERE id = booking_id_param;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Get payment plan details
  SELECT * INTO plan_record FROM payment_plans WHERE id = payment_plan_id_param;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment plan not found';
  END IF;

  -- Validate booking amount
  IF booking_record.price < plan_record.min_booking_amount THEN
    RAISE EXCEPTION 'Booking amount too low for this payment plan';
  END IF;

  IF plan_record.max_booking_amount IS NOT NULL AND booking_record.price > plan_record.max_booking_amount THEN
    RAISE EXCEPTION 'Booking amount too high for this payment plan';
  END IF;

  -- Calculate amounts
  down_payment := booking_record.price * (plan_record.down_payment_percentage / 100);
  remaining_amount := booking_record.price - down_payment;
  installment_amount := remaining_amount / plan_record.installments_count;

  -- Set first due date based on frequency
  current_due_date := CURRENT_DATE + INTERVAL '1 week';

  -- Create booking payment plan
  INSERT INTO booking_payment_plans (
    booking_id,
    payment_plan_id,
    total_amount,
    down_payment_amount,
    installment_amount,
    installments_count,
    next_payment_date
  ) VALUES (
    booking_id_param,
    payment_plan_id_param,
    booking_record.price,
    down_payment,
    installment_amount,
    plan_record.installments_count,
    current_due_date
  ) RETURNING id INTO booking_payment_plan_id;

  -- Create installment records
  FOR i IN 1..plan_record.installments_count LOOP
    INSERT INTO payment_installments (
      booking_payment_plan_id,
      installment_number,
      amount,
      due_date,
      status
    ) VALUES (
      booking_payment_plan_id,
      i,
      installment_amount,
      current_due_date,
      'Pending'
    );

    -- Calculate next due date
    IF plan_record.installment_frequency = 'Weekly' THEN
      current_due_date := current_due_date + INTERVAL '1 week';
    ELSIF plan_record.installment_frequency = 'Biweekly' THEN
      current_due_date := current_due_date + INTERVAL '2 weeks';
    ELSIF plan_record.installment_frequency = 'Monthly' THEN
      current_due_date := current_due_date + INTERVAL '1 month';
    END IF;
  END LOOP;

  -- Update booking
  UPDATE bookings SET
    has_payment_plan = true,
    payment_plan_status = 'Active'
  WHERE id = booking_id_param;

  RETURN booking_payment_plan_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark installment as paid
CREATE OR REPLACE FUNCTION mark_installment_paid(
  installment_id_param uuid,
  stripe_payment_intent_id_param text
)
RETURNS void AS $$
DECLARE
  payment_plan_record RECORD;
BEGIN
  -- Update installment
  UPDATE payment_installments
  SET
    status = 'Paid',
    paid_at = now(),
    stripe_payment_intent_id = stripe_payment_intent_id_param
  WHERE id = installment_id_param;

  -- Get payment plan
  SELECT bpp.* INTO payment_plan_record
  FROM booking_payment_plans bpp
  JOIN payment_installments pi ON pi.booking_payment_plan_id = bpp.id
  WHERE pi.id = installment_id_param;

  -- Update payment plan
  UPDATE booking_payment_plans
  SET
    installments_paid = installments_paid + 1,
    next_payment_date = (
      SELECT due_date FROM payment_installments
      WHERE booking_payment_plan_id = payment_plan_record.id
      AND status = 'Pending'
      ORDER BY installment_number ASC
      LIMIT 1
    ),
    status = CASE
      WHEN installments_paid + 1 >= installments_count THEN 'Completed'
      ELSE status
    END,
    updated_at = now()
  WHERE id = payment_plan_record.id;

  -- Update booking if all installments paid
  IF payment_plan_record.installments_paid + 1 >= payment_plan_record.installments_count THEN
    UPDATE bookings
    SET payment_plan_status = 'Completed'
    WHERE id = payment_plan_record.booking_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get overdue installments
CREATE OR REPLACE FUNCTION get_overdue_installments()
RETURNS TABLE (
  installment_id uuid,
  booking_id uuid,
  customer_id uuid,
  amount numeric,
  due_date date,
  days_overdue int
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.id,
    bpp.booking_id,
    b.customer_id,
    pi.amount,
    pi.due_date,
    (CURRENT_DATE - pi.due_date)::int
  FROM payment_installments pi
  JOIN booking_payment_plans bpp ON bpp.id = pi.booking_payment_plan_id
  JOIN bookings b ON b.id = bpp.booking_id
  WHERE pi.status = 'Pending'
  AND pi.due_date < CURRENT_DATE
  AND bpp.status = 'Active'
  ORDER BY pi.due_date ASC;
END;
$$ LANGUAGE plpgsql;
