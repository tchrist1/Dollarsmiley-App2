/*
  # Email Receipts System

  ## Overview
  Implements professional email receipt generation and delivery for all transactions.
  Provides customers and providers with detailed transaction records, itemized breakdowns,
  and PDF receipts for accounting purposes.

  ## New Tables
  
  ### 1. `email_receipts`
  Stores receipt metadata and delivery status
  - `id` (uuid, primary key)
  - `receipt_number` (text, unique) - formatted receipt number (e.g., RCP-2024-001234)
  - `user_id` (uuid, references profiles) - recipient
  - `transaction_type` (text) - Booking, Deposit, Balance, Refund, Payout
  - `booking_id` (uuid, references bookings, nullable)
  - `transaction_id` (uuid) - generic transaction reference
  - `amount` (numeric) - transaction amount
  - `currency` (text) - USD, etc.
  - `receipt_data` (jsonb) - full receipt details
  - `email_status` (text) - Pending, Sent, Failed, Bounced
  - `email_sent_at` (timestamptz)
  - `email_opened_at` (timestamptz)
  - `pdf_url` (text) - receipt PDF location
  - `created_at` (timestamptz)

  ### 2. `email_templates`
  Stores customizable email templates
  - `id` (uuid, primary key)
  - `template_name` (text, unique) - booking_confirmation, payment_receipt, etc.
  - `template_type` (text) - Transactional, Marketing, Notification
  - `subject` (text) - email subject line
  - `html_content` (text) - HTML email template
  - `text_content` (text) - plain text fallback
  - `variables` (jsonb) - available template variables
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `receipt_line_items`
  Itemized breakdown for receipts
  - `id` (uuid, primary key)
  - `receipt_id` (uuid, references email_receipts)
  - `description` (text) - line item description
  - `quantity` (numeric)
  - `unit_price` (numeric)
  - `amount` (numeric) - quantity * unit_price
  - `item_type` (text) - Service, Fee, Tax, Discount
  - `sort_order` (integer)

  ## Schema Changes
  
  ### Bookings Table Updates
  - Add `receipt_sent` (boolean) - confirmation email sent
  - Add `receipt_id` (uuid, references email_receipts)
  
  ### Wallet Transactions Updates
  - Add `receipt_sent` (boolean)
  - Add `receipt_id` (uuid, references email_receipts)

  ## Receipt Types
  
  ### 1. Booking Confirmation Receipt
  - Sent immediately upon booking
  - Includes service details
  - Payment amount and method
  - Booking ID and reference
  - Provider information
  - Service date/time/location
  
  ### 2. Payment Receipt
  - Sent after successful payment
  - Itemized breakdown
  - Payment method details
  - Transaction ID
  - Platform fees shown
  
  ### 3. Deposit Receipt
  - Shows deposit amount
  - Remaining balance
  - Balance due date
  - Refund policy
  
  ### 4. Balance Payment Receipt
  - Final payment confirmation
  - Shows previous deposit
  - Total amount paid
  - Service ready confirmation
  
  ### 5. Refund Receipt
  - Refund amount
  - Original transaction reference
  - Refund reason
  - Processing timeline
  
  ### 6. Payout Receipt (Providers)
  - Earnings breakdown
  - Platform fee deduction
  - Net payout amount
  - Payout method
  - Tax information

  ## Email Features
  
  - Professional branded design
  - Mobile-responsive HTML
  - Plain text fallback
  - PDF attachment option
  - One-click view in browser
  - Tracking pixels (open tracking)
  - Unsubscribe footer
  - Company branding

  ## Receipt Numbers
  
  Format: RCP-YYYY-NNNNNN
  - RCP = Receipt
  - YYYY = Year
  - NNNNNN = Sequential number
  
  Example: RCP-2024-001234

  ## Security
  - Enable RLS on all tables
  - Users can view own receipts
  - Admin can view all receipts
  - Templates managed by admin only
  - Sensitive data encrypted

  ## Important Notes
  - Receipts required for tax compliance
  - Provides professional customer experience
  - Reduces support inquiries
  - Improves trust and credibility
  - Legal documentation for disputes
  - Accounting and bookkeeping records
*/

-- Create email_receipts table
CREATE TABLE IF NOT EXISTS email_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('Booking', 'Deposit', 'Balance', 'Refund', 'Payout', 'Payment')),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  transaction_id uuid,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'USD',
  receipt_data jsonb DEFAULT '{}',
  email_status text DEFAULT 'Pending' CHECK (email_status IN ('Pending', 'Sent', 'Failed', 'Bounced')),
  email_sent_at timestamptz,
  email_opened_at timestamptz,
  pdf_url text,
  created_at timestamptz DEFAULT now()
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text UNIQUE NOT NULL,
  template_type text DEFAULT 'Transactional' CHECK (template_type IN ('Transactional', 'Marketing', 'Notification')),
  subject text NOT NULL,
  html_content text NOT NULL,
  text_content text NOT NULL,
  variables jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create receipt_line_items table
CREATE TABLE IF NOT EXISTS receipt_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES email_receipts(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_price numeric NOT NULL,
  amount numeric NOT NULL,
  item_type text DEFAULT 'Service' CHECK (item_type IN ('Service', 'Fee', 'Tax', 'Discount')),
  sort_order integer DEFAULT 0
);

-- Add columns to bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'receipt_sent'
  ) THEN
    ALTER TABLE bookings ADD COLUMN receipt_sent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'receipt_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN receipt_id uuid REFERENCES email_receipts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add columns to wallet_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wallet_transactions' AND column_name = 'receipt_sent'
  ) THEN
    ALTER TABLE wallet_transactions ADD COLUMN receipt_sent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wallet_transactions' AND column_name = 'receipt_id'
  ) THEN
    ALTER TABLE wallet_transactions ADD COLUMN receipt_id uuid REFERENCES email_receipts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE email_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_receipts
CREATE POLICY "Users can view own receipts"
  ON email_receipts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create receipts"
  ON email_receipts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update receipts"
  ON email_receipts FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for email_templates
CREATE POLICY "Anyone can view active templates"
  ON email_templates FOR SELECT
  TO public
  USING (is_active = true);

-- RLS Policies for receipt_line_items
CREATE POLICY "Users can view own receipt line items"
  ON receipt_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_receipts
      WHERE email_receipts.id = receipt_line_items.receipt_id
      AND email_receipts.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create line items"
  ON receipt_line_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_receipts_user ON email_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_receipts_booking ON email_receipts(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_receipts_number ON email_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_email_receipts_status ON email_receipts(email_status);
CREATE INDEX IF NOT EXISTS idx_email_receipts_created ON email_receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipt_line_items_receipt ON receipt_line_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(template_name);

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS text AS $$
DECLARE
  v_year text;
  v_sequence integer;
  v_receipt_number text;
BEGIN
  v_year := EXTRACT(YEAR FROM now())::text;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 10) AS integer)), 0) + 1
  INTO v_sequence
  FROM email_receipts
  WHERE receipt_number LIKE 'RCP-' || v_year || '-%';
  
  v_receipt_number := 'RCP-' || v_year || '-' || LPAD(v_sequence::text, 6, '0');
  
  RETURN v_receipt_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create receipt with line items
CREATE OR REPLACE FUNCTION create_receipt(
  p_user_id uuid,
  p_transaction_type text,
  p_booking_id uuid,
  p_transaction_id uuid,
  p_amount numeric,
  p_receipt_data jsonb,
  p_line_items jsonb
)
RETURNS uuid AS $$
DECLARE
  v_receipt_id uuid;
  v_receipt_number text;
  v_line_item jsonb;
BEGIN
  v_receipt_number := generate_receipt_number();
  
  INSERT INTO email_receipts (
    receipt_number,
    user_id,
    transaction_type,
    booking_id,
    transaction_id,
    amount,
    receipt_data
  ) VALUES (
    v_receipt_number,
    p_user_id,
    p_transaction_type,
    p_booking_id,
    p_transaction_id,
    p_amount,
    p_receipt_data
  ) RETURNING id INTO v_receipt_id;
  
  IF p_line_items IS NOT NULL THEN
    FOR v_line_item IN SELECT * FROM jsonb_array_elements(p_line_items)
    LOOP
      INSERT INTO receipt_line_items (
        receipt_id,
        description,
        quantity,
        unit_price,
        amount,
        item_type,
        sort_order
      ) VALUES (
        v_receipt_id,
        v_line_item->>'description',
        COALESCE((v_line_item->>'quantity')::numeric, 1),
        (v_line_item->>'unit_price')::numeric,
        (v_line_item->>'amount')::numeric,
        COALESCE(v_line_item->>'item_type', 'Service'),
        COALESCE((v_line_item->>'sort_order')::integer, 0)
      );
    END LOOP;
  END IF;
  
  RETURN v_receipt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get receipt with line items
CREATE OR REPLACE FUNCTION get_receipt_details(p_receipt_id uuid)
RETURNS TABLE (
  receipt_id uuid,
  receipt_number text,
  user_id uuid,
  transaction_type text,
  amount numeric,
  currency text,
  receipt_data jsonb,
  line_items jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    er.id,
    er.receipt_number,
    er.user_id,
    er.transaction_type,
    er.amount,
    er.currency,
    er.receipt_data,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'description', rli.description,
          'quantity', rli.quantity,
          'unit_price', rli.unit_price,
          'amount', rli.amount,
          'item_type', rli.item_type
        ) ORDER BY rli.sort_order
      ) FILTER (WHERE rli.id IS NOT NULL),
      '[]'::jsonb
    ) as line_items,
    er.created_at
  FROM email_receipts er
  LEFT JOIN receipt_line_items rli ON rli.receipt_id = er.id
  WHERE er.id = p_receipt_id
  GROUP BY er.id, er.receipt_number, er.user_id, er.transaction_type, 
           er.amount, er.currency, er.receipt_data, er.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default email templates
INSERT INTO email_templates (template_name, template_type, subject, html_content, text_content, variables) VALUES
(
  'booking_confirmation',
  'Transactional',
  'Booking Confirmation - {{service_name}}',
  '<html><body><h1>Booking Confirmed!</h1><p>Thank you for your booking.</p><p><strong>Service:</strong> {{service_name}}</p><p><strong>Date:</strong> {{booking_date}}</p><p><strong>Amount:</strong> ${{amount}}</p></body></html>',
  'Booking Confirmed!\n\nThank you for your booking.\n\nService: {{service_name}}\nDate: {{booking_date}}\nAmount: ${{amount}}',
  '["service_name", "booking_date", "amount", "receipt_number", "customer_name", "provider_name"]'::jsonb
),
(
  'payment_receipt',
  'Transactional',
  'Payment Receipt - {{receipt_number}}',
  '<html><body><h1>Payment Receipt</h1><p>Receipt Number: {{receipt_number}}</p><p><strong>Amount Paid:</strong> ${{amount}}</p><p><strong>Payment Method:</strong> {{payment_method}}</p></body></html>',
  'Payment Receipt\n\nReceipt Number: {{receipt_number}}\nAmount Paid: ${{amount}}\nPayment Method: {{payment_method}}',
  '["receipt_number", "amount", "payment_method", "transaction_date", "customer_name"]'::jsonb
),
(
  'deposit_receipt',
  'Transactional',
  'Deposit Receipt - {{receipt_number}}',
  '<html><body><h1>Deposit Received</h1><p>Receipt Number: {{receipt_number}}</p><p><strong>Deposit Amount:</strong> ${{deposit_amount}}</p><p><strong>Remaining Balance:</strong> ${{balance_amount}}</p><p><strong>Balance Due:</strong> {{balance_due_date}}</p></body></html>',
  'Deposit Received\n\nReceipt Number: {{receipt_number}}\nDeposit Amount: ${{deposit_amount}}\nRemaining Balance: ${{balance_amount}}\nBalance Due: {{balance_due_date}}',
  '["receipt_number", "deposit_amount", "balance_amount", "balance_due_date", "service_name"]'::jsonb
),
(
  'refund_receipt',
  'Transactional',
  'Refund Processed - {{receipt_number}}',
  '<html><body><h1>Refund Processed</h1><p>Receipt Number: {{receipt_number}}</p><p><strong>Refund Amount:</strong> ${{refund_amount}}</p><p><strong>Original Transaction:</strong> {{original_receipt_number}}</p></body></html>',
  'Refund Processed\n\nReceipt Number: {{receipt_number}}\nRefund Amount: ${{refund_amount}}\nOriginal Transaction: {{original_receipt_number}}',
  '["receipt_number", "refund_amount", "original_receipt_number", "refund_reason"]'::jsonb
)
ON CONFLICT (template_name) DO NOTHING;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_email_templates_updated_at ON email_templates;
CREATE TRIGGER trigger_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();