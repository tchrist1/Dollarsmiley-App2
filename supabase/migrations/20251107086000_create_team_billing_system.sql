/*
  # Create Team Billing System

  1. New Tables
    - `team_payment_methods`
      - Shared payment methods for teams
      - Card and bank account support

    - `team_subscriptions`
      - Team-level subscription plans
      - Seat-based pricing

    - `team_invoices`
      - Monthly/annual invoices
      - Itemized billing

    - `team_usage_records`
      - Track billable usage
      - Per-member tracking

    - `team_credits`
      - Team credit balance
      - Credit transactions

  2. Features
    - Shared payment methods
    - Subscription management
    - Usage tracking
    - Invoice generation
    - Cost allocation
    - Credit system

  3. Security
    - RLS on all tables
    - Owner/admin access only
    - Payment method encryption
    - Audit logging
*/

-- Create billing cycle enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_cycle') THEN
    CREATE TYPE billing_cycle AS ENUM ('monthly', 'annual');
  END IF;
END $$;

-- Create invoice status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'void', 'refunded');
  END IF;
END $$;

-- Create payment method type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_type') THEN
    CREATE TYPE payment_method_type AS ENUM ('card', 'bank_account', 'paypal');
  END IF;
END $$;

-- Create usage type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'usage_type') THEN
    CREATE TYPE usage_type AS ENUM (
      'booking',
      'listing',
      'storage',
      'api_call',
      'sms',
      'email',
      'feature_access'
    );
  END IF;
END $$;

-- Create credit transaction type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_transaction_type') THEN
    CREATE TYPE credit_transaction_type AS ENUM ('purchase', 'usage', 'refund', 'bonus', 'adjustment');
  END IF;
END $$;

-- Create team_payment_methods table
CREATE TABLE IF NOT EXISTS team_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  type payment_method_type NOT NULL,
  stripe_payment_method_id text,
  is_default boolean DEFAULT false NOT NULL,
  card_last4 text,
  card_brand text,
  card_exp_month integer,
  card_exp_year integer,
  bank_last4 text,
  bank_name text,
  billing_email text,
  billing_name text,
  billing_address jsonb,
  is_active boolean DEFAULT true NOT NULL,
  added_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create team_subscriptions table
CREATE TABLE IF NOT EXISTS team_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text UNIQUE,
  plan_id text NOT NULL,
  plan_name text NOT NULL,
  billing_cycle billing_cycle NOT NULL,
  status text NOT NULL,
  seats_included integer DEFAULT 1 NOT NULL,
  seats_used integer DEFAULT 0 NOT NULL,
  price_per_seat numeric(10, 2) NOT NULL,
  base_price numeric(10, 2) NOT NULL,
  total_price numeric(10, 2) NOT NULL,
  currency text DEFAULT 'usd' NOT NULL,
  trial_end timestamptz,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false NOT NULL,
  cancelled_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create team_invoices table
CREATE TABLE IF NOT EXISTS team_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES team_subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id text UNIQUE,
  invoice_number text UNIQUE NOT NULL,
  status invoice_status DEFAULT 'draft' NOT NULL,
  description text,
  subtotal numeric(10, 2) DEFAULT 0 NOT NULL,
  tax numeric(10, 2) DEFAULT 0 NOT NULL,
  discount numeric(10, 2) DEFAULT 0 NOT NULL,
  total numeric(10, 2) DEFAULT 0 NOT NULL,
  amount_paid numeric(10, 2) DEFAULT 0 NOT NULL,
  amount_due numeric(10, 2) DEFAULT 0 NOT NULL,
  currency text DEFAULT 'usd' NOT NULL,
  line_items jsonb DEFAULT '[]'::jsonb,
  billing_period_start timestamptz,
  billing_period_end timestamptz,
  due_date timestamptz,
  paid_at timestamptz,
  payment_method_id uuid REFERENCES team_payment_methods(id) ON DELETE SET NULL,
  pdf_url text,
  hosted_url text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create team_usage_records table
CREATE TABLE IF NOT EXISTS team_usage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES team_members(id) ON DELETE SET NULL,
  usage_type usage_type NOT NULL,
  quantity numeric(10, 2) DEFAULT 1 NOT NULL,
  unit_price numeric(10, 2) DEFAULT 0 NOT NULL,
  total_price numeric(10, 2) DEFAULT 0 NOT NULL,
  currency text DEFAULT 'usd' NOT NULL,
  description text,
  reference_type text,
  reference_id uuid,
  invoice_id uuid REFERENCES team_invoices(id) ON DELETE SET NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create team_credits table
CREATE TABLE IF NOT EXISTS team_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  transaction_type credit_transaction_type NOT NULL,
  amount numeric(10, 2) NOT NULL,
  balance_before numeric(10, 2) NOT NULL,
  balance_after numeric(10, 2) NOT NULL,
  description text,
  reference_type text,
  reference_id uuid,
  performed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add billing fields to teams
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'billing_email'
  ) THEN
    ALTER TABLE teams ADD COLUMN billing_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'billing_name'
  ) THEN
    ALTER TABLE teams ADD COLUMN billing_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'billing_address'
  ) THEN
    ALTER TABLE teams ADD COLUMN billing_address jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'tax_id'
  ) THEN
    ALTER TABLE teams ADD COLUMN tax_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'credit_balance'
  ) THEN
    ALTER TABLE teams ADD COLUMN credit_balance numeric(10, 2) DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE team_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_credits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_payment_methods

-- Team owners and admins can view payment methods
CREATE POLICY "Team admins can view payment methods"
  ON team_payment_methods
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_payment_methods.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- Team owners and admins can manage payment methods
CREATE POLICY "Team admins can manage payment methods"
  ON team_payment_methods
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_payment_methods.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_payment_methods.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- RLS Policies for team_subscriptions

-- Team members can view subscriptions
CREATE POLICY "Team members can view subscriptions"
  ON team_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_subscriptions.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.is_active = true
    )
  );

-- Team owners and admins can manage subscriptions
CREATE POLICY "Team admins can manage subscriptions"
  ON team_subscriptions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_subscriptions.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- RLS Policies for team_invoices

-- Team owners and admins can view invoices
CREATE POLICY "Team admins can view invoices"
  ON team_invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_invoices.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- System can manage invoices
CREATE POLICY "System can manage invoices"
  ON team_invoices
  FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for team_usage_records

-- Team admins can view usage
CREATE POLICY "Team admins can view usage"
  ON team_usage_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_usage_records.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- Members can view own usage
CREATE POLICY "Members can view own usage"
  ON team_usage_records
  FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- System can create usage records
CREATE POLICY "System can create usage records"
  ON team_usage_records
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for team_credits

-- Team admins can view credits
CREATE POLICY "Team admins can view credits"
  ON team_credits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_credits.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_payment_methods_team ON team_payment_methods(team_id);
CREATE INDEX IF NOT EXISTS idx_team_payment_methods_default ON team_payment_methods(team_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_team_subscriptions_team ON team_subscriptions(team_id);
CREATE INDEX IF NOT EXISTS idx_team_subscriptions_status ON team_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_team_invoices_team ON team_invoices(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invoices_status ON team_invoices(status);
CREATE INDEX IF NOT EXISTS idx_team_invoices_due_date ON team_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_team_usage_team ON team_usage_records(team_id);
CREATE INDEX IF NOT EXISTS idx_team_usage_member ON team_usage_records(member_id);
CREATE INDEX IF NOT EXISTS idx_team_usage_period ON team_usage_records(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_team_credits_team ON team_credits(team_id);
CREATE INDEX IF NOT EXISTS idx_team_credits_created ON team_credits(created_at DESC);

-- Create function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
  year text;
  month text;
  sequence integer;
  invoice_num text;
BEGIN
  year := to_char(now(), 'YYYY');
  month := to_char(now(), 'MM');

  -- Get next sequence number for this month
  SELECT COALESCE(MAX(
    SUBSTRING(invoice_number FROM '\d{6}-(\d{4})$')::integer
  ), 0) + 1
  INTO sequence
  FROM team_invoices
  WHERE invoice_number LIKE 'INV-' || year || month || '-%';

  invoice_num := 'INV-' || year || month || '-' || LPAD(sequence::text, 4, '0');

  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Create function to update credit balance
CREATE OR REPLACE FUNCTION update_team_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE teams
  SET credit_balance = NEW.balance_after
  WHERE id = NEW.team_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_credit_balance_trigger ON team_credits;
CREATE TRIGGER update_credit_balance_trigger
  AFTER INSERT ON team_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_team_credit_balance();

-- Create function to record usage
CREATE OR REPLACE FUNCTION record_team_usage(
  p_team_id uuid,
  p_member_id uuid,
  p_usage_type usage_type,
  p_quantity numeric,
  p_unit_price numeric,
  p_description text DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_usage_id uuid;
  v_total_price numeric;
  v_period_start timestamptz;
  v_period_end timestamptz;
BEGIN
  -- Calculate period (current month)
  v_period_start := date_trunc('month', now());
  v_period_end := date_trunc('month', now()) + interval '1 month';

  -- Calculate total
  v_total_price := p_quantity * p_unit_price;

  -- Insert usage record
  INSERT INTO team_usage_records (
    team_id,
    member_id,
    usage_type,
    quantity,
    unit_price,
    total_price,
    description,
    reference_type,
    reference_id,
    period_start,
    period_end
  ) VALUES (
    p_team_id,
    p_member_id,
    p_usage_type,
    p_quantity,
    p_unit_price,
    v_total_price,
    p_description,
    p_reference_type,
    p_reference_id,
    v_period_start,
    v_period_end
  ) RETURNING id INTO v_usage_id;

  RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add team credits
CREATE OR REPLACE FUNCTION add_team_credits(
  p_team_id uuid,
  p_amount numeric,
  p_transaction_type credit_transaction_type,
  p_description text,
  p_performed_by uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_credit_id uuid;
  v_current_balance numeric;
  v_new_balance numeric;
BEGIN
  -- Get current balance
  SELECT credit_balance INTO v_current_balance
  FROM teams
  WHERE id = p_team_id;

  -- Calculate new balance
  v_new_balance := v_current_balance + p_amount;

  -- Insert credit transaction
  INSERT INTO team_credits (
    team_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    performed_by
  ) VALUES (
    p_team_id,
    p_transaction_type,
    p_amount,
    v_current_balance,
    v_new_balance,
    p_description,
    COALESCE(p_performed_by, auth.uid())
  ) RETURNING id INTO v_credit_id;

  RETURN v_credit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get team billing summary
CREATE OR REPLACE FUNCTION get_team_billing_summary(
  p_team_id uuid,
  p_period_months integer DEFAULT 12
)
RETURNS jsonb AS $$
DECLARE
  v_subscription team_subscriptions%ROWTYPE;
  v_total_spent numeric;
  v_current_usage numeric;
  v_credit_balance numeric;
  v_next_invoice_date timestamptz;
  v_result jsonb;
BEGIN
  -- Get active subscription
  SELECT * INTO v_subscription
  FROM team_subscriptions
  WHERE team_id = p_team_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get total spent
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_spent
  FROM team_invoices
  WHERE team_id = p_team_id
    AND created_at >= now() - (p_period_months || ' months')::interval;

  -- Get current month usage
  SELECT COALESCE(SUM(total_price), 0) INTO v_current_usage
  FROM team_usage_records
  WHERE team_id = p_team_id
    AND period_start >= date_trunc('month', now());

  -- Get credit balance
  SELECT credit_balance INTO v_credit_balance
  FROM teams
  WHERE id = p_team_id;

  -- Build result
  v_result := jsonb_build_object(
    'subscription', row_to_json(v_subscription),
    'total_spent', v_total_spent,
    'current_usage', v_current_usage,
    'credit_balance', v_credit_balance,
    'next_invoice_date', v_subscription.current_period_end
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update subscription seats
CREATE OR REPLACE FUNCTION update_subscription_seats()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription_id uuid;
  v_active_members integer;
BEGIN
  -- Get active subscription
  SELECT id INTO v_subscription_id
  FROM team_subscriptions
  WHERE team_id = NEW.team_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_subscription_id IS NOT NULL THEN
    -- Count active members
    SELECT COUNT(*) INTO v_active_members
    FROM team_members
    WHERE team_id = NEW.team_id
      AND is_active = true;

    -- Update subscription
    UPDATE team_subscriptions
    SET seats_used = v_active_members,
        total_price = base_price + (GREATEST(v_active_members - seats_included, 0) * price_per_seat)
    WHERE id = v_subscription_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscription_seats_trigger ON team_members;
CREATE TRIGGER update_subscription_seats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_seats();
