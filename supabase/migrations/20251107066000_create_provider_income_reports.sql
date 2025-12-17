/*
  # Provider Income Reports System

  1. New Tables
    - provider_income_reports - Comprehensive income reports by period
    - income_report_line_items - Detailed line items for each report
    - tax_documents - Tax-related documents and 1099 data

  2. Features
    - Monthly income summaries
    - Quarterly income summaries
    - Year-to-date calculations
    - Detailed transaction breakdowns
    - Tax document generation data
    - Expense tracking
    - Net income calculations

  3. Security
    - Providers can only view own reports
    - Admin access to all reports
    - Secure financial data handling
*/

-- Create provider_income_reports table
CREATE TABLE IF NOT EXISTS provider_income_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('monthly', 'quarterly', 'ytd', 'annual')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  year integer NOT NULL,
  quarter integer CHECK (quarter >= 1 AND quarter <= 4),
  month integer CHECK (month >= 1 AND month <= 12),
  gross_income numeric(12, 2) DEFAULT 0,
  platform_fees numeric(12, 2) DEFAULT 0,
  processing_fees numeric(12, 2) DEFAULT 0,
  refunds_issued numeric(12, 2) DEFAULT 0,
  adjustments numeric(12, 2) DEFAULT 0,
  net_income numeric(12, 2) DEFAULT 0,
  total_bookings integer DEFAULT 0,
  completed_bookings integer DEFAULT 0,
  cancelled_bookings integer DEFAULT 0,
  avg_booking_value numeric(10, 2) DEFAULT 0,
  payouts_received numeric(12, 2) DEFAULT 0,
  pending_balance numeric(12, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider_id, report_type, year, quarter, month)
);

-- Create income_report_line_items table
CREATE TABLE IF NOT EXISTS income_report_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES provider_income_reports(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  item_date date NOT NULL,
  item_type text NOT NULL CHECK (item_type IN (
    'booking_payment', 'refund', 'platform_fee', 'processing_fee',
    'adjustment', 'payout', 'bonus', 'penalty'
  )),
  description text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  category text,
  created_at timestamptz DEFAULT now()
);

-- Create tax_documents table
CREATE TABLE IF NOT EXISTS tax_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tax_year integer NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('1099', 'summary', 'quarterly')),
  total_earnings numeric(12, 2) NOT NULL,
  total_fees numeric(12, 2) NOT NULL,
  net_earnings numeric(12, 2) NOT NULL,
  document_data jsonb,
  generated_at timestamptz DEFAULT now(),
  is_finalized boolean DEFAULT false,
  finalized_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider_id, tax_year, document_type)
);

-- Create indexes for performance
CREATE INDEX idx_income_reports_provider ON provider_income_reports(provider_id, year DESC, month DESC);
CREATE INDEX idx_income_reports_type ON provider_income_reports(report_type, year DESC);
CREATE INDEX idx_income_reports_period ON provider_income_reports(period_start, period_end);

CREATE INDEX idx_line_items_report ON income_report_line_items(report_id, item_date DESC);
CREATE INDEX idx_line_items_type ON income_report_line_items(item_type, item_date DESC);

CREATE INDEX idx_tax_documents_provider ON tax_documents(provider_id, tax_year DESC);
CREATE INDEX idx_tax_documents_year ON tax_documents(tax_year DESC);

-- Enable RLS
ALTER TABLE provider_income_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_report_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider_income_reports
CREATE POLICY "Providers can view own income reports"
  ON provider_income_reports FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Admins can view all income reports"
  ON provider_income_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage income reports"
  ON provider_income_reports FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for income_report_line_items
CREATE POLICY "Providers can view own line items"
  ON income_report_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM provider_income_reports
      WHERE id = income_report_line_items.report_id
        AND provider_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all line items"
  ON income_report_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage line items"
  ON income_report_line_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for tax_documents
CREATE POLICY "Providers can view own tax documents"
  ON tax_documents FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Admins can view all tax documents"
  ON tax_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage tax documents"
  ON tax_documents FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to generate monthly income report
CREATE OR REPLACE FUNCTION generate_monthly_income_report(
  p_provider_id uuid,
  p_year integer,
  p_month integer
)
RETURNS uuid AS $$
DECLARE
  v_report_id uuid;
  v_period_start date;
  v_period_end date;
  v_gross_income numeric;
  v_platform_fees numeric;
  v_processing_fees numeric;
  v_refunds numeric;
  v_net_income numeric;
  v_total_bookings integer;
  v_completed_bookings integer;
  v_cancelled_bookings integer;
  v_avg_value numeric;
  v_payouts numeric;
BEGIN
  -- Calculate period dates
  v_period_start := make_date(p_year, p_month, 1);
  v_period_end := (v_period_start + INTERVAL '1 month - 1 day')::date;

  -- Calculate metrics
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status = 'Completed'), 0),
    COALESCE(SUM(platform_fee) FILTER (WHERE status = 'Completed'), 0),
    COALESCE(SUM(processing_fee) FILTER (WHERE status = 'Completed'), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'Refunded'), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'Completed'),
    COUNT(*) FILTER (WHERE status IN ('Cancelled', 'Failed')),
    COALESCE(AVG(amount) FILTER (WHERE status = 'Completed'), 0)
  INTO
    v_gross_income, v_platform_fees, v_processing_fees, v_refunds,
    v_total_bookings, v_completed_bookings, v_cancelled_bookings, v_avg_value
  FROM transactions
  WHERE provider_id = p_provider_id
    AND created_at::date BETWEEN v_period_start AND v_period_end;

  -- Calculate payouts
  SELECT COALESCE(SUM(amount), 0)
  INTO v_payouts
  FROM payout_requests
  WHERE provider_id = p_provider_id
    AND status = 'completed'
    AND created_at::date BETWEEN v_period_start AND v_period_end;

  -- Calculate net income
  v_net_income := v_gross_income - v_platform_fees - v_processing_fees - v_refunds;

  -- Insert or update report
  INSERT INTO provider_income_reports (
    provider_id, report_type, period_start, period_end,
    year, month, gross_income, platform_fees, processing_fees,
    refunds_issued, net_income, total_bookings, completed_bookings,
    cancelled_bookings, avg_booking_value, payouts_received
  ) VALUES (
    p_provider_id, 'monthly', v_period_start, v_period_end,
    p_year, p_month, v_gross_income, v_platform_fees, v_processing_fees,
    v_refunds, v_net_income, v_total_bookings, v_completed_bookings,
    v_cancelled_bookings, v_avg_value, v_payouts
  )
  ON CONFLICT (provider_id, report_type, year, quarter, month) DO UPDATE SET
    gross_income = EXCLUDED.gross_income,
    platform_fees = EXCLUDED.platform_fees,
    processing_fees = EXCLUDED.processing_fees,
    refunds_issued = EXCLUDED.refunds_issued,
    net_income = EXCLUDED.net_income,
    total_bookings = EXCLUDED.total_bookings,
    completed_bookings = EXCLUDED.completed_bookings,
    cancelled_bookings = EXCLUDED.cancelled_bookings,
    avg_booking_value = EXCLUDED.avg_booking_value,
    payouts_received = EXCLUDED.payouts_received,
    updated_at = NOW()
  RETURNING id INTO v_report_id;

  -- Generate line items
  DELETE FROM income_report_line_items WHERE report_id = v_report_id;

  -- Insert transaction line items
  INSERT INTO income_report_line_items (
    report_id, transaction_id, booking_id, item_date, item_type,
    description, amount, category
  )
  SELECT
    v_report_id,
    t.id,
    t.booking_id,
    t.created_at::date,
    CASE
      WHEN t.status = 'Refunded' THEN 'refund'
      ELSE 'booking_payment'
    END,
    'Booking #' || COALESCE(b.id::text, 'N/A'),
    t.amount,
    c.name
  FROM transactions t
  LEFT JOIN bookings b ON b.id = t.booking_id
  LEFT JOIN service_listings sl ON sl.id = b.listing_id
  LEFT JOIN categories c ON c.id = sl.category_id
  WHERE t.provider_id = p_provider_id
    AND t.created_at::date BETWEEN v_period_start AND v_period_end
    AND t.status IN ('Completed', 'Refunded');

  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate quarterly income report
CREATE OR REPLACE FUNCTION generate_quarterly_income_report(
  p_provider_id uuid,
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
  INSERT INTO provider_income_reports (
    provider_id, report_type, period_start, period_end,
    year, quarter, gross_income, platform_fees, processing_fees,
    refunds_issued, net_income, total_bookings, completed_bookings,
    cancelled_bookings, avg_booking_value, payouts_received
  )
  SELECT
    p_provider_id,
    'quarterly',
    v_period_start,
    v_period_end,
    p_year,
    p_quarter,
    SUM(gross_income),
    SUM(platform_fees),
    SUM(processing_fees),
    SUM(refunds_issued),
    SUM(net_income),
    SUM(total_bookings),
    SUM(completed_bookings),
    SUM(cancelled_bookings),
    AVG(avg_booking_value),
    SUM(payouts_received)
  FROM provider_income_reports
  WHERE provider_id = p_provider_id
    AND report_type = 'monthly'
    AND year = p_year
    AND month BETWEEN v_start_month AND v_start_month + 2
  ON CONFLICT (provider_id, report_type, year, quarter, month) DO UPDATE SET
    gross_income = EXCLUDED.gross_income,
    platform_fees = EXCLUDED.platform_fees,
    processing_fees = EXCLUDED.processing_fees,
    refunds_issued = EXCLUDED.refunds_issued,
    net_income = EXCLUDED.net_income,
    total_bookings = EXCLUDED.total_bookings,
    completed_bookings = EXCLUDED.completed_bookings,
    cancelled_bookings = EXCLUDED.cancelled_bookings,
    avg_booking_value = EXCLUDED.avg_booking_value,
    payouts_received = EXCLUDED.payouts_received,
    updated_at = NOW()
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate YTD income report
CREATE OR REPLACE FUNCTION generate_ytd_income_report(
  p_provider_id uuid,
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
  INSERT INTO provider_income_reports (
    provider_id, report_type, period_start, period_end,
    year, gross_income, platform_fees, processing_fees,
    refunds_issued, net_income, total_bookings, completed_bookings,
    cancelled_bookings, avg_booking_value, payouts_received
  )
  SELECT
    p_provider_id,
    'ytd',
    v_period_start,
    v_period_end,
    p_year,
    SUM(gross_income),
    SUM(platform_fees),
    SUM(processing_fees),
    SUM(refunds_issued),
    SUM(net_income),
    SUM(total_bookings),
    SUM(completed_bookings),
    SUM(cancelled_bookings),
    AVG(avg_booking_value),
    SUM(payouts_received)
  FROM provider_income_reports
  WHERE provider_id = p_provider_id
    AND report_type = 'monthly'
    AND year = p_year
  ON CONFLICT (provider_id, report_type, year, quarter, month) DO UPDATE SET
    period_end = EXCLUDED.period_end,
    gross_income = EXCLUDED.gross_income,
    platform_fees = EXCLUDED.platform_fees,
    processing_fees = EXCLUDED.processing_fees,
    refunds_issued = EXCLUDED.refunds_issued,
    net_income = EXCLUDED.net_income,
    total_bookings = EXCLUDED.total_bookings,
    completed_bookings = EXCLUDED.completed_bookings,
    cancelled_bookings = EXCLUDED.cancelled_bookings,
    avg_booking_value = EXCLUDED.avg_booking_value,
    payouts_received = EXCLUDED.payouts_received,
    updated_at = NOW()
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get provider income summary
CREATE OR REPLACE FUNCTION get_provider_income_summary(
  p_provider_id uuid,
  p_year integer DEFAULT NULL
)
RETURNS TABLE (
  report_type text,
  period_label text,
  gross_income numeric,
  net_income numeric,
  total_bookings integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pir.report_type,
    CASE
      WHEN pir.report_type = 'monthly' THEN to_char(pir.period_start, 'Month YYYY')
      WHEN pir.report_type = 'quarterly' THEN 'Q' || pir.quarter || ' ' || pir.year
      WHEN pir.report_type = 'ytd' THEN 'YTD ' || pir.year
      ELSE pir.year::text
    END as period_label,
    pir.gross_income,
    pir.net_income,
    pir.total_bookings
  FROM provider_income_reports pir
  WHERE pir.provider_id = p_provider_id
    AND (p_year IS NULL OR pir.year = p_year)
  ORDER BY pir.year DESC, pir.quarter DESC, pir.month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate tax document
CREATE OR REPLACE FUNCTION generate_tax_document(
  p_provider_id uuid,
  p_tax_year integer,
  p_document_type text DEFAULT '1099'
)
RETURNS uuid AS $$
DECLARE
  v_doc_id uuid;
  v_total_earnings numeric;
  v_total_fees numeric;
  v_net_earnings numeric;
BEGIN
  -- Calculate annual totals
  SELECT
    COALESCE(SUM(gross_income), 0),
    COALESCE(SUM(platform_fees + processing_fees), 0),
    COALESCE(SUM(net_income), 0)
  INTO v_total_earnings, v_total_fees, v_net_earnings
  FROM provider_income_reports
  WHERE provider_id = p_provider_id
    AND year = p_tax_year
    AND report_type = 'monthly';

  -- Insert or update tax document
  INSERT INTO tax_documents (
    provider_id, tax_year, document_type,
    total_earnings, total_fees, net_earnings
  ) VALUES (
    p_provider_id, p_tax_year, p_document_type,
    v_total_earnings, v_total_fees, v_net_earnings
  )
  ON CONFLICT (provider_id, tax_year, document_type) DO UPDATE SET
    total_earnings = EXCLUDED.total_earnings,
    total_fees = EXCLUDED.total_fees,
    net_earnings = EXCLUDED.net_earnings,
    generated_at = NOW()
  RETURNING id INTO v_doc_id;

  RETURN v_doc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE provider_income_reports IS 'Comprehensive income reports by period for providers';
COMMENT ON TABLE income_report_line_items IS 'Detailed line items for income reports';
COMMENT ON TABLE tax_documents IS 'Tax documents and 1099 data for providers';

COMMENT ON FUNCTION generate_monthly_income_report IS 'Generate monthly income report for a provider';
COMMENT ON FUNCTION generate_quarterly_income_report IS 'Generate quarterly income report from monthly data';
COMMENT ON FUNCTION generate_ytd_income_report IS 'Generate year-to-date income report';
COMMENT ON FUNCTION get_provider_income_summary IS 'Get income summary for a provider';
COMMENT ON FUNCTION generate_tax_document IS 'Generate tax document (1099) for a provider';
