/*
  # Expense Categorization System

  1. New Tables
    - expense_categories - Predefined expense categories
    - expense_tags - Custom tags for expenses
    - expense_category_mappings - Service to expense category mapping
    - expense_categorization_rules - Auto-categorization rules

  2. Features
    - Predefined expense categories (business, personal, etc.)
    - Custom tagging system
    - Automatic categorization based on service type
    - Manual categorization override
    - Tax-deductible category tracking
    - Category hierarchy (parent/child)

  3. Security
    - Users can only manage own expense categorizations
    - Admin access to manage category rules
*/

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  parent_category_id uuid REFERENCES expense_categories(id) ON DELETE SET NULL,
  is_tax_deductible boolean DEFAULT false,
  icon text,
  color text,
  is_system boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create expense_tags table
CREATE TABLE IF NOT EXISTS expense_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#8E8E93',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create expense_category_mappings table
CREATE TABLE IF NOT EXISTS expense_category_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  expense_category_id uuid NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
  is_default boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(service_category_id, expense_category_id)
);

-- Create expense_categorization_rules table
CREATE TABLE IF NOT EXISTS expense_categorization_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  condition_type text NOT NULL CHECK (condition_type IN (
    'service_category', 'provider_name', 'amount_range', 'keyword'
  )),
  condition_value text NOT NULL,
  expense_category_id uuid NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create booking_expense_categorizations table
CREATE TABLE IF NOT EXISTS booking_expense_categorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  expense_category_id uuid REFERENCES expense_categories(id) ON DELETE SET NULL,
  is_manual boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(booking_id)
);

-- Create booking_expense_tags table
CREATE TABLE IF NOT EXISTS booking_expense_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES expense_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(booking_id, tag_id)
);

-- Create indexes
CREATE INDEX idx_expense_categories_parent ON expense_categories(parent_category_id);
CREATE INDEX idx_expense_tags_user ON expense_tags(user_id);
CREATE INDEX idx_expense_mappings_service ON expense_category_mappings(service_category_id);
CREATE INDEX idx_categorization_rules_user ON expense_categorization_rules(user_id, is_active);
CREATE INDEX idx_booking_categorizations_booking ON booking_expense_categorizations(booking_id);
CREATE INDEX idx_booking_categorizations_category ON booking_expense_categorizations(expense_category_id);
CREATE INDEX idx_booking_tags_booking ON booking_expense_tags(booking_id);
CREATE INDEX idx_booking_tags_tag ON booking_expense_tags(tag_id);

-- Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_category_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categorization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_expense_categorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_expense_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_categories (public read, admin write)
CREATE POLICY "Anyone can view expense categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage expense categories"
  ON expense_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for expense_tags
CREATE POLICY "Users can view own tags"
  ON expense_tags FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own tags"
  ON expense_tags FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tags"
  ON expense_tags FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tags"
  ON expense_tags FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for expense_category_mappings
CREATE POLICY "Anyone can view expense category mappings"
  ON expense_category_mappings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage expense category mappings"
  ON expense_category_mappings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for expense_categorization_rules
CREATE POLICY "Users can view own categorization rules"
  ON expense_categorization_rules FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can create own categorization rules"
  ON expense_categorization_rules FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own categorization rules"
  ON expense_categorization_rules FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own categorization rules"
  ON expense_categorization_rules FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for booking_expense_categorizations
CREATE POLICY "Users can view own booking categorizations"
  ON booking_expense_categorizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_expense_categorizations.booking_id
        AND customer_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own booking categorizations"
  ON booking_expense_categorizations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_expense_categorizations.booking_id
        AND customer_id = auth.uid()
    )
  );

-- RLS Policies for booking_expense_tags
CREATE POLICY "Users can view own booking tags"
  ON booking_expense_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_expense_tags.booking_id
        AND customer_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own booking tags"
  ON booking_expense_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_expense_tags.booking_id
        AND customer_id = auth.uid()
    )
  );

-- Insert default expense categories
INSERT INTO expense_categories (name, description, is_tax_deductible, icon, color, is_system, sort_order) VALUES
('Business', 'Business-related expenses', true, 'briefcase', '#007AFF', true, 1),
('Personal', 'Personal expenses', false, 'user', '#8E8E93', true, 2),
('Home Services', 'Home maintenance and services', false, 'home', '#34C759', true, 3),
('Professional Services', 'Professional and consulting services', true, 'file-text', '#FF9500', true, 4),
('Events', 'Event-related expenses', false, 'calendar', '#5856D6', true, 5),
('Health & Wellness', 'Health and wellness services', true, 'heart', '#FF2D55', true, 6),
('Education', 'Educational services', true, 'book', '#00C7BE', true, 7),
('Transportation', 'Transportation and travel', true, 'car', '#FFD60A', true, 8),
('Entertainment', 'Entertainment and leisure', false, 'music', '#BF5AF2', true, 9),
('Other', 'Uncategorized expenses', false, 'more-horizontal', '#8E8E93', true, 10)
ON CONFLICT (name) DO NOTHING;

-- Insert subcategories
INSERT INTO expense_categories (name, description, parent_category_id, is_tax_deductible, is_system)
SELECT 'Office Supplies', 'Office supplies and equipment', id, true, true
FROM expense_categories WHERE name = 'Business'
ON CONFLICT (name) DO NOTHING;

INSERT INTO expense_categories (name, description, parent_category_id, is_tax_deductible, is_system)
SELECT 'Marketing', 'Marketing and advertising expenses', id, true, true
FROM expense_categories WHERE name = 'Business'
ON CONFLICT (name) DO NOTHING;

INSERT INTO expense_categories (name, description, parent_category_id, is_tax_deductible, is_system)
SELECT 'Consulting', 'Consulting and advisory services', id, true, true
FROM expense_categories WHERE name = 'Professional Services'
ON CONFLICT (name) DO NOTHING;

-- Function to auto-categorize booking
CREATE OR REPLACE FUNCTION auto_categorize_booking(p_booking_id uuid)
RETURNS uuid AS $$
DECLARE
  v_service_category_id uuid;
  v_expense_category_id uuid;
  v_categorization_id uuid;
BEGIN
  -- Get service category for the booking
  SELECT sl.category_id INTO v_service_category_id
  FROM bookings b
  JOIN service_listings sl ON sl.id = b.listing_id
  WHERE b.id = p_booking_id;

  -- Find mapped expense category
  SELECT expense_category_id INTO v_expense_category_id
  FROM expense_category_mappings
  WHERE service_category_id = v_service_category_id
    AND is_default = true
  LIMIT 1;

  -- If no mapping found, use "Other" category
  IF v_expense_category_id IS NULL THEN
    SELECT id INTO v_expense_category_id
    FROM expense_categories
    WHERE name = 'Other'
    LIMIT 1;
  END IF;

  -- Insert or update categorization
  INSERT INTO booking_expense_categorizations (
    booking_id, expense_category_id, is_manual
  ) VALUES (
    p_booking_id, v_expense_category_id, false
  )
  ON CONFLICT (booking_id) DO UPDATE SET
    expense_category_id = EXCLUDED.expense_category_id,
    updated_at = NOW()
  WHERE booking_expense_categorizations.is_manual = false
  RETURNING id INTO v_categorization_id;

  RETURN v_categorization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually categorize booking
CREATE OR REPLACE FUNCTION categorize_booking(
  p_booking_id uuid,
  p_expense_category_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_categorization_id uuid;
BEGIN
  INSERT INTO booking_expense_categorizations (
    booking_id, expense_category_id, is_manual, notes
  ) VALUES (
    p_booking_id, p_expense_category_id, true, p_notes
  )
  ON CONFLICT (booking_id) DO UPDATE SET
    expense_category_id = EXCLUDED.expense_category_id,
    is_manual = true,
    notes = EXCLUDED.notes,
    updated_at = NOW()
  RETURNING id INTO v_categorization_id;

  RETURN v_categorization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add tag to booking
CREATE OR REPLACE FUNCTION add_booking_tag(
  p_booking_id uuid,
  p_tag_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_tag_record_id uuid;
BEGIN
  INSERT INTO booking_expense_tags (booking_id, tag_id)
  VALUES (p_booking_id, p_tag_id)
  ON CONFLICT (booking_id, tag_id) DO NOTHING
  RETURNING id INTO v_tag_record_id;

  RETURN v_tag_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove tag from booking
CREATE OR REPLACE FUNCTION remove_booking_tag(
  p_booking_id uuid,
  p_tag_id uuid
)
RETURNS boolean AS $$
BEGIN
  DELETE FROM booking_expense_tags
  WHERE booking_id = p_booking_id AND tag_id = p_tag_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get expense breakdown by category
CREATE OR REPLACE FUNCTION get_expense_breakdown_by_category(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  category_name text,
  category_color text,
  total_amount numeric,
  booking_count bigint,
  is_tax_deductible boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.name as category_name,
    ec.color as category_color,
    COALESCE(SUM(b.total_price), 0)::numeric as total_amount,
    COUNT(b.id)::bigint as booking_count,
    ec.is_tax_deductible
  FROM expense_categories ec
  LEFT JOIN booking_expense_categorizations bec ON bec.expense_category_id = ec.id
  LEFT JOIN bookings b ON b.id = bec.booking_id
    AND b.customer_id = p_user_id
    AND b.created_at::date BETWEEN p_start_date AND p_end_date
    AND b.status IN ('Confirmed', 'Completed')
  GROUP BY ec.id, ec.name, ec.color, ec.is_tax_deductible
  HAVING COUNT(b.id) > 0
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get bookings by tag
CREATE OR REPLACE FUNCTION get_bookings_by_tag(
  p_user_id uuid,
  p_tag_id uuid
)
RETURNS TABLE (
  booking_id uuid,
  total_price numeric,
  booking_date timestamptz,
  provider_name text,
  service_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id as booking_id,
    b.total_price,
    b.booking_date,
    p.full_name as provider_name,
    sl.title as service_name
  FROM booking_expense_tags bet
  JOIN bookings b ON b.id = bet.booking_id
  JOIN profiles p ON p.id = b.provider_id
  JOIN service_listings sl ON sl.id = b.listing_id
  WHERE bet.tag_id = p_tag_id
    AND b.customer_id = p_user_id
  ORDER BY b.booking_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-categorize new bookings
CREATE OR REPLACE FUNCTION trigger_auto_categorize_booking()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM auto_categorize_booking(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_categorize_booking_trigger
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_categorize_booking();

COMMENT ON TABLE expense_categories IS 'Predefined and custom expense categories';
COMMENT ON TABLE expense_tags IS 'User-defined tags for expense tracking';
COMMENT ON TABLE expense_category_mappings IS 'Mapping between service and expense categories';
COMMENT ON TABLE expense_categorization_rules IS 'Rules for automatic expense categorization';
COMMENT ON TABLE booking_expense_categorizations IS 'Expense category assignments for bookings';
COMMENT ON TABLE booking_expense_tags IS 'Tag assignments for bookings';

COMMENT ON FUNCTION auto_categorize_booking IS 'Automatically categorize a booking based on service type';
COMMENT ON FUNCTION categorize_booking IS 'Manually categorize a booking';
COMMENT ON FUNCTION add_booking_tag IS 'Add a tag to a booking';
COMMENT ON FUNCTION remove_booking_tag IS 'Remove a tag from a booking';
COMMENT ON FUNCTION get_expense_breakdown_by_category IS 'Get expense breakdown by category for a period';
COMMENT ON FUNCTION get_bookings_by_tag IS 'Get all bookings with a specific tag';
