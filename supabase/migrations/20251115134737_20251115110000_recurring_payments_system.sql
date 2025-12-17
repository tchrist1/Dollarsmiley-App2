/*
  # Recurring Payments Automation System

  1. New Tables
    - `recurring_payment_schedules` - Payment schedules
    - `recurring_payment_attempts` - Track payment attempts

  2. Security
    - Enable RLS on all tables
    - Users can manage their own schedules
*/

-- Recurring Payment Schedules Table
CREATE TABLE IF NOT EXISTS recurring_payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  production_order_id uuid REFERENCES production_orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'usd',
  interval text NOT NULL CHECK (interval IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval_count integer DEFAULT 1 CHECK (interval_count > 0),
  start_date date NOT NULL,
  end_date date,
  next_payment_date date NOT NULL,
  total_payments integer DEFAULT 0,
  successful_payments integer DEFAULT 0,
  failed_payments integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  payment_method_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_recurring_schedules_user ON recurring_payment_schedules(user_id);
CREATE INDEX idx_recurring_schedules_next_payment ON recurring_payment_schedules(next_payment_date);
CREATE INDEX idx_recurring_schedules_status ON recurring_payment_schedules(status);
CREATE INDEX idx_recurring_schedules_booking ON recurring_payment_schedules(booking_id);

ALTER TABLE recurring_payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules"
  ON recurring_payment_schedules FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own schedules"
  ON recurring_payment_schedules FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own schedules"
  ON recurring_payment_schedules FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Recurring Payment Attempts Table
CREATE TABLE IF NOT EXISTS recurring_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES recurring_payment_schedules(id) ON DELETE CASCADE,
  payment_intent_id uuid REFERENCES stripe_payment_intents(id) ON DELETE SET NULL,
  attempt_number integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  amount numeric NOT NULL,
  currency text DEFAULT 'usd',
  error_message text,
  error_code text,
  attempted_at timestamptz DEFAULT now()
);

CREATE INDEX idx_payment_attempts_schedule ON recurring_payment_attempts(schedule_id);
CREATE INDEX idx_payment_attempts_status ON recurring_payment_attempts(status);
CREATE INDEX idx_payment_attempts_attempted ON recurring_payment_attempts(attempted_at DESC);

ALTER TABLE recurring_payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attempts for own schedules"
  ON recurring_payment_attempts FOR SELECT
  TO authenticated
  USING (
    schedule_id IN (
      SELECT id FROM recurring_payment_schedules WHERE user_id = auth.uid()
    )
  );

-- Function to calculate next payment date
CREATE OR REPLACE FUNCTION calculate_next_payment_date(
  date_param date,
  interval_type text,
  interval_count integer
)
RETURNS date
LANGUAGE plpgsql
AS $$
BEGIN
  CASE interval_type
    WHEN 'daily' THEN
      RETURN date_param + (interval_count || ' days')::interval;
    WHEN 'weekly' THEN
      RETURN date_param + (interval_count || ' weeks')::interval;
    WHEN 'monthly' THEN
      RETURN date_param + (interval_count || ' months')::interval;
    WHEN 'yearly' THEN
      RETURN date_param + (interval_count || ' years')::interval;
    ELSE
      RETURN date_param + (interval_count || ' days')::interval;
  END CASE;
END;
$$;

-- Function to get due payment schedules
CREATE OR REPLACE FUNCTION get_due_payment_schedules()
RETURNS TABLE(
  schedule_id uuid,
  user_id uuid,
  amount numeric,
  currency text,
  payment_method_id text,
  booking_id uuid,
  production_order_id uuid
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rps.id,
    rps.user_id,
    rps.amount,
    rps.currency,
    rps.payment_method_id,
    rps.booking_id,
    rps.production_order_id
  FROM recurring_payment_schedules rps
  WHERE rps.status = 'active'
    AND rps.next_payment_date <= CURRENT_DATE
    AND (rps.end_date IS NULL OR rps.end_date >= CURRENT_DATE);
END;
$$;

-- Function to process recurring payment result
CREATE OR REPLACE FUNCTION process_recurring_payment_result(
  schedule_id_param uuid,
  payment_intent_id_param uuid,
  success boolean,
  error_message_param text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schedule_record RECORD;
  new_next_date date;
BEGIN
  SELECT * INTO schedule_record
  FROM recurring_payment_schedules
  WHERE id = schedule_id_param;
  
  IF success THEN
    UPDATE recurring_payment_schedules
    SET 
      successful_payments = successful_payments + 1,
      total_payments = total_payments + 1,
      updated_at = now()
    WHERE id = schedule_id_param;
  ELSE
    UPDATE recurring_payment_schedules
    SET 
      failed_payments = failed_payments + 1,
      total_payments = total_payments + 1,
      updated_at = now()
    WHERE id = schedule_id_param;
  END IF;
  
  new_next_date := calculate_next_payment_date(
    schedule_record.next_payment_date,
    schedule_record.interval,
    schedule_record.interval_count
  );
  
  IF schedule_record.end_date IS NOT NULL AND new_next_date > schedule_record.end_date THEN
    UPDATE recurring_payment_schedules
    SET 
      status = 'completed',
      updated_at = now()
    WHERE id = schedule_id_param;
  ELSE
    UPDATE recurring_payment_schedules
    SET 
      next_payment_date = new_next_date,
      updated_at = now()
    WHERE id = schedule_id_param;
  END IF;
  
  INSERT INTO recurring_payment_attempts (
    schedule_id,
    payment_intent_id,
    attempt_number,
    status,
    amount,
    currency,
    error_message
  ) VALUES (
    schedule_id_param,
    payment_intent_id_param,
    schedule_record.total_payments + 1,
    CASE WHEN success THEN 'succeeded' ELSE 'failed' END,
    schedule_record.amount,
    schedule_record.currency,
    error_message_param
  );
END;
$$;