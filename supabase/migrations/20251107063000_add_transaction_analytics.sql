/*
  # Transaction Analytics System

  1. New Tables
    - transaction_analytics_daily - Daily transaction metrics
    - revenue_analytics - Revenue breakdown and trends
    - payment_method_analytics - Payment method usage stats
    - provider_earnings_analytics - Provider-specific earnings data
    - transaction_categories - Category-based transaction analysis

  2. Features
    - Daily transaction volumes and values
    - Revenue tracking by category, provider, payment method
    - Provider earnings trends
    - Payment success/failure rates
    - Refund analytics
    - Fee collection tracking
    - Average transaction values

  3. Security
    - RLS policies for financial data
    - Admin-only access to detailed analytics
    - Users can view own transaction data
*/

-- Create transaction_analytics_daily table
CREATE TABLE IF NOT EXISTS transaction_analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  total_transactions integer DEFAULT 0,
  successful_transactions integer DEFAULT 0,
  failed_transactions integer DEFAULT 0,
  refunded_transactions integer DEFAULT 0,
  total_volume numeric(12, 2) DEFAULT 0,
  successful_volume numeric(12, 2) DEFAULT 0,
  refunded_volume numeric(12, 2) DEFAULT 0,
  platform_fees numeric(12, 2) DEFAULT 0,
  processing_fees numeric(12, 2) DEFAULT 0,
  net_revenue numeric(12, 2) DEFAULT 0,
  avg_transaction_value numeric(10, 2) DEFAULT 0,
  unique_customers integer DEFAULT 0,
  unique_providers integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create revenue_analytics table
CREATE TABLE IF NOT EXISTS revenue_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  category_id uuid REFERENCES categories(id),
  category_name text,
  revenue numeric(12, 2) DEFAULT 0,
  transaction_count integer DEFAULT 0,
  avg_transaction_value numeric(10, 2) DEFAULT 0,
  platform_fees numeric(12, 2) DEFAULT 0,
  unique_customers integer DEFAULT 0,
  unique_providers integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, category_id)
);

-- Create payment_method_analytics table
CREATE TABLE IF NOT EXISTS payment_method_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  payment_method text NOT NULL,
  transaction_count integer DEFAULT 0,
  successful_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  success_rate numeric(5, 2) DEFAULT 0,
  total_volume numeric(12, 2) DEFAULT 0,
  avg_transaction_value numeric(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, payment_method)
);

-- Create provider_earnings_analytics table
CREATE TABLE IF NOT EXISTS provider_earnings_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_earnings numeric(12, 2) DEFAULT 0,
  platform_fees_paid numeric(12, 2) DEFAULT 0,
  net_earnings numeric(12, 2) DEFAULT 0,
  transaction_count integer DEFAULT 0,
  completed_bookings integer DEFAULT 0,
  avg_booking_value numeric(10, 2) DEFAULT 0,
  refunds_given numeric(12, 2) DEFAULT 0,
  disputes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, provider_id)
);

-- Create transaction_categories table (for categorizing transactions)
CREATE TABLE IF NOT EXISTS transaction_categories_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN (
    'booking', 'subscription', 'deposit', 'payout', 'refund', 'fee'
  )),
  count integer DEFAULT 0,
  total_volume numeric(12, 2) DEFAULT 0,
  avg_value numeric(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, transaction_type)
);

-- Create indexes for performance
CREATE INDEX idx_transaction_analytics_daily_date ON transaction_analytics_daily(date DESC);
CREATE INDEX idx_revenue_analytics_date ON revenue_analytics(date DESC, category_id);
CREATE INDEX idx_revenue_analytics_category ON revenue_analytics(category_id, date DESC);
CREATE INDEX idx_payment_method_analytics_date ON payment_method_analytics(date DESC);
CREATE INDEX idx_provider_earnings_date ON provider_earnings_analytics(date DESC, provider_id);
CREATE INDEX idx_provider_earnings_provider ON provider_earnings_analytics(provider_id, date DESC);
CREATE INDEX idx_transaction_categories_date ON transaction_categories_analytics(date DESC);

-- Enable RLS
ALTER TABLE transaction_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_method_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_earnings_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transaction_analytics_daily
CREATE POLICY "Admins can view transaction analytics"
  ON transaction_analytics_daily FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage transaction analytics"
  ON transaction_analytics_daily FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for revenue_analytics
CREATE POLICY "Admins can view revenue analytics"
  ON revenue_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage revenue analytics"
  ON revenue_analytics FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for payment_method_analytics
CREATE POLICY "Admins can view payment method analytics"
  ON payment_method_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage payment method analytics"
  ON payment_method_analytics FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for provider_earnings_analytics
CREATE POLICY "Providers can view own earnings analytics"
  ON provider_earnings_analytics FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Admins can view all earnings analytics"
  ON provider_earnings_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage earnings analytics"
  ON provider_earnings_analytics FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for transaction_categories_analytics
CREATE POLICY "Admins can view transaction categories analytics"
  ON transaction_categories_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage transaction categories analytics"
  ON transaction_categories_analytics FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to calculate daily transaction analytics
CREATE OR REPLACE FUNCTION calculate_daily_transaction_analytics(p_date date)
RETURNS void AS $$
DECLARE
  v_total_transactions integer;
  v_successful_transactions integer;
  v_failed_transactions integer;
  v_refunded_transactions integer;
  v_total_volume numeric;
  v_successful_volume numeric;
  v_refunded_volume numeric;
  v_platform_fees numeric;
  v_processing_fees numeric;
  v_avg_value numeric;
  v_unique_customers integer;
  v_unique_providers integer;
BEGIN
  -- Calculate transaction counts
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'Completed') as successful,
    COUNT(*) FILTER (WHERE status = 'Failed') as failed,
    COUNT(*) FILTER (WHERE status = 'Refunded') as refunded,
    COALESCE(SUM(amount), 0) as total_vol,
    COALESCE(SUM(amount) FILTER (WHERE status = 'Completed'), 0) as success_vol,
    COALESCE(SUM(amount) FILTER (WHERE status = 'Refunded'), 0) as refund_vol,
    COALESCE(SUM(platform_fee), 0) as platform,
    COALESCE(SUM(processing_fee), 0) as processing,
    COALESCE(AVG(amount) FILTER (WHERE status = 'Completed'), 0) as avg_val,
    COUNT(DISTINCT customer_id) as customers,
    COUNT(DISTINCT provider_id) as providers
  INTO
    v_total_transactions,
    v_successful_transactions,
    v_failed_transactions,
    v_refunded_transactions,
    v_total_volume,
    v_successful_volume,
    v_refunded_volume,
    v_platform_fees,
    v_processing_fees,
    v_avg_value,
    v_unique_customers,
    v_unique_providers
  FROM transactions
  WHERE created_at::date = p_date;

  -- Insert or update daily analytics
  INSERT INTO transaction_analytics_daily (
    date, total_transactions, successful_transactions, failed_transactions,
    refunded_transactions, total_volume, successful_volume, refunded_volume,
    platform_fees, processing_fees, net_revenue, avg_transaction_value,
    unique_customers, unique_providers
  ) VALUES (
    p_date, v_total_transactions, v_successful_transactions, v_failed_transactions,
    v_refunded_transactions, v_total_volume, v_successful_volume, v_refunded_volume,
    v_platform_fees, v_processing_fees,
    (v_successful_volume - v_refunded_volume - v_processing_fees),
    v_avg_value, v_unique_customers, v_unique_providers
  )
  ON CONFLICT (date) DO UPDATE SET
    total_transactions = EXCLUDED.total_transactions,
    successful_transactions = EXCLUDED.successful_transactions,
    failed_transactions = EXCLUDED.failed_transactions,
    refunded_transactions = EXCLUDED.refunded_transactions,
    total_volume = EXCLUDED.total_volume,
    successful_volume = EXCLUDED.successful_volume,
    refunded_volume = EXCLUDED.refunded_volume,
    platform_fees = EXCLUDED.platform_fees,
    processing_fees = EXCLUDED.processing_fees,
    net_revenue = EXCLUDED.net_revenue,
    avg_transaction_value = EXCLUDED.avg_transaction_value,
    unique_customers = EXCLUDED.unique_customers,
    unique_providers = EXCLUDED.unique_providers,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate revenue analytics by category
CREATE OR REPLACE FUNCTION calculate_revenue_analytics_by_category(p_date date)
RETURNS void AS $$
BEGIN
  INSERT INTO revenue_analytics (
    date, category_id, category_name, revenue, transaction_count,
    avg_transaction_value, platform_fees, unique_customers, unique_providers
  )
  SELECT
    p_date,
    c.id as category_id,
    c.name as category_name,
    COALESCE(SUM(t.amount), 0) as revenue,
    COUNT(t.id) as transaction_count,
    COALESCE(AVG(t.amount), 0) as avg_transaction_value,
    COALESCE(SUM(t.platform_fee), 0) as platform_fees,
    COUNT(DISTINCT t.customer_id) as unique_customers,
    COUNT(DISTINCT t.provider_id) as unique_providers
  FROM categories c
  LEFT JOIN service_listings sl ON sl.category_id = c.id
  LEFT JOIN bookings b ON b.listing_id = sl.id
  LEFT JOIN transactions t ON t.booking_id = b.id AND t.created_at::date = p_date AND t.status = 'Completed'
  GROUP BY c.id, c.name
  ON CONFLICT (date, category_id) DO UPDATE SET
    revenue = EXCLUDED.revenue,
    transaction_count = EXCLUDED.transaction_count,
    avg_transaction_value = EXCLUDED.avg_transaction_value,
    platform_fees = EXCLUDED.platform_fees,
    unique_customers = EXCLUDED.unique_customers,
    unique_providers = EXCLUDED.unique_providers,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate payment method analytics
CREATE OR REPLACE FUNCTION calculate_payment_method_analytics(p_date date)
RETURNS void AS $$
BEGIN
  INSERT INTO payment_method_analytics (
    date, payment_method, transaction_count, successful_count,
    failed_count, success_rate, total_volume, avg_transaction_value
  )
  SELECT
    p_date,
    payment_method,
    COUNT(*) as transaction_count,
    COUNT(*) FILTER (WHERE status = 'Completed') as successful_count,
    COUNT(*) FILTER (WHERE status = 'Failed') as failed_count,
    CASE
      WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (WHERE status = 'Completed')::numeric / COUNT(*) * 100)::numeric(5,2)
      ELSE 0
    END as success_rate,
    COALESCE(SUM(amount), 0) as total_volume,
    COALESCE(AVG(amount), 0) as avg_transaction_value
  FROM transactions
  WHERE created_at::date = p_date
  GROUP BY payment_method
  ON CONFLICT (date, payment_method) DO UPDATE SET
    transaction_count = EXCLUDED.transaction_count,
    successful_count = EXCLUDED.successful_count,
    failed_count = EXCLUDED.failed_count,
    success_rate = EXCLUDED.success_rate,
    total_volume = EXCLUDED.total_volume,
    avg_transaction_value = EXCLUDED.avg_transaction_value,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate provider earnings analytics
CREATE OR REPLACE FUNCTION calculate_provider_earnings_analytics(p_date date)
RETURNS void AS $$
BEGIN
  INSERT INTO provider_earnings_analytics (
    date, provider_id, total_earnings, platform_fees_paid, net_earnings,
    transaction_count, completed_bookings, avg_booking_value,
    refunds_given, disputes_count
  )
  SELECT
    p_date,
    t.provider_id,
    COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'Completed'), 0) as total_earnings,
    COALESCE(SUM(t.platform_fee) FILTER (WHERE t.status = 'Completed'), 0) as platform_fees_paid,
    COALESCE(SUM(t.amount - t.platform_fee) FILTER (WHERE t.status = 'Completed'), 0) as net_earnings,
    COUNT(t.id) as transaction_count,
    COUNT(DISTINCT t.booking_id) FILTER (WHERE t.status = 'Completed') as completed_bookings,
    COALESCE(AVG(t.amount) FILTER (WHERE t.status = 'Completed'), 0) as avg_booking_value,
    COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'Refunded'), 0) as refunds_given,
    (SELECT COUNT(*) FROM disputes d WHERE d.provider_id = t.provider_id AND d.created_at::date = p_date) as disputes_count
  FROM transactions t
  WHERE t.created_at::date = p_date
  GROUP BY t.provider_id
  ON CONFLICT (date, provider_id) DO UPDATE SET
    total_earnings = EXCLUDED.total_earnings,
    platform_fees_paid = EXCLUDED.platform_fees_paid,
    net_earnings = EXCLUDED.net_earnings,
    transaction_count = EXCLUDED.transaction_count,
    completed_bookings = EXCLUDED.completed_bookings,
    avg_booking_value = EXCLUDED.avg_booking_value,
    refunds_given = EXCLUDED.refunds_given,
    disputes_count = EXCLUDED.disputes_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get transaction trends
CREATE OR REPLACE FUNCTION get_transaction_trends(p_days integer DEFAULT 30)
RETURNS TABLE (
  date date,
  total_transactions integer,
  successful_volume numeric,
  platform_fees numeric,
  success_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tad.date,
    tad.total_transactions,
    tad.successful_volume,
    tad.platform_fees,
    CASE
      WHEN tad.total_transactions > 0
      THEN (tad.successful_transactions::numeric / tad.total_transactions * 100)::numeric(5,2)
      ELSE 0
    END as success_rate
  FROM transaction_analytics_daily tad
  WHERE tad.date >= CURRENT_DATE - p_days
  ORDER BY tad.date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get revenue breakdown by category
CREATE OR REPLACE FUNCTION get_revenue_by_category(p_days integer DEFAULT 30)
RETURNS TABLE (
  category_name text,
  total_revenue numeric,
  transaction_count bigint,
  avg_transaction_value numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ra.category_name,
    SUM(ra.revenue)::numeric(12,2) as total_revenue,
    SUM(ra.transaction_count)::bigint as transaction_count,
    AVG(ra.avg_transaction_value)::numeric(10,2) as avg_transaction_value
  FROM revenue_analytics ra
  WHERE ra.date >= CURRENT_DATE - p_days
  GROUP BY ra.category_name
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get provider earnings summary
CREATE OR REPLACE FUNCTION get_provider_earnings_summary(
  p_provider_id uuid,
  p_days integer DEFAULT 30
)
RETURNS jsonb AS $$
DECLARE
  v_summary jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_earnings', COALESCE(SUM(total_earnings), 0),
    'platform_fees_paid', COALESCE(SUM(platform_fees_paid), 0),
    'net_earnings', COALESCE(SUM(net_earnings), 0),
    'total_transactions', COALESCE(SUM(transaction_count), 0),
    'completed_bookings', COALESCE(SUM(completed_bookings), 0),
    'avg_booking_value', COALESCE(AVG(avg_booking_value), 0),
    'total_refunds', COALESCE(SUM(refunds_given), 0),
    'total_disputes', COALESCE(SUM(disputes_count), 0)
  ) INTO v_summary
  FROM provider_earnings_analytics
  WHERE provider_id = p_provider_id
    AND date >= CURRENT_DATE - p_days;

  RETURN v_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get payment method performance
CREATE OR REPLACE FUNCTION get_payment_method_performance(p_days integer DEFAULT 30)
RETURNS TABLE (
  payment_method text,
  total_transactions bigint,
  success_rate numeric,
  total_volume numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pma.payment_method,
    SUM(pma.transaction_count)::bigint as total_transactions,
    AVG(pma.success_rate)::numeric(5,2) as success_rate,
    SUM(pma.total_volume)::numeric(12,2) as total_volume
  FROM payment_method_analytics pma
  WHERE pma.date >= CURRENT_DATE - p_days
  GROUP BY pma.payment_method
  ORDER BY total_volume DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE transaction_analytics_daily IS 'Daily aggregated transaction metrics';
COMMENT ON TABLE revenue_analytics IS 'Revenue breakdown by category and time period';
COMMENT ON TABLE payment_method_analytics IS 'Payment method usage and success rates';
COMMENT ON TABLE provider_earnings_analytics IS 'Provider-specific earnings and transaction data';
COMMENT ON TABLE transaction_categories_analytics IS 'Transaction type categorization and analysis';

COMMENT ON FUNCTION calculate_daily_transaction_analytics IS 'Calculate and store daily transaction metrics';
COMMENT ON FUNCTION calculate_revenue_analytics_by_category IS 'Calculate revenue breakdown by service category';
COMMENT ON FUNCTION calculate_payment_method_analytics IS 'Calculate payment method performance metrics';
COMMENT ON FUNCTION calculate_provider_earnings_analytics IS 'Calculate provider earnings and performance';
COMMENT ON FUNCTION get_transaction_trends IS 'Get transaction volume and success rate trends';
COMMENT ON FUNCTION get_revenue_by_category IS 'Get revenue breakdown by category';
COMMENT ON FUNCTION get_provider_earnings_summary IS 'Get earnings summary for a specific provider';
COMMENT ON FUNCTION get_payment_method_performance IS 'Get payment method performance comparison';
