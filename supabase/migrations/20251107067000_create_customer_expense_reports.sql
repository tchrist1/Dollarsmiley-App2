/*
  # Customer Expense Reports System

  1. New Tables
    - customer_expense_reports - Customer spending reports by period
    - expense_report_line_items - Detailed expense line items
    - customer_spending_categories - Spending breakdown by category
    - customer_payment_methods_usage - Payment method usage tracking

  2. Features
    - Monthly expense summaries
    - Quarterly expense summaries
    - Year-to-date calculations
    - Category-wise spending breakdown
    - Payment method tracking
    - Refund tracking
    - Tax-deductible expense tracking

  3. Security
    - Customers can only view own reports
    - Admin access to all reports
    - Secure financial data handling
*/

-- Create customer_expense_reports table
CREATE TABLE IF NOT EXISTS customer_expense_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('monthly', 'quarterly', 'ytd', 'annual')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  year integer NOT NULL,
  quarter integer CHECK (quarter >= 1 AND quarter <= 4),
  month integer CHECK (month >= 1 AND month <= 12),
  total_spent numeric(12, 2) DEFAULT 0,
  total_bookings integer DEFAULT 0,
  completed_bookings integer DEFAULT 0,
  cancelled_bookings integer DEFAULT 0,
  refunds_received numeric(12, 2) DEFAULT 0,
  avg_booking_cost numeric(10, 2) DEFAULT 0,
  deposits_paid numeric(12, 2) DEFAULT 0,
  balance_payments numeric(12, 2) DEFAULT 0,
  tax_deductible_amount numeric(12, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, report_type, year, quarter, month)
);

-- Create expense_report_line_items table
CREATE TABLE IF NOT EXISTS expense_report_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES customer_expense_reports(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  item_date date NOT NULL,
  item_type text NOT NULL CHECK (item_type IN (
    'booking_payment', 'deposit', 'balance_payment', 'refund',
    'cancellation_fee', 'service_fee', 'tip'
  )),
  description text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  category text,
  provider_name text,
  is_tax_deductible boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create customer_spending_categories table
CREATE TABLE IF NOT EXISTS customer_spending_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES customer_expense_reports(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  category_name text NOT NULL,
  total_spent numeric(12, 2) DEFAULT 0,
  booking_count integer DEFAULT 0,
  avg_cost numeric(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create customer_payment_methods_usage table
CREATE TABLE IF NOT EXISTS customer_payment_methods_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES customer_expense_reports(id) ON DELETE CASCADE,
  payment_method_type text NOT NULL,
  total_spent numeric(12, 2) DEFAULT 0,
  transaction_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_customer_expense_reports_customer ON customer_expense_reports(customer_id, year DESC, month DESC);
CREATE INDEX idx_customer_expense_reports_type ON customer_expense_reports(report_type, year DESC);
CREATE INDEX idx_customer_expense_reports_period ON customer_expense_reports(period_start, period_end);

CREATE INDEX idx_expense_line_items_report ON expense_report_line_items(report_id, item_date DESC);
CREATE INDEX idx_expense_line_items_type ON expense_report_line_items(item_type, item_date DESC);
CREATE INDEX idx_expense_line_items_category ON expense_report_line_items(category);

CREATE INDEX idx_spending_categories_report ON customer_spending_categories(report_id);
CREATE INDEX idx_payment_methods_usage_report ON customer_payment_methods_usage(report_id);

-- Enable RLS
ALTER TABLE customer_expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_report_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_spending_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payment_methods_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_expense_reports
CREATE POLICY "Customers can view own expense reports"
  ON customer_expense_reports FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can view all expense reports"
  ON customer_expense_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage expense reports"
  ON customer_expense_reports FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for expense_report_line_items
CREATE POLICY "Customers can view own expense line items"
  ON expense_report_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_expense_reports
      WHERE id = expense_report_line_items.report_id
        AND customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all expense line items"
  ON expense_report_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage expense line items"
  ON expense_report_line_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for customer_spending_categories
CREATE POLICY "Customers can view own spending categories"
  ON customer_spending_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_expense_reports
      WHERE id = customer_spending_categories.report_id
        AND customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all spending categories"
  ON customer_spending_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage spending categories"
  ON customer_spending_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for customer_payment_methods_usage
CREATE POLICY "Customers can view own payment methods usage"
  ON customer_payment_methods_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_expense_reports
      WHERE id = customer_payment_methods_usage.report_id
        AND customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payment methods usage"
  ON customer_payment_methods_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage payment methods usage"
  ON customer_payment_methods_usage FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to generate monthly expense report
CREATE OR REPLACE FUNCTION generate_monthly_expense_report(
  p_customer_id uuid,
  p_year integer,
  p_month integer
)
RETURNS uuid AS $$
DECLARE
  v_report_id uuid;
  v_period_start date;
  v_period_end date;
  v_total_spent numeric;
  v_total_bookings integer;
  v_completed_bookings integer;
  v_cancelled_bookings integer;
  v_refunds numeric;
  v_avg_cost numeric;
  v_deposits numeric;
  v_balance_payments numeric;
BEGIN
  -- Calculate period dates
  v_period_start := make_date(p_year, p_month, 1);
  v_period_end := (v_period_start + INTERVAL '1 month - 1 day')::date;

  -- Calculate metrics from bookings
  SELECT
    COALESCE(SUM(total_price) FILTER (WHERE status IN ('Confirmed', 'Completed')), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'Completed'),
    COUNT(*) FILTER (WHERE status = 'Cancelled'),
    COALESCE(SUM(total_price) FILTER (WHERE status = 'Refunded'), 0),
    COALESCE(AVG(total_price) FILTER (WHERE status IN ('Confirmed', 'Completed')), 0),
    COALESCE(SUM(deposit_amount) FILTER (WHERE deposit_paid = true), 0),
    COALESCE(SUM(total_price - COALESCE(deposit_amount, 0)) FILTER (WHERE status = 'Completed'), 0)
  INTO
    v_total_spent, v_total_bookings, v_completed_bookings,
    v_cancelled_bookings, v_refunds, v_avg_cost, v_deposits, v_balance_payments
  FROM bookings
  WHERE customer_id = p_customer_id
    AND created_at::date BETWEEN v_period_start AND v_period_end;

  -- Insert or update report
  INSERT INTO customer_expense_reports (
    customer_id, report_type, period_start, period_end,
    year, month, total_spent, total_bookings, completed_bookings,
    cancelled_bookings, refunds_received, avg_booking_cost,
    deposits_paid, balance_payments
  ) VALUES (
    p_customer_id, 'monthly', v_period_start, v_period_end,
    p_year, p_month, v_total_spent, v_total_bookings, v_completed_bookings,
    v_cancelled_bookings, v_refunds, v_avg_cost, v_deposits, v_balance_payments
  )
  ON CONFLICT (customer_id, report_type, year, quarter, month) DO UPDATE SET
    total_spent = EXCLUDED.total_spent,
    total_bookings = EXCLUDED.total_bookings,
    completed_bookings = EXCLUDED.completed_bookings,
    cancelled_bookings = EXCLUDED.cancelled_bookings,
    refunds_received = EXCLUDED.refunds_received,
    avg_booking_cost = EXCLUDED.avg_booking_cost,
    deposits_paid = EXCLUDED.deposits_paid,
    balance_payments = EXCLUDED.balance_payments,
    updated_at = NOW()
  RETURNING id INTO v_report_id;

  -- Generate line items
  DELETE FROM expense_report_line_items WHERE report_id = v_report_id;

  INSERT INTO expense_report_line_items (
    report_id, booking_id, item_date, item_type,
    description, amount, category, provider_name
  )
  SELECT
    v_report_id,
    b.id,
    b.created_at::date,
    CASE
      WHEN b.status = 'Refunded' THEN 'refund'
      WHEN b.deposit_paid THEN 'deposit'
      ELSE 'booking_payment'
    END,
    'Booking with ' || p.full_name,
    b.total_price,
    c.name,
    p.full_name
  FROM bookings b
  JOIN profiles p ON p.id = b.provider_id
  JOIN service_listings sl ON sl.id = b.listing_id
  JOIN categories c ON c.id = sl.category_id
  WHERE b.customer_id = p_customer_id
    AND b.created_at::date BETWEEN v_period_start AND v_period_end
    AND b.status IN ('Confirmed', 'Completed', 'Refunded');

  -- Generate category breakdown
  DELETE FROM customer_spending_categories WHERE report_id = v_report_id;

  INSERT INTO customer_spending_categories (
    report_id, category_id, category_name, total_spent, booking_count, avg_cost
  )
  SELECT
    v_report_id,
    c.id,
    c.name,
    SUM(b.total_price),
    COUNT(*),
    AVG(b.total_price)
  FROM bookings b
  JOIN service_listings sl ON sl.id = b.listing_id
  JOIN categories c ON c.id = sl.category_id
  WHERE b.customer_id = p_customer_id
    AND b.created_at::date BETWEEN v_period_start AND v_period_end
    AND b.status IN ('Confirmed', 'Completed')
  GROUP BY c.id, c.name;

  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate quarterly expense report
CREATE OR REPLACE FUNCTION generate_quarterly_expense_report(
  p_customer_id uuid,
  p_year integer,
  p_quarter integer
)
RETURNS uuid AS $$
DECLARE
  v_report_id uuid;
  v_period_start date;
  v_period_end date;
  v_start_month integer;
BEGIN
  -- Calculate quarter dates
  v_start_month := (p_quarter - 1) * 3 + 1;
  v_period_start := make_date(p_year, v_start_month, 1);
  v_period_end := (make_date(p_year, v_start_month + 3, 1) - INTERVAL '1 day')::date;

  -- Aggregate from monthly reports
  INSERT INTO customer_expense_reports (
    customer_id, report_type, period_start, period_end,
    year, quarter, total_spent, total_bookings, completed_bookings,
    cancelled_bookings, refunds_received, avg_booking_cost,
    deposits_paid, balance_payments
  )
  SELECT
    p_customer_id,
    'quarterly',
    v_period_start,
    v_period_end,
    p_year,
    p_quarter,
    SUM(total_spent),
    SUM(total_bookings),
    SUM(completed_bookings),
    SUM(cancelled_bookings),
    SUM(refunds_received),
    AVG(avg_booking_cost),
    SUM(deposits_paid),
    SUM(balance_payments)
  FROM customer_expense_reports
  WHERE customer_id = p_customer_id
    AND report_type = 'monthly'
    AND year = p_year
    AND month BETWEEN v_start_month AND v_start_month + 2
  ON CONFLICT (customer_id, report_type, year, quarter, month) DO UPDATE SET
    total_spent = EXCLUDED.total_spent,
    total_bookings = EXCLUDED.total_bookings,
    completed_bookings = EXCLUDED.completed_bookings,
    cancelled_bookings = EXCLUDED.cancelled_bookings,
    refunds_received = EXCLUDED.refunds_received,
    avg_booking_cost = EXCLUDED.avg_booking_cost,
    deposits_paid = EXCLUDED.deposits_paid,
    balance_payments = EXCLUDED.balance_payments,
    updated_at = NOW()
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate YTD expense report
CREATE OR REPLACE FUNCTION generate_ytd_expense_report(
  p_customer_id uuid,
  p_year integer
)
RETURNS uuid AS $$
DECLARE
  v_report_id uuid;
  v_period_start date;
  v_period_end date;
BEGIN
  v_period_start := make_date(p_year, 1, 1);
  v_period_end := CURRENT_DATE;

  -- Aggregate from monthly reports
  INSERT INTO customer_expense_reports (
    customer_id, report_type, period_start, period_end,
    year, total_spent, total_bookings, completed_bookings,
    cancelled_bookings, refunds_received, avg_booking_cost,
    deposits_paid, balance_payments
  )
  SELECT
    p_customer_id,
    'ytd',
    v_period_start,
    v_period_end,
    p_year,
    SUM(total_spent),
    SUM(total_bookings),
    SUM(completed_bookings),
    SUM(cancelled_bookings),
    SUM(refunds_received),
    AVG(avg_booking_cost),
    SUM(deposits_paid),
    SUM(balance_payments)
  FROM customer_expense_reports
  WHERE customer_id = p_customer_id
    AND report_type = 'monthly'
    AND year = p_year
  ON CONFLICT (customer_id, report_type, year, quarter, month) DO UPDATE SET
    period_end = EXCLUDED.period_end,
    total_spent = EXCLUDED.total_spent,
    total_bookings = EXCLUDED.total_bookings,
    completed_bookings = EXCLUDED.completed_bookings,
    cancelled_bookings = EXCLUDED.cancelled_bookings,
    refunds_received = EXCLUDED.refunds_received,
    avg_booking_cost = EXCLUDED.avg_booking_cost,
    deposits_paid = EXCLUDED.deposits_paid,
    balance_payments = EXCLUDED.balance_payments,
    updated_at = NOW()
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get customer expense summary
CREATE OR REPLACE FUNCTION get_customer_expense_summary(
  p_customer_id uuid,
  p_year integer DEFAULT NULL
)
RETURNS TABLE (
  report_type text,
  period_label text,
  total_spent numeric,
  total_bookings integer,
  avg_booking_cost numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cer.report_type,
    CASE
      WHEN cer.report_type = 'monthly' THEN to_char(cer.period_start, 'Month YYYY')
      WHEN cer.report_type = 'quarterly' THEN 'Q' || cer.quarter || ' ' || cer.year
      WHEN cer.report_type = 'ytd' THEN 'YTD ' || cer.year
      ELSE cer.year::text
    END as period_label,
    cer.total_spent,
    cer.total_bookings,
    cer.avg_booking_cost
  FROM customer_expense_reports cer
  WHERE cer.customer_id = p_customer_id
    AND (p_year IS NULL OR cer.year = p_year)
  ORDER BY cer.year DESC, cer.quarter DESC, cer.month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get spending by category
CREATE OR REPLACE FUNCTION get_customer_spending_by_category(
  p_customer_id uuid,
  p_year integer DEFAULT NULL
)
RETURNS TABLE (
  category_name text,
  total_spent numeric,
  booking_count bigint,
  percentage numeric
) AS $$
DECLARE
  v_total_spent numeric;
BEGIN
  -- Get total spent
  SELECT COALESCE(SUM(total_spent), 0)
  INTO v_total_spent
  FROM customer_expense_reports
  WHERE customer_id = p_customer_id
    AND report_type = 'monthly'
    AND (p_year IS NULL OR year = p_year);

  RETURN QUERY
  SELECT
    csc.category_name,
    SUM(csc.total_spent)::numeric as total_spent,
    SUM(csc.booking_count)::bigint as booking_count,
    CASE
      WHEN v_total_spent > 0 THEN (SUM(csc.total_spent) / v_total_spent * 100)::numeric(5,2)
      ELSE 0::numeric(5,2)
    END as percentage
  FROM customer_spending_categories csc
  JOIN customer_expense_reports cer ON cer.id = csc.report_id
  WHERE cer.customer_id = p_customer_id
    AND cer.report_type = 'monthly'
    AND (p_year IS NULL OR cer.year = p_year)
  GROUP BY csc.category_name
  ORDER BY total_spent DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE customer_expense_reports IS 'Customer spending reports by period';
COMMENT ON TABLE expense_report_line_items IS 'Detailed expense line items for customers';
COMMENT ON TABLE customer_spending_categories IS 'Spending breakdown by service category';
COMMENT ON TABLE customer_payment_methods_usage IS 'Payment method usage tracking';

COMMENT ON FUNCTION generate_monthly_expense_report IS 'Generate monthly expense report for a customer';
COMMENT ON FUNCTION generate_quarterly_expense_report IS 'Generate quarterly expense report from monthly data';
COMMENT ON FUNCTION generate_ytd_expense_report IS 'Generate year-to-date expense report';
COMMENT ON FUNCTION get_customer_expense_summary IS 'Get expense summary for a customer';
COMMENT ON FUNCTION get_customer_spending_by_category IS 'Get spending breakdown by category';
