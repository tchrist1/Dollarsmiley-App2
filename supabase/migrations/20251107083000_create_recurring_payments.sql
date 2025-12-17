/*
  # Create Recurring Payments System

  1. New Tables
    - `recurring_payments`
      - Store payment records for recurring bookings
      - Track payment status and retries
      - Link to Stripe payment intents
      - Handle automatic charging

  2. Changes
    - Add `payment_method_id` to recurring_bookings
    - Track default payment method for recurring bookings

  3. Security
    - Enable RLS on recurring_payments
    - Users can view their own payment records
    - Secure payment processing through edge functions

  4. Automation
    - Process pending payments (cron job)
    - Automatic retry logic with exponential backoff
    - Payment failure notifications
    - Automatic booking pause on payment failure
*/

-- Add payment_method_id to recurring_bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_bookings' AND column_name = 'payment_method_id'
  ) THEN
    ALTER TABLE recurring_bookings ADD COLUMN payment_method_id text;
  END IF;
END $$;

-- Create recurring_payments table
CREATE TABLE IF NOT EXISTS recurring_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_booking_id uuid REFERENCES recurring_bookings(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  payment_method_id text NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'usd' NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  stripe_payment_intent_id text,
  failure_reason text,
  retry_count integer DEFAULT 0 NOT NULL,
  max_retries integer DEFAULT 3 NOT NULL,
  next_retry_at timestamptz,
  charged_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled'))
);

-- Add recurring_payment_id to transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'recurring_payment_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recurring_payment_id uuid REFERENCES recurring_payments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring_payments

-- Customers can view their own recurring payments
CREATE POLICY "Customers can view own recurring payments"
  ON recurring_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

-- System can manage recurring payments (through edge functions)
CREATE POLICY "System can manage recurring payments"
  ON recurring_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recurring_payments_customer
  ON recurring_payments(customer_id);

CREATE INDEX IF NOT EXISTS idx_recurring_payments_booking
  ON recurring_payments(recurring_booking_id);

CREATE INDEX IF NOT EXISTS idx_recurring_payments_status
  ON recurring_payments(status, next_retry_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_recurring_payments_stripe
  ON recurring_payments(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_recurring_payment
  ON transactions(recurring_payment_id)
  WHERE recurring_payment_id IS NOT NULL;

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_recurring_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_recurring_payments_updated_at_trigger
  ON recurring_payments;
CREATE TRIGGER update_recurring_payments_updated_at_trigger
  BEFORE UPDATE ON recurring_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_payments_updated_at();

-- Create function to process pending recurring payments
CREATE OR REPLACE FUNCTION process_pending_recurring_payments()
RETURNS void AS $$
DECLARE
  v_payment recurring_payments%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Get pending payments that are due for processing or retry
  FOR v_payment IN
    SELECT * FROM recurring_payments
    WHERE status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= now())
      AND retry_count < max_retries
    ORDER BY created_at ASC
    LIMIT 50
  LOOP
    BEGIN
      -- Update status to processing
      UPDATE recurring_payments
      SET status = 'processing'
      WHERE id = v_payment.id;

      -- Note: Actual payment processing happens in edge function
      -- This function just identifies payments to process

      -- Log for processing
      RAISE NOTICE 'Payment % marked for processing', v_payment.id;

    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue processing other payments
        RAISE NOTICE 'Error marking payment % for processing: %', v_payment.id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle payment success
CREATE OR REPLACE FUNCTION handle_recurring_payment_success(
  p_payment_id uuid,
  p_payment_intent_id text
)
RETURNS void AS $$
DECLARE
  v_payment recurring_payments%ROWTYPE;
BEGIN
  -- Get payment details
  SELECT * INTO v_payment
  FROM recurring_payments
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
  END IF;

  -- Update payment status
  UPDATE recurring_payments
  SET
    status = 'succeeded',
    stripe_payment_intent_id = p_payment_intent_id,
    charged_at = now(),
    failure_reason = NULL
  WHERE id = p_payment_id;

  -- Create transaction record
  INSERT INTO transactions (
    user_id,
    type,
    amount,
    description,
    status,
    payment_method,
    stripe_payment_intent_id,
    recurring_payment_id
  ) VALUES (
    v_payment.customer_id,
    'payment',
    -v_payment.amount,
    'Recurring booking payment',
    'completed',
    'card',
    p_payment_intent_id,
    p_payment_id
  );

  -- Send success notification
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    reference_id
  ) VALUES (
    v_payment.customer_id,
    'Payment Processed',
    'Your recurring booking payment of $' || v_payment.amount || ' has been successfully processed.',
    'payment_success',
    p_payment_id::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle payment failure
CREATE OR REPLACE FUNCTION handle_recurring_payment_failure(
  p_payment_id uuid,
  p_failure_reason text
)
RETURNS void AS $$
DECLARE
  v_payment recurring_payments%ROWTYPE;
  v_new_retry_count integer;
  v_should_retry boolean;
  v_next_retry timestamptz;
  v_hours_to_add integer;
BEGIN
  -- Get payment details
  SELECT * INTO v_payment
  FROM recurring_payments
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
  END IF;

  v_new_retry_count := v_payment.retry_count + 1;
  v_should_retry := v_new_retry_count < v_payment.max_retries;

  IF v_should_retry THEN
    -- Calculate next retry time with exponential backoff
    -- 1st retry: 1 hour, 2nd retry: 4 hours, 3rd retry: 24 hours
    v_hours_to_add := POWER(4, v_new_retry_count - 1);
    v_next_retry := now() + (v_hours_to_add || ' hours')::interval;

    -- Update for retry
    UPDATE recurring_payments
    SET
      status = 'pending',
      failure_reason = p_failure_reason,
      retry_count = v_new_retry_count,
      next_retry_at = v_next_retry
    WHERE id = p_payment_id;

    -- Notify customer about retry
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      reference_id
    ) VALUES (
      v_payment.customer_id,
      'Payment Retry Scheduled',
      'Your recurring payment failed. We''ll retry automatically on ' ||
        TO_CHAR(v_next_retry, 'Mon DD, YYYY at HH24:MI') ||
        '. Please ensure your payment method is valid. Reason: ' || p_failure_reason,
      'payment_failed',
      p_payment_id::text
    );
  ELSE
    -- Max retries reached, mark as failed
    UPDATE recurring_payments
    SET
      status = 'failed',
      failure_reason = p_failure_reason
    WHERE id = p_payment_id;

    -- Pause the recurring booking
    UPDATE recurring_bookings
    SET is_active = false
    WHERE id = v_payment.recurring_booking_id;

    -- Notify customer about permanent failure
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      reference_id
    ) VALUES (
      v_payment.customer_id,
      'Recurring Payment Failed',
      'Your recurring booking payment could not be processed after ' ||
        v_payment.max_retries || ' attempts. Your recurring booking has been paused. ' ||
        'Please update your payment method and resume the booking. Reason: ' || p_failure_reason,
      'payment_failed',
      p_payment_id::text
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to automatically create payment when booking is created
CREATE OR REPLACE FUNCTION create_recurring_payment_for_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_recurring recurring_bookings%ROWTYPE;
BEGIN
  -- Only create payment for bookings from recurring series
  IF NEW.recurring_booking_id IS NOT NULL THEN
    -- Get recurring booking details
    SELECT * INTO v_recurring
    FROM recurring_bookings
    WHERE id = NEW.recurring_booking_id;

    IF FOUND AND v_recurring.payment_method_id IS NOT NULL THEN
      -- Create recurring payment
      INSERT INTO recurring_payments (
        recurring_booking_id,
        customer_id,
        payment_method_id,
        amount,
        currency,
        status,
        retry_count,
        max_retries
      ) VALUES (
        v_recurring.id,
        NEW.customer_id,
        v_recurring.payment_method_id,
        NEW.total_price,
        'usd',
        'pending',
        0,
        3
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create payments
DROP TRIGGER IF EXISTS create_recurring_payment_trigger ON bookings;
CREATE TRIGGER create_recurring_payment_trigger
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_recurring_payment_for_booking();

-- Create view for payment summary
CREATE OR REPLACE VIEW recurring_payment_summary AS
SELECT
  rp.id,
  rp.recurring_booking_id,
  rp.customer_id,
  rp.amount,
  rp.status,
  rp.retry_count,
  rp.next_retry_at,
  rp.charged_at,
  rp.created_at,
  -- Recurring booking info
  rb.service_title,
  rb.provider_id,
  -- Customer info
  c.full_name AS customer_name,
  c.email AS customer_email,
  -- Provider info
  p.full_name AS provider_name,
  -- Transaction info
  t.id AS transaction_id,
  t.status AS transaction_status
FROM recurring_payments rp
LEFT JOIN recurring_bookings rb ON rb.id = rp.recurring_booking_id
LEFT JOIN profiles c ON c.id = rp.customer_id
LEFT JOIN profiles p ON p.id = rb.provider_id
LEFT JOIN transactions t ON t.recurring_payment_id = rp.id;

-- Grant access to view
GRANT SELECT ON recurring_payment_summary TO authenticated;

-- Create function to get payment statistics
CREATE OR REPLACE FUNCTION get_recurring_payment_stats(p_customer_id uuid)
RETURNS TABLE (
  total_paid numeric,
  total_pending numeric,
  total_failed numeric,
  success_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0) AS total_paid,
    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS total_pending,
    COALESCE(SUM(amount) FILTER (WHERE status = 'failed'), 0) AS total_failed,
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('succeeded', 'failed')) > 0 THEN
        (COUNT(*) FILTER (WHERE status = 'succeeded')::numeric /
         COUNT(*) FILTER (WHERE status IN ('succeeded', 'failed'))::numeric) * 100
      ELSE 0
    END AS success_rate
  FROM recurring_payments
  WHERE customer_id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
